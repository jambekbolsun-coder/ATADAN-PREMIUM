/**
 * Выгрузка из новой админки (Настройки → Экспорт и импорт).
 * GET ?type=… → CSV для Excel. Каждая выгрузка пишется в журнал.
 *  - доступ как к разделу; менеджер выгружает только своё;
 *  - себестоимость и маржа только у владельца, директора и бухгалтера;
 *  - type=backup: полная копия всех данных в JSON, только владелец; без паролей, сессий и токенов.
 */
import { strToU8, zipSync } from "fflate";
import { getRawDb } from "../../../../db";
import { canUseSection, requireActor, type Actor } from "../../../lib/admin-auth";
import { fail, HttpError } from "../../../lib/security";
import { toCsv } from "../../../admin/_lib/sheet";
import { listModels } from "../../../admin/_lib/catalog-admin";
import { listDebts } from "../../../admin/_lib/money";
import { METHOD } from "../../../admin/_lib/sales";
import { UNIT_STATUS } from "../../../admin/_lib/stock";
import { MODEL_STATUS } from "../../../admin/_lib/catalog-admin";

const SALE_STATUS: Record<string, string> = { booked: "Оформлена", delivered: "Выдана", closed: "Закрыта", cancelled: "Отменена" };
const label = (map: Record<string, { label: string } | string>, k: unknown) => { const v = map[String(k)]; return typeof v === "string" ? v : v?.label ?? String(k ?? ""); };

type Dataset = { label: string; can: (a: Actor) => boolean; columns: [string, string][]; rows: (a: Actor) => Promise<Record<string, unknown>[]> };
const FIN = (a: Actor) => a.role === "owner" || a.role === "director" || a.role === "accountant";
const sql = async (q: string, ...args: unknown[]) => (await getRawDb().prepare(q).bind(...args).all<Record<string, unknown>>()).results;
const own = (a: Actor) => (a.role === "manager" ? a.id : null);
// десятичная запятая: русский Excel читает «950,00» как число, а «950.00» как текст или дату
const kgs = (m: unknown) => (m == null ? "" : (Number(m) / 100).toFixed(2).replace(".", ","));

const DATASETS: Record<string, Dataset> = {
  sales: {
    label: "Продажи", can: (a) => canUseSection(a, "sales") || canUseSection(a, "deals"),
    columns: [["number", "Номер"], ["sold_at", "Дата"], ["status", "Статус"], ["customer", "Клиент"], ["phone", "Телефон"], ["items", "Что продали"], ["currency", "Валюта"], ["total", "Сумма"], ["paid", "Оплачено"], ["payment_method", "Способ оплаты"], ["bank_name", "Банк"], ["manager", "Менеджер"], ["cost_kgs", "Себестоимость, сом"]],
    rows: async (a) => (await sql(`SELECT o.number, o.sold_at::date::text AS sold_at, o.status, c.name AS customer, c.phone, o.currency, o.total_minor, o.payment_method, o.bank_name, s.display_name AS manager, o.cost_kgs_minor,
        COALESCE((SELECT string_agg(i.title || ' x' || i.qty, ', ') FROM sale_order_items i WHERE i.sale_id=o.id AND i.active=1),'') AS items,
        COALESCE((SELECT SUM(CASE WHEN p.direction='in' THEN p.amount_sale_minor ELSE -p.amount_sale_minor END) FROM sale_payments p WHERE p.sale_id=o.id AND p.status='posted'),0) AS paid_minor
      FROM sale_orders o JOIN crm_customers c ON c.id=o.customer_id LEFT JOIN staff s ON s.id=o.manager_id WHERE (?::text IS NULL OR o.manager_id=?) ORDER BY o.sold_at DESC`, own(a), own(a)))
      .map((r) => ({ ...r, status: label(SALE_STATUS, r.status), payment_method: label(METHOD, r.payment_method), total: kgs(r.total_minor), paid: kgs(r.paid_minor), cost_kgs: kgs(r.cost_kgs_minor) })),
  },
  clients: {
    label: "Клиенты", can: (a) => canUseSection(a, "client-base"),
    columns: [["name", "Имя"], ["phone", "Телефон"], ["email", "Email"], ["region", "Регион"], ["source", "Источник"], ["sales", "Покупок"], ["manager", "Ответственный"], ["created_at", "Создан"]],
    rows: async (a) => sql(`SELECT c.name, c.phone, c.email, c.region, c.source, s.display_name AS manager, c.created_at::date::text AS created_at, (SELECT COUNT(*)::int FROM sale_orders o WHERE o.customer_id=c.id AND o.status<>'cancelled') AS sales
      FROM crm_customers c LEFT JOIN staff s ON s.id=c.assigned_to WHERE c.archived=0 AND (?::text IS NULL OR c.assigned_to=? OR EXISTS (SELECT 1 FROM sale_orders o WHERE o.customer_id=c.id AND o.manager_id=?)) ORDER BY c.name`, own(a), own(a), own(a)),
  },
  units: {
    label: "Техника по VIN", can: (a) => canUseSection(a, "inventory-units"),
    columns: [["vin", "VIN"], ["model", "Модель"], ["status", "Статус"], ["location", "Где"], ["engine_number", "№ двигателя"], ["year", "Год"], ["shipment", "Поставка"], ["received_at", "Принята"], ["landed_cost", "Себестоимость, сом"]],
    rows: async () => (await sql(`SELECT u.vin, u.model, u.status, u.location, u.engine_number, u.year, sh.tracking_number AS shipment, u.received_at::date::text AS received_at, u.landed_cost_minor
      FROM inventory_units_v2 u LEFT JOIN shipments_v2 sh ON sh.id=u.shipment_id WHERE u.archived=0 ORDER BY u.model, u.vin`)).map((r) => ({ ...r, status: label(UNIT_STATUS, r.status), landed_cost: kgs(r.landed_cost_minor) })),
  },
  cash: {
    label: "Касса и платежи", can: FIN,
    columns: [["occurred_at", "Дата"], ["account", "Касса"], ["currency", "Валюта"], ["direction", "Приход/расход"], ["amount", "Сумма"], ["category", "Категория"], ["counterparty", "Контрагент"], ["description", "Комментарий"], ["author", "Внёс"]],
    rows: async () => (await sql(`SELECT t.occurred_at::date::text AS occurred_at, a.name AS account, a.currency, CASE WHEN t.direction='in' THEN 'приход' ELSE 'расход' END AS direction, t.amount_minor, t.category, t.counterparty, t.description, s.display_name AS author
      FROM account_transactions t JOIN financial_accounts a ON a.id=t.account_id LEFT JOIN staff s ON s.id=t.created_by ORDER BY t.occurred_at DESC, t.created_at DESC`)).map((r) => ({ ...r, amount: kgs(r.amount_minor) })),
  },
  debts: {
    label: "Долги", can: (a) => canUseSection(a, "debts") || FIN(a),
    columns: [["number", "Продажа"], ["customer", "Клиент"], ["phone", "Телефон"], ["currency", "Валюта"], ["left", "Осталось"], ["overdue", "Просрочено"], ["days_overdue", "Дней просрочки"], ["next_due", "Следующий платёж"], ["manager", "Менеджер"]],
    rows: async (a) => (await listDebts(a)).map((d) => ({ ...d, left: kgs(d.left_minor), overdue: kgs(d.overdue_minor) })),
  },
  parts: {
    label: "Запчасти", can: (a) => canUseSection(a, "inventory-units") || canUseSection(a, "catalog") || a.role === "manager" || FIN(a),
    columns: [["sku", "Артикул"], ["name", "Название"], ["category", "Группа"], ["unit", "Ед."], ["price", "Цена продажи"], ["cost", "Себестоимость"], ["qty", "Остаток"], ["min_qty", "Минимум"], ["location", "Место"], ["show_on_site", "На сайте"]],
    rows: async () => (await sql("SELECT * FROM parts WHERE archived=0 ORDER BY name")).map((r) => ({ ...r, price: kgs(r.price_minor), cost: kgs(r.cost_minor), show_on_site: r.show_on_site ? "да" : "нет" })),
  },
  catalog: {
    label: "Каталог техники", can: (a) => canUseSection(a, "catalog"),
    columns: [["model", "Модель"], ["slug", "Адрес"], ["hp", "Л.с."], ["category", "Класс"], ["price", "Цена, сом"], ["approximatePriceUsd", "Цена, $"], ["status", "Статус"], ["stock", "На складе"], ["transit", "В пути"], ["cost", "Себестоимость, сом"]],
    rows: async () => (await listModels()).map((m) => ({ ...m, status: label(MODEL_STATUS, m.status), cost: m.cost_minor === null ? "" : kgs(m.cost_minor) })),
  },
  audit: {
    label: "Журнал действий", can: (a) => canUseSection(a, "audit"),
    columns: [["created_at", "Когда"], ["actor", "Кто"], ["action", "Действие"], ["entity_id", "Объект"], ["detail", "Подробности"]],
    rows: async () => sql("SELECT l.created_at::text AS created_at, s.display_name AS actor, l.action, l.entity_id, l.detail FROM audit_logs l LEFT JOIN staff s ON s.id=l.actor_id ORDER BY l.created_at DESC LIMIT 20000"),
  },
};

/** В полную копию не входят пароли, сессии, токены и служебные лимиты. */
const BACKUP_EXCLUDE = new Set(["staff", "staff_sessions", "staff_invites", "password_reset_tokens", "request_limits", "lead_requests", "auth_events", "schema_migrations", "cron_runs"]);

async function audit(actor: Actor, what: string, n: number) {
  await getRawDb().prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(), actor.id, "Экспорт", what, `${n} строк`).run();
}

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    const type = new URL(request.url).searchParams.get("type") ?? "";
    const day = new Date().toISOString().slice(0, 10);
    if (type === "backup") {
      if (actor.role !== "owner") throw new HttpError(403, "Полную копию выгружает только владелец");
      const tables = (await sql("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).map((r) => String(r.table_name)).filter((t) => /^[a-z0-9_]+$/.test(t) && !BACKUP_EXCLUDE.has(t));
      const files: Record<string, Uint8Array> = {};
      let total = 0;
      for (const t of tables) {
        const rows = await sql(`SELECT * FROM ${t}`);
        files[`${t}.json`] = strToU8(JSON.stringify(rows));
        total += rows.length;
      }
      files["staff.json"] = strToU8(JSON.stringify(await sql("SELECT id, email, display_name, role, active, phone, position, permissions_json, created_at FROM staff")));
      files["_info.json"] = strToU8(JSON.stringify({ createdAt: new Date().toISOString(), by: actor.email, tables: tables.length + 1, rows: total }));
      await audit(actor, "Полная копия", total);
      return new Response(Buffer.from(zipSync(files, { level: 6 })), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename=atadan-backup-${day}.zip`, "Cache-Control": "no-store" } });
    }
    const d = DATASETS[type];
    if (!d) throw new HttpError(404, "Неизвестная выгрузка");
    if (!d.can(actor)) throw new HttpError(403, "Нет доступа к этой выгрузке");
    let columns = d.columns;
    if (!FIN(actor)) columns = columns.filter(([k]) => !/cost/i.test(k));
    const rows = await d.rows(actor);
    await audit(actor, d.label, rows.length);
    return new Response(toCsv(columns, rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename=atadan-${type}-${day}.csv`, "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
