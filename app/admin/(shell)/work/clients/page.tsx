import Link from "next/link";
import { Search } from "lucide-react";
import { getRawDb } from "../../../../../db";
import { requireSection } from "../../../_lib/session";
import { isCompany } from "../../../_lib/sales";
import { date, money } from "../../../_lib/format";
import { Empty, PageHeader } from "../../../_ui/ui";

export const metadata = { title: "Клиенты" };

type Row = { id: string; name: string; phone: string; region: string; sales: number; bought_kgs: number; debt_kgs: number; last_sale: string | null };

export default async function Clients({ searchParams }: PageProps<"/admin/work/clients">) {
  const { actor } = await requireSection("/admin/work/clients");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const debtOnly = sp.debt === "1";
  const company = isCompany(actor);
  const where: string[] = ["c.archived=0"];
  const args: unknown[] = [];
  if (!company) {
    where.push("(c.assigned_to=? OR EXISTS (SELECT 1 FROM sale_orders o WHERE o.customer_id=c.id AND o.manager_id=?))");
    args.push(actor.id, actor.id);
  }
  if (q) {
    const digits = q.replace(/\D/g, "");
    where.push("(lower(c.name) LIKE ? OR (length(?)>=4 AND regexp_replace(c.phone,'\\D','','g') LIKE ?) OR lower(c.region) LIKE ?)");
    const like = `%${q.toLowerCase().replace(/[%_\\]/g, "")}%`;
    args.push(like, digits, `%${digits}%`, like);
  }
  const { results } = await getRawDb()
    .prepare(`SELECT * FROM (
        SELECT c.id, c.name, c.phone, c.region,
          COUNT(o.id) FILTER (WHERE o.status<>'cancelled')::int AS sales,
          COALESCE(SUM(CASE WHEN o.status<>'cancelled' THEN CASE WHEN o.currency='USD' THEN o.total_minor*o.fx_rate ELSE o.total_minor END END),0)::bigint AS bought_kgs,
          COALESCE(SUM(CASE WHEN o.status IN ('booked','delivered') THEN GREATEST(o.total_minor - COALESCE(p.v,0),0) * CASE WHEN o.currency='USD' THEN o.fx_rate ELSE 1 END END),0)::bigint AS debt_kgs,
          MAX(o.sold_at) FILTER (WHERE o.status<>'cancelled') AS last_sale, MAX(c.updated_at) AS touched
        FROM crm_customers c
        LEFT JOIN sale_orders o ON o.customer_id=c.id
        LEFT JOIN LATERAL (SELECT SUM(CASE WHEN direction='in' THEN amount_sale_minor ELSE -amount_sale_minor END) AS v FROM sale_payments WHERE sale_id=o.id AND status='posted') p ON true
        WHERE ${where.join(" AND ")}
        GROUP BY c.id) t
      ${debtOnly ? "WHERE debt_kgs>0" : ""}
      ORDER BY COALESCE(last_sale, touched) DESC LIMIT 200`)
    .bind(...args)
    .all<Row>();

  return (
    <>
      <PageHeader title="Клиенты" subtitle={company ? "Все покупатели компании" : "Ваши клиенты"} />
      <form role="search" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input name="q" defaultValue={q} className="ax-input" style={{ maxWidth: 320 }} placeholder="Имя, телефон, регион" aria-label="Поиск клиента" />
        <label className="ax-chip"><input type="checkbox" name="debt" value="1" defaultChecked={debtOnly} /> Только с долгом</label>
        <button className="ax-btn"><Search size={16} aria-hidden />Найти</button>
      </form>
      {results.length ? (
        <div className="ax-table-wrap">
          <table className="ax-table">
            <thead><tr><th>Клиент</th><th>Регион</th><th className="r">Покупок</th><th className="r">Купил на</th><th className="r">Долг</th><th>Последняя покупка</th></tr></thead>
            <tbody>
              {results.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/admin/work/clients/${c.id}`} className="ax-strong">{c.name}</Link><div className="ax-small num">{c.phone}</div></td>
                  <td className="ax-small">{c.region || "не указан"}</td>
                  <td className="r num">{c.sales}</td>
                  <td className="r num">{Number(c.bought_kgs) ? money(Number(c.bought_kgs)) : ""}</td>
                  <td className={`r num ${Number(c.debt_kgs) ? "ax-down" : ""}`}>{Number(c.debt_kgs) ? money(Number(c.debt_kgs)) : ""}</td>
                  <td className="ax-small">{c.last_sale ? date(c.last_sale) : "покупок нет"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ax-card"><Empty icon="users" tone="sky" title={q || debtOnly ? "Никого не нашлось" : "Клиентов пока нет"} text={q || debtOnly ? "Измените поиск." : "Клиент появляется после заявки с сайта или при оформлении продажи."} /></div>
      )}
      <p className="ax-small" style={{ marginTop: 10 }}>Суммы в сомах: долларовые продажи пересчитаны по курсу на дату продажи.</p>
    </>
  );
}
