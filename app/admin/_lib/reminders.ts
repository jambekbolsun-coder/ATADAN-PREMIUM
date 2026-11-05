/**
 * Ежедневные напоминания (Vercel Cron → /api/cron/daily, каждый день в 08:00 по Бишкеку).
 * Запуск идемпотентный: за один день задача выполняется один раз (cron_runs), повторный вызов ничего не шлёт.
 *
 *  - резерв машины заканчивается через 1-3 дня → менеджеру продажи;
 *  - резерв закончился, машина не выдана → менеджеру и руководству;
 *  - просрочка платежа на 1, 3, 7, 14, 30-й день и дальше каждые 30 дней → менеджеру;
 *    сводка «сколько просрочено» → бухгалтеру и руководству;
 *  - поставка не пришла к ожидаемой дате (на следующий день) → логистике;
 *  - срок по обращению в сервис прошёл → ответственному.
 */
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { notify, query } from "./db-kit";
import { listDebts } from "./money";

const SYSTEM = { id: "system", role: "owner", permissions: [] } as unknown as Actor;
const money = (minor: number, cur: string) => `${Math.round(minor / 100).toLocaleString("ru-RU")} ${cur === "USD" ? "$" : "с"}`;

export async function runDaily(today = new Date().toISOString().slice(0, 10)) {
  const db = getRawDb();
  const debts = await listDebts(SYSTEM);
  return db.transaction(async (client) => {
    const q = query(client);
    const started = await q("INSERT INTO cron_runs(job, ran_on) VALUES('daily', ?::date) ON CONFLICT DO NOTHING RETURNING job", today);
    if (!started.length) return { skipped: true, today };
    let sent = 0;
    const send = async (n: Parameters<typeof notify>[1]) => { await notify(q, n); sent++; };

    // резерв
    const reserves = await q<{ id: string; number: string; manager_id: string | null; reserve_until: string; left: number; customer: string }>(`
      SELECT o.id, o.number, o.manager_id, o.reserve_until::text AS reserve_until, (o.reserve_until - ?::date)::int AS left, c.name AS customer
      FROM sale_orders o JOIN crm_customers c ON c.id=o.customer_id
      WHERE o.status='booked' AND o.reserve_until IS NOT NULL AND o.reserve_until <= ?::date + 3`, today, today);
    for (const r of reserves) {
      if (r.left >= 1) {
        if (r.manager_id) await send({ topic: "reserve", title: `Резерв по ${r.number} заканчивается через ${r.left} дн.`, body: `${r.customer}. Продлите резерв или поторопите оплату`, url: `/admin/work/sales/${r.id}`, to: [r.manager_id], entity: { type: "sale", id: r.id } });
      } else if (r.left === 0 || r.left === -1) {
        await send({ topic: "reserve", priority: "high", title: `Резерв по ${r.number} ${r.left === 0 ? "заканчивается сегодня" : "закончился"}`, body: `${r.customer}. Машина не выдана: продлите резерв или отмените продажу`, url: `/admin/work/sales/${r.id}`, roles: ["owner", "director"], entity: { type: "sale", id: r.id } });
        if (r.manager_id) await send({ topic: "reserve", priority: "high", title: `Резерв по ${r.number} ${r.left === 0 ? "заканчивается сегодня" : "закончился"}`, body: r.customer, url: `/admin/work/sales/${r.id}`, to: [r.manager_id], entity: { type: "sale", id: r.id } });
      }
    }

    // просрочки
    const overdue = debts.filter((d) => d.overdue_minor > 0);
    for (const d of overdue) {
      const day = d.days_overdue;
      if (![1, 3, 7, 14, 30].includes(day) && !(day > 30 && day % 30 === 0)) continue;
      const [m] = await q<{ manager_id: string | null }>("SELECT manager_id FROM sale_orders WHERE id=?", d.id);
      if (m?.manager_id) await send({ topic: "payments", priority: day >= 7 ? "high" : "normal", title: `Просрочка ${day} дн.: ${d.customer}`, body: `${d.number}: просрочено ${money(d.overdue_minor, d.currency)}. Позвоните клиенту`, url: `/admin/work/sales/${d.id}`, to: [m.manager_id], entity: { type: "sale", id: d.id } });
    }
    if (overdue.length) {
      const total = overdue.reduce((s, d) => s + (d.currency === "USD" ? Math.round(d.overdue_minor * (d.fx_rate || 0)) : d.overdue_minor), 0);
      await send({ topic: "payments", title: `Просрочено ${money(total, "KGS")} у ${overdue.length} клиентов`, body: `Самая долгая просрочка: ${Math.max(...overdue.map((d) => d.days_overdue))} дн.`, url: "/admin/work/debts", roles: ["owner", "director", "accountant"], perms: ["debts"] });
    }

    // поставки, которые не пришли к ожидаемой дате (вчера)
    const late = await q<{ id: string; tracking_number: string; eta: string }>("SELECT id, tracking_number, eta::text AS eta FROM shipments_v2 WHERE archived=0 AND status NOT IN ('received','cancelled') AND eta = ?::date - 1", today);
    for (const s of late) await send({ topic: "logistics", priority: "high", title: `Поставка ${s.tracking_number} опаздывает`, body: `Ожидалась ${s.eta}. Уточните у перевозчика и поставьте новую дату`, url: `/admin/work/logistics/shipments/${s.id}`, roles: ["owner", "director", "accountant"], perms: ["shipments"], entity: { type: "shipment", id: s.id } });

    // сервис: срок прошёл
    const svc = await q<{ id: string; number: string; assigned_to: string | null }>("SELECT id, number, assigned_to FROM service_tickets WHERE status NOT IN ('done','closed','rejected') AND due_at = ?::date - 1", today);
    for (const t of svc) await send({ topic: "service", priority: "high", title: `Срок по обращению ${t.number} прошёл`, url: `/admin/work/service/${t.id}`, ...(t.assigned_to ? { to: [t.assigned_to] } : { roles: ["owner", "director"] }), entity: { type: "service", id: t.id } });

    await q("UPDATE cron_runs SET detail=? WHERE job='daily' AND ran_on=?::date", `резервов ${reserves.length}, просрочек ${overdue.length}, поставок ${late.length}, сервис ${svc.length}`, today);
    return { skipped: false, today, reserves: reserves.length, overdue: overdue.length, late: late.length, service: svc.length, sent };
  });
}
