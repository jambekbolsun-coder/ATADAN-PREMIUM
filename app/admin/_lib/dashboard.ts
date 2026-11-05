/**
 * Данные для Главной. Всё считается из записей (продажи, платежи, склад), руками ничего не вводится.
 * Деньги - в тыйынах (minor units), валюта KGS.
 */
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { seesCost } from "./session";

type N = { n: number | null };

export type AttentionItem = { key: string; title: string; hint: string; href: string; icon: "inbox" | "scale" | "truck" | "tractor" | "wallet" | "bell"; tone: "terra" | "lilac" | "sky" | "teal" | "sun" | "green" };

export type Dashboard = {
  scope: "company" | "mine";
  revenue: { month: number; prev: number; count: number };
  margin: { month: number; known: boolean } | null;
  stock: { count: number; value: number | null; transit: number };
  debts: { total: number; overdue: number; banks: number };
  months: { key: string; date: Date; total: number }[];
  methods: { key: string; label: string; total: number }[];
  sources: { source: string; leads: number }[];
  recent: { id: string; sold_at: string; customer: string; model: string; amount: number; delivered: boolean }[];
  attention: AttentionItem[];
  cash: { total: number; accounts: { id: string; name: string; currency: string; balance: number }[] } | null;
};

const SOURCE_LABEL: Record<string, string> = {
  website: "Сайт", site: "Сайт", whatsapp: "WhatsApp", instagram: "Instagram", phone: "Звонок", call: "Звонок",
  exhibition: "Выставка", referral: "Рекомендация", lalafo: "Lalafo", leasing: "Калькулятор лизинга",
};
export function sourceLabel(source: string) {
  return SOURCE_LABEL[source] ?? (source || "Другое");
}

export async function loadDashboard(actor: Actor): Promise<Dashboard> {
  const db = getRawDb();
  const company = actor.role === "owner" || actor.role === "director" || actor.role === "accountant";
  // Менеджер видит только свои продажи и долги: продажа принадлежит менеджеру сделки.
  const own = company ? "" : "AND EXISTS (SELECT 1 FROM crm_deals d WHERE d.id=s.deal_id AND d.assigned_to=?)";
  const ownArgs = company ? [] : [actor.id];
  const ownR = company ? "" : "AND EXISTS (SELECT 1 FROM crm_deals d WHERE d.id=r.deal_id AND d.assigned_to=?)";

  const [rev, prev, margin, stock, transit, debts, months, recent, sources, newLeads, overdueList, lateShipments, oldStock, accounts] = await Promise.all([
    db.prepare(`SELECT COALESCE(SUM(s.sale_amount_minor),0)::bigint AS total, COUNT(*)::int AS n FROM sales_v2 s WHERE s.archived=0 AND s.sold_at >= date_trunc('month', CURRENT_TIMESTAMP) ${own}`).bind(...ownArgs).first<{ total: number; n: number }>(),
    db.prepare(`SELECT COALESCE(SUM(s.sale_amount_minor),0)::bigint AS n FROM sales_v2 s WHERE s.archived=0 AND s.sold_at >= date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '1 month' AND s.sold_at < date_trunc('month', CURRENT_TIMESTAMP) ${own}`).bind(...ownArgs).first<N>(),
    seesCost(actor)
      ? db.prepare(`SELECT COALESCE(SUM(s.sale_amount_minor - s.cost_minor),0)::bigint AS margin, COUNT(*) FILTER (WHERE s.cost_minor=0)::int AS unknown FROM sales_v2 s WHERE s.archived=0 AND s.sold_at >= date_trunc('month', CURRENT_TIMESTAMP)`).first<{ margin: number; unknown: number }>()
      : Promise.resolve(null),
    db.prepare(`SELECT COUNT(*)::int AS n, COALESCE(SUM(CASE WHEN landed_cost_minor>0 THEN landed_cost_minor ELSE purchase_cost_minor END),0)::bigint AS value FROM inventory_units_v2 WHERE archived=0 AND status IN ('stock','reserved')`).first<{ n: number; value: number }>(),
    db.prepare(`SELECT COUNT(*)::int AS n FROM inventory_units_v2 WHERE archived=0 AND status IN ('ordered','production','transit','customs')`).first<N>(),
    db.prepare(`SELECT COALESCE(SUM(GREATEST(r.principal_minor - COALESCE(p.paid,0),0)),0)::bigint AS total,
        COALESCE(SUM(CASE WHEN r.due_at < CURRENT_TIMESTAMP THEN GREATEST(r.principal_minor - COALESCE(p.paid,0),0) ELSE 0 END),0)::bigint AS overdue
      FROM receivables_v2 r
      LEFT JOIN (SELECT deal_id, SUM(amount_minor) AS paid FROM payments_v2 WHERE status='posted' AND archived=0 GROUP BY deal_id) p ON p.deal_id=r.deal_id
      WHERE r.archived=0 AND r.status <> 'written_off' ${ownR}`).bind(...ownArgs).first<{ total: number; overdue: number }>(),
    db.prepare(`SELECT to_char(m, 'YYYY-MM') AS key, COALESCE(SUM(s.sale_amount_minor),0)::bigint AS total
      FROM generate_series(date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '5 months', date_trunc('month', CURRENT_TIMESTAMP), INTERVAL '1 month') m
      LEFT JOIN sales_v2 s ON s.archived=0 AND date_trunc('month', s.sold_at)=m ${own}
      GROUP BY m ORDER BY m`).bind(...ownArgs).all<{ key: string; total: number }>(),
    db.prepare(`SELECT s.id, s.sold_at, c.name AS customer, i.model, s.sale_amount_minor AS amount, (s.delivered_at IS NOT NULL) AS delivered
      FROM sales_v2 s JOIN crm_customers c ON c.id=s.customer_id JOIN inventory_units_v2 i ON i.id=s.inventory_unit_id
      WHERE s.archived=0 ${own} ORDER BY s.sold_at DESC LIMIT 5`).bind(...ownArgs).all<{ id: string; sold_at: string; customer: string; model: string; amount: number; delivered: boolean }>(),
    db.prepare(`SELECT source, COUNT(*)::int AS leads FROM leads WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days' GROUP BY source ORDER BY leads DESC LIMIT 6`).all<{ source: string; leads: number }>(),
    db.prepare(`SELECT COUNT(*)::int AS n FROM leads WHERE status='new' AND created_at < CURRENT_TIMESTAMP - INTERVAL '15 minutes'`).first<N>(),
    db.prepare(`SELECT COUNT(*)::int AS n FROM receivables_v2 r WHERE r.archived=0 AND r.status IN ('open','overdue') AND r.due_at < CURRENT_TIMESTAMP ${ownR}`).bind(...ownArgs).first<N>(),
    db.prepare(`SELECT COUNT(*)::int AS n FROM shipments_v2 WHERE archived=0 AND arrived_at IS NULL AND eta IS NOT NULL AND eta < CURRENT_DATE AND status NOT IN ('arrived','received','cancelled','delivered')`).first<N>(),
    db.prepare(`SELECT COUNT(*)::int AS n FROM inventory_units_v2 WHERE archived=0 AND status='stock' AND created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'`).first<N>(),
    company
      ? db.prepare(`SELECT a.id, a.name, a.currency, (a.opening_balance_minor + COALESCE(SUM(CASE WHEN t.direction='in' THEN t.amount_minor ELSE -t.amount_minor END),0))::bigint AS balance
          FROM financial_accounts a LEFT JOIN account_transactions t ON t.account_id=a.id
          WHERE a.active=1 GROUP BY a.id ORDER BY a.name`).all<{ id: string; name: string; currency: string; balance: number }>()
      : Promise.resolve(null),
  ]);

  const attention: AttentionItem[] = [];
  const nNew = newLeads?.n ?? 0;
  if (nNew) attention.push({ key: "leads", title: `${nNew} заявк${nNew === 1 ? "а" : nNew < 5 ? "и" : ""} без ответа`, hint: "дольше 15 минут", href: "/admin/work/leads", icon: "inbox", tone: "terra" });
  const nOver = overdueList?.n ?? 0;
  if (nOver) attention.push({ key: "debts", title: `Просроченные долги: ${nOver}`, hint: "клиенты и банки", href: "/admin/work/debts", icon: "scale", tone: "lilac" });
  const nLate = lateShipments?.n ?? 0;
  if (nLate && company) attention.push({ key: "ship", title: `Поставки опаздывают: ${nLate}`, hint: "срок прибытия прошёл", href: "/admin/work/logistics", icon: "truck", tone: "sky" });
  const nOld = oldStock?.n ?? 0;
  if (nOld && company) attention.push({ key: "stock", title: `Машины на складе больше 90 дней: ${nOld}`, hint: "стоит подумать о цене или акции", href: "/admin/work/stock", icon: "tractor", tone: "teal" });

  const cashRows = accounts?.results ?? null;
  return {
    scope: company ? "company" : "mine",
    revenue: { month: Number(rev?.total ?? 0), prev: Number(prev?.n ?? 0), count: Number(rev?.n ?? 0) },
    margin: margin ? { month: Number(margin.margin), known: Number(margin.unknown) === 0 } : null,
    stock: { count: Number(stock?.n ?? 0), value: seesCost(actor) ? Number(stock?.value ?? 0) : null, transit: Number(transit?.n ?? 0) },
    debts: { total: Number(debts?.total ?? 0), overdue: Number(debts?.overdue ?? 0), banks: 0 },
    months: months.results.map((m) => ({ key: m.key, date: new Date(`${m.key}-01T00:00:00`), total: Number(m.total) })),
    methods: [],
    sources: sources.results.map((s) => ({ source: s.source, leads: Number(s.leads) })),
    recent: recent.results.map((r) => ({ ...r, amount: Number(r.amount), delivered: Boolean(r.delivered) })),
    attention,
    cash: cashRows ? { total: cashRows.filter((a) => a.currency === "KGS").reduce((s, a) => s + Number(a.balance), 0), accounts: cashRows.map((a) => ({ ...a, balance: Number(a.balance) })) } : null,
  };
}
