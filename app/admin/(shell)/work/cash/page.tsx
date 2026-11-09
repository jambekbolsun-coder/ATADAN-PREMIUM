import Link from "next/link";
import { Search } from "lucide-react";
import { requireSection } from "../../../_lib/session";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, listAccounts, listTransactions } from "../../../_lib/money";
import { date, money, type Currency } from "../../../_lib/format";
import { Badge, Empty, PageHeader } from "../../../_ui/ui";
import { MovementDialog, NewAccountDialog, ReverseButton, TransferDialog } from "./cash-actions";

export const metadata = { title: "Касса и платежи" };
const cur = (c: string) => (c === "USD" || c === "CNY" ? c : "KGS") as Currency;
const LINK: Record<string, string> = { purchase_order: "/admin/work/logistics/orders/", shipment: "/admin/work/logistics/shipments/", payroll: "/admin/work/payroll?entry=" };

export default async function Cash({ searchParams }: PageProps<"/admin/work/cash">) {
  const { actor } = await requireSection("/admin/work/cash");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? String(sp[k]) : "");
  const page = Math.max(1, Math.min(500, Number(str("page")) || 1));
  const [accounts, tx] = await Promise.all([
    listAccounts(),
    listTransactions({ accountId: str("account"), direction: str("dir"), from: str("from"), to: str("to"), q: str("q").slice(0, 60), page }),
  ]);
  const qs = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams();
    for (const k of ["account", "dir", "from", "to", "q"]) if (str(k)) p.set(k, str(k));
    for (const [k, v] of Object.entries(patch)) { if (v) p.set(k, String(v)); else p.delete(k); }
    return `/admin/work/cash${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Касса и платежи"
        subtitle="Все деньги компании: приход, расход, остатки касс и счетов"
        actions={<><NewAccountDialog /><TransferDialog accounts={accounts} /><MovementDialog direction="out" accounts={accounts} categories={EXPENSE_CATEGORIES} isOwner={actor.role === "owner"} /><MovementDialog direction="in" accounts={accounts} categories={INCOME_CATEGORIES} isOwner={actor.role === "owner"} /></>}
      />
      {accounts.length ? (
        <div className="ax-grid ax-g4" style={{ marginBottom: 14 }}>
          {accounts.map((a, i) => (
            <Link key={a.id} href={qs({ account: str("account") === a.id ? "" : a.id, page: "" })} className={`ax-card ax-kpi ax-k-${["green", "sky", "lilac", "sun", "teal", "terra"][i % 6]}`} style={str("account") === a.id ? { borderColor: "var(--brand)", boxShadow: "0 0 0 3px var(--ring)" } : undefined}>
              <div className="ax-kpi-l">{a.account_type === "cash" ? "Касса" : "Счёт"} · {a.name}</div>
              <div className={`ax-kpi-v num ${a.balance < 0 ? "ax-down" : ""}`}>{money(a.balance, cur(a.currency))}</div>
              <div className="ax-kpi-h">{str("account") === a.id ? "показаны движения этой кассы" : "нажмите, чтобы отфильтровать"}</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="ax-card" style={{ marginBottom: 14 }}><Empty icon="wallet" title="Касс пока нет" text="Добавьте наличную кассу и банковские счета: в сомах, долларах, юанях." action={<NewAccountDialog />} /></div>
      )}

      <form role="search" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {str("account") ? <input type="hidden" name="account" value={str("account")} /> : null}
        <select name="dir" defaultValue={str("dir")} className="ax-input" style={{ maxWidth: 160 }} aria-label="Направление"><option value="">Приход и расход</option><option value="in">Только приход</option><option value="out">Только расход</option></select>
        <input type="date" name="from" defaultValue={str("from")} className="ax-input" style={{ maxWidth: 160 }} aria-label="С даты" />
        <input type="date" name="to" defaultValue={str("to")} className="ax-input" style={{ maxWidth: 160 }} aria-label="По дату" />
        <input name="q" defaultValue={str("q")} className="ax-input" style={{ maxWidth: 240 }} placeholder="Комментарий, контрагент" aria-label="Поиск" />
        <button className="ax-btn"><Search size={16} aria-hidden />Показать</button>
        {str("account") || str("dir") || str("from") || str("to") || str("q") ? <Link href="/admin/work/cash" className="ax-btn ax-btn-ghost">Сбросить</Link> : null}
      </form>

      {tx.rows.length ? (
        <>
        <div className="ax-only-phone">
          {tx.rows.map((t) => {
            const link = t.link_type && t.link_id && LINK[t.link_type] ? `${LINK[t.link_type]}${t.link_id}` : null;
            return (
              <div key={t.id} className="ax-card ax-mcard" style={t.reversed_by ? { opacity: 0.55 } : undefined}>
                <div className="ax-mcard-l1"><span>{t.category}</span><span className={`num ${t.direction === "in" ? "ax-in" : "ax-out"}`}>{t.direction === "in" ? "+ " : "− "}{money(t.amount_minor, cur(t.currency))}</span></div>
                <div className="ax-small">{date(t.occurred_at)} · {t.account}{t.counterparty || t.description ? ` · ${[t.counterparty, t.description].filter(Boolean).join(" · ")}` : ""}</div>
                {link || t.reversed_by || (!t.system && !t.category.startsWith("Сторно")) ? (
                  <div className="ax-mcard-l3">
                    {t.reversed_by ? <Badge tone="mute">сторнирована</Badge> : null}
                    {link ? <Link href={link} className="ax-btn ax-btn-sm">Открыть</Link> : null}
                    {!t.system && !t.reversed_by && !t.category.startsWith("Сторно") ? <ReverseButton txId={t.id} /> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
          {tx.totals.length ? <p className="ax-small num">{tx.totals.map((x) => `${x.direction === "in" ? "Приход" : "Расход"} ${money(x.total, cur(x.currency))}`).join(" · ")}</p> : null}
        </div>
        <div className="ax-table-wrap ax-only-desktop">
          <table className="ax-table">
            <thead><tr><th>Дата</th><th>Основание</th><th>Касса</th><th className="r">Сумма</th><th /></tr></thead>
            <tbody>
              {tx.rows.map((t) => {
                const link = t.link_type && t.link_id && LINK[t.link_type] ? `${LINK[t.link_type]}${t.link_id}` : null;
                return (
                  <tr key={t.id} style={t.reversed_by ? { opacity: 0.55 } : undefined}>
                    <td className="num" style={{ whiteSpace: "nowrap" }}>{date(t.occurred_at)}</td>
                    <td>
                      <b>{t.category}</b>{t.reversed_by ? <> <Badge tone="mute">сторнирована</Badge></> : null}
                      <div className="ax-small">{[t.counterparty, t.description].filter(Boolean).join(" · ")}{link ? <> · <Link href={link} style={{ color: "var(--brand)" }}>открыть</Link></> : null}</div>
                    </td>
                    <td className="ax-small">{t.account}</td>
                    <td className={`r num ${t.direction === "in" ? "ax-in" : "ax-out"}`}>{t.direction === "in" ? "+ " : "− "}{money(t.amount_minor, cur(t.currency))}</td>
                    <td>{!t.system && !t.reversed_by && !t.category.startsWith("Сторно") ? <ReverseButton txId={t.id} /> : null}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><td colSpan={5} className="num">{tx.totals.length ? tx.totals.map((x) => `${x.direction === "in" ? "Приход" : "Расход"} ${money(x.total, cur(x.currency))}`).join(" · ") : ""}</td></tr></tfoot>
          </table>
        </div>
        </>
      ) : <div className="ax-card"><Empty icon="wallet" title="Движений нет" text="Приход, расход и платежи по продажам появятся здесь." /></div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
        {page > 1 ? <Link className="ax-btn" href={qs({ page: page - 1 })}>← Назад</Link> : null}
        {tx.hasMore ? <Link className="ax-btn" href={qs({ page: page + 1 })}>Ещё →</Link> : null}
      </div>
      <p className="ax-small" style={{ marginTop: 10 }}>Платежи по продажам, оплаты заводу и расходы поставок сторнируются в своих разделах: так долг и себестоимость пересчитываются вместе с кассой.</p>
    </>
  );
}
