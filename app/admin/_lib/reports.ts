/** Сводный отчёт за период: продажи, деньги, склад, долги, заявки, сервис. Всё в сомах. */
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { expensesByCategory, listDebts, marginReport } from "./money";

const kgs = "CASE WHEN o.currency='USD' THEN o.fx_rate ELSE 1 END";

export async function periodReport(actor: Actor, from: string, to: string) {
  const db = getRawDb();
  const [margin, expenses, debts, byMethod, cash, stock, leads, sources, service, parts] = await Promise.all([
    marginReport(from, to),
    expensesByCategory(from, to),
    listDebts(actor),
    db.prepare(`SELECT o.payment_method AS method, COUNT(*)::int AS n, SUM(o.total_minor*${kgs})::bigint AS revenue FROM sale_orders o WHERE o.status<>'cancelled' AND o.sold_at >= ?::date AND o.sold_at < ?::date + 1 GROUP BY 1 ORDER BY 3 DESC`).bind(from, to).all<{ method: string; n: number; revenue: number }>(),
    db.prepare(`SELECT a.currency, t.direction, SUM(t.amount_minor)::bigint AS total FROM account_transactions t JOIN financial_accounts a ON a.id=t.account_id
      WHERE t.transfer_id IS NULL AND t.occurred_at >= ?::date AND t.occurred_at < ?::date + 1 GROUP BY 1,2`).bind(from, to).all<{ currency: string; direction: string; total: number }>(),
    db.prepare(`SELECT status, COUNT(*)::int AS n, SUM(CASE WHEN landed_cost_minor>0 THEN landed_cost_minor ELSE purchase_cost_minor END)::bigint AS value FROM inventory_units_v2 WHERE archived=0 AND status IN ('stock','reserved','transit','customs','ordered','production') GROUP BY 1`).all<{ status: string; n: number; value: number }>(),
    db.prepare(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE sale_id IS NOT NULL)::int AS sold, COUNT(*) FILTER (WHERE status='closed' AND sale_id IS NULL)::int AS lost FROM leads WHERE created_at >= ?::date AND created_at < ?::date + 1`).bind(from, to).first<{ total: number; sold: number; lost: number }>(),
    db.prepare(`SELECT COALESCE(NULLIF(utm_source,''), NULLIF(source,''), 'сайт') AS source, COUNT(*)::int AS n, COUNT(*) FILTER (WHERE sale_id IS NOT NULL)::int AS sold FROM leads WHERE created_at >= ?::date AND created_at < ?::date + 1 GROUP BY 1 ORDER BY 2 DESC`).bind(from, to).all<{ source: string; n: number; sold: number }>(),
    db.prepare(`SELECT COUNT(*) FILTER (WHERE opened_at >= ?::date AND opened_at < ?::date + 1)::int AS opened, COUNT(*) FILTER (WHERE closed_at >= ?::date AND closed_at < ?::date + 1)::int AS closed, COUNT(*) FILTER (WHERE status NOT IN ('closed','rejected'))::int AS open, COUNT(*) FILTER (WHERE kind='warranty' AND opened_at >= ?::date AND opened_at < ?::date + 1)::int AS warranty FROM service_tickets`).bind(from, to, from, to, from, to).first<{ opened: number; closed: number; open: number; warranty: number }>(),
    db.prepare("SELECT COALESCE(SUM(qty*cost_minor),0)::bigint AS value, COUNT(*) FILTER (WHERE min_qty>0 AND qty<=min_qty)::int AS low FROM parts WHERE archived=0").first<{ value: number; low: number }>(),
  ]);
  const revenue = margin.sales.reduce((s, x) => s + x.revenue_kgs, 0);
  const cost = margin.sales.reduce((s, x) => s + x.cost_kgs, 0);
  const opex = expenses.filter((e) => e.currency === "KGS").reduce((s, e) => s + e.total, 0);
  const toK = (m: number, d: { currency: string; fx_rate: number }) => (d.currency === "USD" ? Math.round(m * (d.fx_rate || 0)) : m);
  return {
    sales: { n: margin.sales.length, revenue, cost, gross: revenue - cost, net: revenue - cost - opex, opex, preliminary: margin.sales.filter((s) => s.preliminary).length, byMethod: byMethod.results.map((r) => ({ ...r, revenue: Number(r.revenue) })), models: margin.models.slice(0, 8), managers: margin.managers },
    expenses,
    cash: cash.results.map((r) => ({ ...r, total: Number(r.total) })),
    stock: stock.results.map((r) => ({ ...r, value: Number(r.value) })),
    parts: { value: Number(parts?.value ?? 0), low: parts?.low ?? 0 },
    debts: { total: debts.reduce((s, d) => s + toK(d.left_minor, d), 0), overdue: debts.reduce((s, d) => s + toK(d.overdue_minor, d), 0), clients: debts.length, overdueClients: debts.filter((d) => d.overdue_minor > 0).length },
    leads: { ...(leads ?? { total: 0, sold: 0, lost: 0 }), sources: sources.results },
    service: service ?? { opened: 0, closed: 0, open: 0, warranty: 0 },
  };
}
