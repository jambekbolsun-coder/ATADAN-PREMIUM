/**
 * Данные для Главной. Всё считается из записей (продажи, платежи, склад), руками ничего не вводится.
 * Источник продаж - отдел продаж (sale_orders); старые продажи перенесены туда миграцией.
 * Суммы в тыйынах (minor units), в сомах: долларовые продажи пересчитаны по курсу продажи.
 */
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { seesCost } from "./session";

type N = { n: number | null };

export type AttentionItem = { key: string; title: string; hint: string; href: string; icon: "inbox" | "scale" | "truck" | "tractor" | "wallet" | "bell" | "cart"; tone: "terra" | "lilac" | "sky" | "teal" | "sun" | "green" };

export type Dashboard = {
  scope: "company" | "mine";
  revenue: { month: number; prev: number; count: number };
  margin: { month: number; known: boolean } | null;
  stock: { count: number; value: number | null; transit: number };
  debts: { total: number; overdue: number };
  months: { key: string; date: Date; total: number }[];
  methods: { key: string; total: number }[];
  sources: { source: string; leads: number }[];
  recent: { id: string; number: string; sold_at: string; customer: string; items: string; amount: number; currency: "USD" | "KGS"; status: string; paid: number }[];
  attention: AttentionItem[];
  cash: { accounts: { id: string; name: string; currency: string; balance: number }[] } | null;
};

const SOURCE_LABEL: Record<string, string> = {
  website: "Сайт", site: "Сайт", whatsapp: "WhatsApp", instagram: "Instagram", phone: "Звонок", call: "Звонок", office: "Визит в офис",
  exhibition: "Выставка", referral: "Рекомендация", lalafo: "Lalafo", leasing: "Калькулятор лизинга", "leasing-calculator": "Калькулятор лизинга",
  advertising: "Реклама", organic: "Поиск", chatbot: "Чат-бот", other: "Другое",
};
export function sourceLabel(source: string) {
  return SOURCE_LABEL[source] ?? (source || "Другое");
}

/** Сумма продажи в сомах. */
const KGS = "(CASE WHEN o.currency='USD' THEN o.total_minor*o.fx_rate ELSE o.total_minor END)";
/** Оплачено по продаже в валюте продажи (приход минус возвраты, без сторно). */
const PAID = "COALESCE((SELECT SUM(CASE WHEN p.direction='in' THEN p.amount_sale_minor ELSE -p.amount_sale_minor END) FROM sale_payments p WHERE p.sale_id=o.id AND p.status='posted'),0)";
/** Сколько по графику уже должно было прийти к сегодняшнему дню. */
const DUE = "COALESCE((SELECT SUM(s.amount_minor) FROM sale_schedule s WHERE s.sale_id=o.id AND s.due_date < CURRENT_DATE),0)";

export async function loadDashboard(actor: Actor): Promise<Dashboard> {
  const db = getRawDb();
  const company = actor.role === "owner" || actor.role === "director" || actor.role === "accountant";
  // Менеджер видит только свои продажи и долги.
  const own = company ? "" : "AND o.manager_id=?";
  const ownArgs = company ? [] : [actor.id];
  const rate = "CASE WHEN o.currency='USD' THEN o.fx_rate ELSE 1 END";

  const [rev, prev, margin, stock, transit, debts, months, methods, recent, sources, newLeads, overdueSales, lateShipments, oldStock, expiring, accounts] = await Promise.all([
    db.prepare(`SELECT COALESCE(SUM(${KGS}),0)::bigint AS total, COUNT(*)::int AS n FROM sale_orders o WHERE o.status<>'cancelled' AND o.sold_at >= date_trunc('month', CURRENT_TIMESTAMP) ${own}`).bind(...ownArgs).first<{ total: number; n: number }>(),
    db.prepare(`SELECT COALESCE(SUM(${KGS}),0)::bigint AS n FROM sale_orders o WHERE o.status<>'cancelled' AND o.sold_at >= date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '1 month' AND o.sold_at < date_trunc('month', CURRENT_TIMESTAMP) ${own}`).bind(...ownArgs).first<N>(),
    seesCost(actor)
      ? db.prepare(`SELECT COALESCE(SUM(${KGS} - o.cost_kgs_minor),0)::bigint AS margin, COUNT(*) FILTER (WHERE o.cost_kgs_minor=0)::int AS unknown FROM sale_orders o WHERE o.status<>'cancelled' AND o.sold_at >= date_trunc('month', CURRENT_TIMESTAMP)`).first<{ margin: number; unknown: number }>()
      : Promise.resolve(null),
    db.prepare(`SELECT COUNT(*)::int AS n, COALESCE(SUM(CASE WHEN landed_cost_minor>0 THEN landed_cost_minor ELSE purchase_cost_minor END),0)::bigint AS value FROM inventory_units_v2 WHERE archived=0 AND status IN ('stock','reserved')`).first<{ n: number; value: number }>(),
    db.prepare(`SELECT COUNT(*)::int AS n FROM inventory_units_v2 WHERE archived=0 AND status IN ('ordered','production','transit','customs')`).first<N>(),
    db.prepare(`SELECT COALESCE(SUM(GREATEST(o.total_minor - ${PAID},0) * ${rate}),0)::bigint AS total,
        COALESCE(SUM(LEAST(GREATEST(o.total_minor - ${PAID},0), GREATEST(${DUE} - ${PAID},0)) * ${rate}),0)::bigint AS overdue
      FROM sale_orders o WHERE o.status IN ('booked','delivered') ${own}`).bind(...ownArgs).first<{ total: number; overdue: number }>(),
    db.prepare(`SELECT to_char(m, 'YYYY-MM') AS key, COALESCE(SUM(${KGS}),0)::bigint AS total
      FROM generate_series(date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '5 months', date_trunc('month', CURRENT_TIMESTAMP), INTERVAL '1 month') m
      LEFT JOIN sale_orders o ON o.status<>'cancelled' AND date_trunc('month', o.sold_at)=m ${own}
      GROUP BY m ORDER BY m`).bind(...ownArgs).all<{ key: string; total: number }>(),
    db.prepare(`SELECT o.payment_method AS key, COALESCE(SUM(${KGS}),0)::bigint AS total FROM sale_orders o WHERE o.status<>'cancelled' AND o.sold_at >= CURRENT_TIMESTAMP - INTERVAL '90 days' ${own} GROUP BY o.payment_method ORDER BY total DESC`).bind(...ownArgs).all<{ key: string; total: number }>(),
    db.prepare(`SELECT o.id, o.number, o.sold_at, c.name AS customer, o.total_minor AS amount, o.currency, o.status, ${PAID}::bigint AS paid,
        COALESCE((SELECT string_agg(i.title, ', ') FROM sale_order_items i WHERE i.sale_id=o.id AND i.active=1),'') AS items
      FROM sale_orders o JOIN crm_customers c ON c.id=o.customer_id WHERE o.status<>'cancelled' ${own} ORDER BY o.sold_at DESC LIMIT 5`).bind(...ownArgs).all<Dashboard["recent"][number]>(),
    db.prepare(`SELECT source, COUNT(*)::int AS leads FROM leads WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days' GROUP BY source ORDER BY leads DESC LIMIT 6`).all<{ source: string; leads: number }>(),
    db.prepare(`SELECT COUNT(*)::int AS n FROM leads WHERE status='new' AND created_at < CURRENT_TIMESTAMP - INTERVAL '15 minutes'`).first<N>(),
    db.prepare(`SELECT COUNT(*)::int AS n FROM sale_orders o WHERE o.status IN ('booked','delivered') AND ${DUE} > ${PAID} ${own}`).bind(...ownArgs).first<N>(),
    db.prepare(`SELECT COUNT(*)::int AS n FROM shipments_v2 WHERE archived=0 AND arrived_at IS NULL AND eta IS NOT NULL AND eta < CURRENT_DATE AND status NOT IN ('arrived','received','cancelled','delivered')`).first<N>(),
    db.prepare(`SELECT COUNT(*)::int AS n FROM inventory_units_v2 WHERE archived=0 AND status='stock' AND created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'`).first<N>(),
    db.prepare(`SELECT COUNT(*)::int AS n FROM sale_orders o WHERE o.status='booked' AND o.reserve_until IS NOT NULL AND o.reserve_until <= CURRENT_DATE + 2 ${own}`).bind(...ownArgs).first<N>(),
    company
      ? db.prepare(`SELECT a.id, a.name, a.currency, (a.opening_balance_minor + COALESCE(SUM(CASE WHEN t.direction='in' THEN t.amount_minor ELSE -t.amount_minor END),0))::bigint AS balance
          FROM financial_accounts a LEFT JOIN account_transactions t ON t.account_id=a.id
          WHERE a.active=1 AND a.account_type IN ('cash','bank') GROUP BY a.id ORDER BY a.account_type, a.name`).all<{ id: string; name: string; currency: string; balance: number }>()
      : Promise.resolve(null),
  ]);

  const attention: AttentionItem[] = [];
  const plural = (n: number, one: string, few: string, many: string) => { const a = n % 100, b = n % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many; };
  const nNew = newLeads?.n ?? 0;
  if (nNew) attention.push({ key: "leads", title: `${nNew} ${plural(nNew, "заявка", "заявки", "заявок")} без ответа`, hint: "дольше 15 минут", href: "/admin/work/leads", icon: "inbox", tone: "terra" });
  const nOver = overdueSales?.n ?? 0;
  if (nOver) attention.push({ key: "debts", title: `Просрочены платежи: ${nOver} ${plural(nOver, "продажа", "продажи", "продаж")}`, hint: "срок по графику прошёл, денег нет", href: "/admin/work/sales?view=debt", icon: "scale", tone: "lilac" });
  const nExp = expiring?.n ?? 0;
  if (nExp) attention.push({ key: "reserve", title: `Резерв истекает: ${nExp}`, hint: "через 2 дня или уже истёк: продлите или отмените", href: "/admin/work/sales?view=unpaid", icon: "cart", tone: "sun" });
  const nLate = lateShipments?.n ?? 0;
  if (nLate && company) attention.push({ key: "ship", title: `Поставки опаздывают: ${nLate}`, hint: "срок прибытия прошёл", href: "/admin/work/logistics", icon: "truck", tone: "sky" });
  const nOld = oldStock?.n ?? 0;
  if (nOld && company) attention.push({ key: "stock", title: `Машины на складе больше 90 дней: ${nOld}`, hint: "стоит подумать о цене или акции", href: "/admin/work/stock", icon: "tractor", tone: "teal" });

  return {
    scope: company ? "company" : "mine",
    revenue: { month: Number(rev?.total ?? 0), prev: Number(prev?.n ?? 0), count: Number(rev?.n ?? 0) },
    margin: margin ? { month: Number(margin.margin), known: Number(margin.unknown) === 0 } : null,
    stock: { count: Number(stock?.n ?? 0), value: seesCost(actor) ? Number(stock?.value ?? 0) : null, transit: Number(transit?.n ?? 0) },
    debts: { total: Number(debts?.total ?? 0), overdue: Number(debts?.overdue ?? 0) },
    months: months.results.map((m) => ({ key: m.key, date: new Date(`${m.key}-01T00:00:00`), total: Number(m.total) })),
    methods: methods.results.map((m) => ({ key: m.key, total: Number(m.total) })),
    sources: sources.results.map((s) => ({ source: s.source, leads: Number(s.leads) })),
    recent: recent.results.map((r) => ({ ...r, amount: Number(r.amount), paid: Number(r.paid) })),
    attention,
    cash: accounts ? { accounts: accounts.results.map((a) => ({ ...a, balance: Number(a.balance) })) } : null,
  };
}
