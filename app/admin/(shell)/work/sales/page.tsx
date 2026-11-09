import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireSection } from "../../../_lib/session";
import { listSales, METHOD, METHODS, SALE_VIEWS, statusLabel, type SaleView } from "../../../_lib/sales";
import { date, money } from "../../../_lib/format";
import { Badge, ButtonLink, Empty, PageHeader, Progress, Tag } from "../../../_ui/ui";

export const metadata = { title: "Продажи" };

const cur = (c: string) => (c === "USD" ? "USD" : "KGS") as "USD" | "KGS";

export default async function SalesList({ searchParams }: PageProps<"/admin/work/sales">) {
  const { actor } = await requireSection("/admin/work/sales");
  const sp = await searchParams;
  const view = (SALE_VIEWS.some((v) => v.key === sp.view) ? sp.view : "all") as SaleView;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const method = typeof sp.method === "string" ? sp.method : "";
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));
  const { rows, hasMore, counts } = await listSales(actor, { view, q, method, page });
  const href = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const next = { view, q, method, page: 1, ...patch };
    for (const [k, v] of Object.entries(next)) if (v && !(k === "view" && v === "all") && !(k === "page" && v === 1)) p.set(k, String(v));
    const s = p.toString();
    return `/admin/work/sales${s ? `?${s}` : ""}`;
  };
  const totals = rows.reduce(
    (acc, r) => {
      const k = r.currency === "USD" ? "usd" : "kgs";
      acc[k].total += r.total_minor;
      acc[k].debt += r.status === "cancelled" ? 0 : Math.max(0, r.total_minor - r.paid_minor);
      return acc;
    },
    { usd: { total: 0, debt: 0 }, kgs: { total: 0, debt: 0 } },
  );
  const sum = (k: "total" | "debt") => [totals.usd[k] ? money(totals.usd[k], "USD") : "", totals.kgs[k] ? money(totals.kgs[k]) : ""].filter(Boolean).join(" + ") || "0";

  return (
    <>
      <PageHeader
        title="Продажи"
        subtitle={actor.role === "manager" ? "Ваши продажи: кто купил, что, за сколько и как оплатил" : "Кто купил, что, за сколько и как оплатил"}
        actions={<><ButtonLink href="/admin/work/sales/quick">Быстрая продажа</ButtonLink><ButtonLink href="/admin/work/sales/new" variant="primary"><Plus size={17} aria-hidden />Новая продажа</ButtonLink></>}
      />
      <nav className="ax-tabs" aria-label="Статус продажи">
        {SALE_VIEWS.map((v) => (
          <Link key={v.key} href={href({ view: v.key })} aria-current={view === v.key ? "page" : undefined}>
            {v.label}<span>{counts[v.key] ?? 0}</span>
          </Link>
        ))}
      </nav>
      <form className="ax-filters" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }} role="search">
        <input type="hidden" name="view" value={view === "all" ? "" : view} />
        <input name="q" defaultValue={q} className="ax-input" style={{ maxWidth: 320 }} placeholder="Клиент, телефон, VIN, № продажи" aria-label="Поиск по продажам" />
        <select name="method" defaultValue={method} className="ax-input" style={{ maxWidth: 220 }} aria-label="Способ оплаты">
          <option value="">Все способы оплаты</option>
          {METHODS.map((m) => <option key={m} value={m}>{METHOD[m].label}</option>)}
        </select>
        <button className="ax-btn"><Search size={16} aria-hidden />Найти</button>
        {q || method ? <Link className="ax-btn ax-btn-ghost" href={href({ q: "", method: "" })}>Сбросить</Link> : null}
      </form>

      {rows.length === 0 ? (
        <div className="ax-card">
          <Empty
            icon="cart"
            title={q || method || view !== "all" ? "Продаж по этому фильтру нет" : "Продаж пока нет"}
            text={q || method || view !== "all" ? "Измените фильтр или поиск." : "Оформите первую продажу: клиент, техника, способ оплаты."}
            action={<ButtonLink href="/admin/work/sales/new" variant="primary" size="sm">Новая продажа</ButtonLink>}
          />
        </div>
      ) : (
        <>
          <div className="ax-table-wrap ax-only-desktop">
            <table className="ax-table">
              <thead>
                <tr><th>№ / дата</th><th>Клиент</th><th>Что купил</th><th className="r">Сумма</th><th>Оплата</th><th>Оплачено</th><th>Статус</th>{actor.role !== "manager" ? <th>Менеджер</th> : null}</tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = statusLabel(r);
                  const m = METHOD[r.payment_method];
                  return (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: "nowrap" }}><Link href={`/admin/work/sales/${r.id}`} className="ax-strong">{r.number}</Link><div className="ax-small">{date(r.sold_at)}</div></td>
                      <td><Link href={`/admin/work/clients/${r.customer_id}`} className="ax-strong">{r.customer}</Link><div className="ax-small">{[r.phone, r.region].filter(Boolean).join(" · ")}</div></td>
                      <td style={{ maxWidth: 260 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.items}>{r.items || "без позиций"}</div></td>
                      <td className="r num ax-strong">{money(r.total_minor, cur(r.currency))}</td>
                      <td><Tag tone={m.tone}>{m.short}{r.bank_name ? ` · ${r.bank_name}` : ""}</Tag></td>
                      <td style={{ minWidth: 120 }}><Progress value={r.paid_minor} max={r.total_minor} /><div className="ax-small num">{Math.round((r.paid_minor / r.total_minor) * 100)}% · {money(r.paid_minor, cur(r.currency))}</div></td>
                      <td><Badge tone={st.tone}>{st.label}</Badge></td>
                      {actor.role !== "manager" ? <td className="ax-small">{r.manager ?? "не указан"}</td> : null}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr><td colSpan={3}>На странице: {rows.length}</td><td className="r num">{sum("total")}</td><td colSpan={actor.role !== "manager" ? 4 : 3} className="num">Долг: {sum("debt")}</td></tr>
              </tfoot>
            </table>
          </div>
          <div className="ax-only-phone">
            {rows.map((r) => {
              const st = statusLabel(r);
              const m = METHOD[r.payment_method];
              return (
                <Link key={r.id} href={`/admin/work/sales/${r.id}`} className="ax-card ax-mcard">
                  <div className="ax-mcard-l1"><span>{r.customer}</span><span className="num">{money(r.total_minor, cur(r.currency))}</span></div>
                  <div className="ax-small">{r.number} · {r.items} · {date(r.sold_at)}</div>
                  <div className="ax-mcard-l3"><Tag tone={m.tone}>{m.short}</Tag><Progress value={r.paid_minor} max={r.total_minor} /><Badge tone={st.tone}>{st.label}</Badge></div>
                </Link>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
            {page > 1 ? <Link className="ax-btn" href={href({ page: page - 1 })}>← Назад</Link> : null}
            {hasMore ? <Link className="ax-btn" href={href({ page: page + 1 })}>Ещё →</Link> : null}
          </div>
        </>
      )}
    </>
  );
}
