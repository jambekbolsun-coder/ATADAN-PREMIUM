import Link from "next/link";
import { requireSection } from "../../../_lib/session";
import { BUCKETS, bucketOf, canMoney, listDebts, penaltyFor, penaltyPolicy } from "../../../_lib/money";
import { METHOD } from "../../../_lib/sales";
import { date, money } from "../../../_lib/format";
import { Badge, Card, Empty, Notice, PageHeader, Progress } from "../../../_ui/ui";

export const metadata = { title: "Долги" };
const BUCKET_COLOR: Record<string, string> = { brand: "var(--brand)", sun: "var(--sun)", terra: "var(--terra)", lilac: "var(--lilac)", bad: "var(--bad)" };

export default async function Debts({ searchParams }: PageProps<"/admin/work/debts">) {
  const { actor } = await requireSection("/admin/work/debts");
  const sp = await searchParams;
  const bucket = typeof sp.bucket === "string" && BUCKETS.some((b) => b.key === sp.bucket) ? sp.bucket : "";
  const [debts, policy] = await Promise.all([listDebts(actor), penaltyPolicy()]);

  // всё приводим к сомам по курсу продажи, чтобы суммы складывались
  const kgs = (minor: number, d: { currency: string; fx_rate: number }) => (d.currency === "USD" ? Math.round(minor * (d.fx_rate || 0)) : minor);
  const rows = debts.map((d) => ({ ...d, bucket: bucketOf(d.days_overdue), penalty: penaltyFor(d, policy) }));
  const totals = BUCKETS.map((b) => {
    const list = rows.filter((r) => r.bucket === b.key);
    return { ...b, n: list.length, sum: list.reduce((s, r) => s + kgs(b.key === "current" ? r.left_minor : r.overdue_minor, r), 0) };
  });
  const totalLeft = rows.reduce((s, r) => s + kgs(r.left_minor, r), 0);
  const totalOverdue = rows.reduce((s, r) => s + kgs(r.overdue_minor, r), 0);
  const fromBanks = rows.filter((r) => r.bank_part > 0 && r.status === "booked").reduce((s, r) => s + kgs(Math.min(r.bank_part, r.left_minor), r), 0);
  const shown = bucket ? rows.filter((r) => r.bucket === bucket) : rows;

  return (
    <>
      <PageHeader title="Долги" subtitle={canMoney(actor) ? "Кто нам должен: клиенты по рассрочке и банки по лизингу и кредиту" : "Долги клиентов по вашим продажам"} />
      <div className="ax-grid ax-g4" style={{ marginBottom: 14 }}>
        <div className="ax-card ax-kpi ax-k-green"><div className="ax-kpi-l">Всего должны</div><div className="ax-kpi-v num">{money(totalLeft)}</div><div className="ax-kpi-h">{rows.length} продаж, в сомах по курсу продажи</div></div>
        <div className="ax-card ax-kpi ax-k-terra"><div className="ax-kpi-l">Просрочено</div><div className={`ax-kpi-v num ${totalOverdue ? "ax-down" : ""}`}>{money(totalOverdue)}</div><div className="ax-kpi-h">{rows.filter((r) => r.overdue_minor > 0).length} клиентов</div></div>
        <div className="ax-card ax-kpi ax-k-sky"><div className="ax-kpi-l">Ждём от банков</div><div className="ax-kpi-v num">{money(fromBanks)}</div><div className="ax-kpi-h">лизинг и кредит</div></div>
        <div className="ax-card ax-kpi ax-k-sun"><div className="ax-kpi-l">Пеня по договору</div><div className="ax-kpi-v num">{money(rows.reduce((s, r) => s + kgs(r.penalty, r), 0))}</div><div className="ax-kpi-h">{policy.ratePerDay}% в день после {policy.graceDays} дн., не больше {policy.maxPercent}%</div></div>
      </div>

      {rows.length ? (
        <Card title="Сроки просрочки">
          <div style={{ display: "grid", gap: 10 }}>
            {totals.map((b) => (
              <Link key={b.key} href={bucket === b.key ? "/admin/work/debts" : `/admin/work/debts?bucket=${b.key}`} style={{ display: "grid", gap: 4, opacity: bucket && bucket !== b.key ? 0.5 : 1 }}>
                <span className="ax-row-line"><span>{b.label} <span className="ax-small">· {b.n}</span></span><b className="num">{money(b.sum)}</b></span>
                <Progress value={b.sum} max={Math.max(...totals.map((t) => t.sum), 1)} color={BUCKET_COLOR[b.color]} />
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <div style={{ height: 14 }} />
      {shown.length ? (
        <>
        <div className="ax-only-phone">
          {shown.map((d) => (
            <Link key={d.id} href={`/admin/work/sales/${d.id}`} className="ax-card ax-mcard">
              <div className="ax-mcard-l1"><span>{d.customer}</span><span className="num">{money(d.left_minor, d.currency)}</span></div>
              <div className="ax-small">{d.number} · {METHOD[d.payment_method as keyof typeof METHOD]?.short ?? d.payment_method}{d.manager ? ` · ${d.manager}` : ""}</div>
              <div className="ax-mcard-l3">
                {d.overdue_minor > 0 ? <Badge tone="bad">просрочено {money(d.overdue_minor, d.currency)} · {d.days_overdue} дн.</Badge> : <Badge tone="good">без просрочки</Badge>}
                {d.next_due ? <span className="ax-small">след. {date(d.next_due)}</span> : null}
              </div>
            </Link>
          ))}
        </div>
        <div className="ax-table-wrap ax-only-desktop">
          <table className="ax-table">
            <thead><tr><th>Продажа</th><th>Клиент</th><th>Оплата</th><th className="r">Осталось</th><th className="r">Просрочено</th><th>Следующий платёж</th></tr></thead>
            <tbody>
              {shown.map((d) => (
                <tr key={d.id}>
                  <td><Link href={`/admin/work/sales/${d.id}`} className="ax-strong num">{d.number}</Link>{d.manager ? <div className="ax-small">{d.manager}</div> : null}</td>
                  <td><Link href={`/admin/work/clients/${d.customer_id}`}>{d.customer}</Link><div className="ax-small num">{d.phone}</div></td>
                  <td className="ax-small">{METHOD[d.payment_method as keyof typeof METHOD]?.label ?? d.payment_method}{d.bank_name ? ` · ${d.bank_name}` : ""}<div><Badge tone={d.status === "delivered" ? "info" : "mute"}>{d.status === "delivered" ? "выдана" : "оформлена"}</Badge></div></td>
                  <td className="r num ax-strong">{money(d.left_minor, d.currency)}</td>
                  <td className="r num">
                    {d.overdue_minor > 0 ? <><span className="ax-down">{money(d.overdue_minor, d.currency)}</span><div className="ax-small">{d.days_overdue} дн. с {date(d.oldest_due)}</div>{d.penalty ? <div className="ax-small">пеня {money(d.penalty, d.currency)}</div> : null}</> : <span className="ax-small">нет</span>}
                  </td>
                  <td className="num ax-small">{d.next_due ? date(d.next_due) : !d.has_schedule ? (d.status === "delivered" ? "графика нет, долг после выдачи" : "до выдачи") : "по графику всё"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      ) : (
        <div className="ax-card"><Empty icon="scale" tone="teal" title={bucket ? "В этой группе долгов нет" : "Долгов нет"} text="Все проданные машины оплачены полностью." /></div>
      )}
      {rows.some((r) => r.penalty) ? <div style={{ marginTop: 12 }}><Notice tone="info">Пеня рассчитана по правилу компании и показана для переговоров с клиентом. В долг она не добавляется автоматически.</Notice></div> : null}
    </>
  );
}
