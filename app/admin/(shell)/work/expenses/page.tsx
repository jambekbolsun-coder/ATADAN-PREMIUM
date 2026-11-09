import Link from "next/link";
import { requireSection } from "../../../_lib/session";
import { canMoney, EXPENSE_CATEGORIES, expensesByCategory, listAccounts, listTransactions } from "../../../_lib/money";
import { date, money, percent, type Currency } from "../../../_lib/format";
import { Card, Empty, PageHeader, Progress } from "../../../_ui/ui";
import { PeriodBar, periodFrom } from "../../../_ui/period";
import { MovementDialog, ReverseButton } from "../cash/cash-actions";

export const metadata = { title: "Расходы" };
const cur = (c: string) => (c === "USD" || c === "CNY" ? c : "KGS") as Currency;
const COLORS = ["var(--brand)", "var(--sun)", "var(--sky)", "var(--lilac)", "var(--terra)", "var(--teal)"];

export default async function Expenses({ searchParams }: PageProps<"/admin/work/expenses">) {
  const { actor } = await requireSection("/admin/work/expenses");
  const sp = await searchParams;
  const { from, to } = periodFrom(sp);
  const category = typeof sp.category === "string" && EXPENSE_CATEGORIES.includes(sp.category) ? sp.category : "";
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));
  const [groups, tx, accounts] = await Promise.all([
    expensesByCategory(from, to),
    listTransactions({ expensesOnly: true, category, from, to, page }),
    listAccounts(),
  ]);
  const writer = canMoney(actor);
  const currencies = [...new Set(groups.map((g) => g.currency))].sort((a, b) => (a === "KGS" ? -1 : b === "KGS" ? 1 : a.localeCompare(b)));
  const base = `/admin/work/expenses?from=${from}&to=${to}`;

  return (
    <>
      <PageHeader
        title="Расходы"
        subtitle="Операционные расходы компании за период. Закупка машин и расходы поставок в себестоимости, здесь их нет."
        actions={writer ? <MovementDialog direction="out" accounts={accounts} categories={EXPENSE_CATEGORIES} isOwner={actor.role === "owner"} defaultOpenLabel="Добавить расход" /> : null}
      />
      <PeriodBar base="/admin/work/expenses" from={from} to={to} />

      {groups.length ? (
        <div className="ax-grid ax-g2" style={{ marginBottom: 14 }}>
          {currencies.map((c) => {
            const rows = groups.filter((g) => g.currency === c);
            const total = rows.reduce((s, r) => s + r.total, 0);
            return (
              <Card key={c} title={<>По категориям{currencies.length > 1 ? `, ${c}` : ""} <span className="num" style={{ marginLeft: "auto" }}>{money(total, cur(c))}</span></>}>
                <div style={{ display: "grid", gap: 10 }}>
                  {rows.map((r, i) => (
                    <Link key={r.category} href={`${base}&category=${encodeURIComponent(category === r.category ? "" : r.category)}`} style={{ display: "grid", gap: 4, opacity: category && category !== r.category ? 0.5 : 1 }}>
                      <span className="ax-row-line"><span>{r.category} <span className="ax-small">· {r.n}</span></span><b className="num">{money(r.total, cur(c))} <span className="ax-small">{percent(r.total, total, 0)}</span></b></span>
                      <Progress value={r.total} max={rows[0].total} color={COLORS[i % COLORS.length]} />
                    </Link>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {tx.rows.length ? (
        <Card title={category ? <>Расходы: {category} <Link href={base} className="ax-more">показать все</Link></> : "Все расходы"} flush>
          <div className="ax-only-phone" style={{ padding: "8px 12px 4px" }}>
            {tx.rows.map((t) => (
              <div key={t.id} className="ax-mcard" style={{ borderBottom: "1px solid var(--border)", borderRadius: 0, marginBottom: 0 }}>
                <div className="ax-mcard-l1"><span>{t.category}</span><span className="num ax-out">{money(t.amount_minor, cur(t.currency))}</span></div>
                <div className="ax-small">{date(t.occurred_at)} · {t.account}{t.counterparty || t.description ? ` · ${[t.counterparty, t.description].filter(Boolean).join(" · ")}` : ""}</div>
                {writer && !t.system ? <div className="ax-mcard-l3"><ReverseButton txId={t.id} /></div> : null}
              </div>
            ))}
          </div>
          <div className="ax-table-wrap ax-only-desktop" style={{ border: 0, borderRadius: 0 }}>
            <table className="ax-table">
              <thead><tr><th>Дата</th><th>Категория</th><th>Кому, за что</th><th>Касса</th><th className="r">Сумма</th>{writer ? <th /> : null}</tr></thead>
              <tbody>
                {tx.rows.map((t) => (
                  <tr key={t.id}>
                    <td className="num" style={{ whiteSpace: "nowrap" }}>{date(t.occurred_at)}</td>
                    <td>{t.category}</td>
                    <td className="ax-small">{[t.counterparty, t.description].filter(Boolean).join(" · ") || "без комментария"}{t.author ? <div>внёс: {t.author}</div> : null}</td>
                    <td className="ax-small">{t.account}</td>
                    <td className="r num ax-out">{money(t.amount_minor, cur(t.currency))}</td>
                    {writer ? <td>{!t.system ? <ReverseButton txId={t.id} /> : null}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="ax-card"><Empty icon="receipt" tone="sun" title="За этот период расходов нет" text="Аренда, зарплата, реклама, связь: записывайте их здесь, тогда чистая прибыль посчитается правильно." /></div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
        {page > 1 ? <Link className="ax-btn" href={`${base}${category ? `&category=${encodeURIComponent(category)}` : ""}&page=${page - 1}`}>← Назад</Link> : null}
        {tx.hasMore ? <Link className="ax-btn" href={`${base}${category ? `&category=${encodeURIComponent(category)}` : ""}&page=${page + 1}`}>Ещё →</Link> : null}
      </div>
    </>
  );
}
