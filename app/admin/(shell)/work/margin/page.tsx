import Link from "next/link";
import { requireSection } from "../../../_lib/session";
import { expensesByCategory, marginReport } from "../../../_lib/money";
import { date, money, percent } from "../../../_lib/format";
import { Badge, Card, Empty, Notice, PageHeader } from "../../../_ui/ui";
import { PeriodBar, periodFrom } from "../../../_ui/period";

export const metadata = { title: "Маржа" };

function Pct({ revenue, cost }: { revenue: number; cost: number }) {
  if (!revenue) return <span className="ax-small">нет</span>;
  const m = revenue - cost;
  return <span className={m < 0 ? "ax-down" : undefined}>{percent(m, revenue)}</span>;
}

export default async function Margin({ searchParams }: PageProps<"/admin/work/margin">) {
  await requireSection("/admin/work/margin");
  const { from, to } = periodFrom(await searchParams);
  const [r, expenses] = await Promise.all([marginReport(from, to), expensesByCategory(from, to)]);
  const revenue = r.sales.reduce((s, x) => s + x.revenue_kgs, 0);
  const cost = r.sales.reduce((s, x) => s + x.cost_kgs, 0);
  const gross = revenue - cost;
  const opex = expenses.filter((e) => e.currency === "KGS").reduce((s, e) => s + e.total, 0);
  const otherCur = expenses.filter((e) => e.currency !== "KGS");
  const prelim = r.sales.filter((s) => s.preliminary).length;

  return (
    <>
      <PageHeader title="Маржа и прибыль" subtitle="Выручка минус себестоимость с доставкой и растаможкой. Всё в сомах по курсу дня продажи." />
      <PeriodBar base="/admin/work/margin" from={from} to={to} />
      <div className="ax-grid ax-g4" style={{ marginBottom: 14 }}>
        <div className="ax-card ax-kpi ax-k-sky"><div className="ax-kpi-l">Выручка</div><div className="ax-kpi-v num">{money(revenue)}</div><div className="ax-kpi-h">{r.sales.length} продаж</div></div>
        <div className="ax-card ax-kpi ax-k-terra"><div className="ax-kpi-l">Себестоимость</div><div className="ax-kpi-v num">{money(cost)}</div><div className="ax-kpi-h">закупка + доля расходов поставки</div></div>
        <div className="ax-card ax-kpi ax-k-green"><div className="ax-kpi-l">Валовая маржа</div><div className={`ax-kpi-v num ${gross < 0 ? "ax-down" : ""}`}>{money(gross)}</div><div className="ax-kpi-h">{revenue ? percent(gross, revenue) : "нет продаж"}</div></div>
        <Link href={`/admin/work/expenses?from=${from}&to=${to}`} className="ax-card ax-kpi ax-k-sun"><div className="ax-kpi-l">Чистая прибыль</div><div className={`ax-kpi-v num ${gross - opex < 0 ? "ax-down" : ""}`}>{money(gross - opex)}</div><div className="ax-kpi-h">минус расходы {money(opex)}{otherCur.length ? " (только сомовые)" : ""} →</div></Link>
      </div>
      {prelim ? <div style={{ marginBottom: 14 }}><Notice tone="warn">{prelim} из {r.sales.length} продаж с предварительной маржой: машина ещё не выдана или себестоимость не известна (заказ под клиента, поставка не пришла). Цифра уточнится сама после приёмки и выдачи.</Notice></div> : null}

      {r.sales.length ? (
        <>
          <div className="ax-grid ax-g2" style={{ marginBottom: 14 }}>
            <Card title="По моделям" flush>
              <div className="ax-table-wrap" style={{ border: 0, borderRadius: 0 }}>
                <table className="ax-table">
                  <thead><tr><th>Модель</th><th className="r">Шт.</th><th className="r">Выручка</th><th className="r">Маржа</th><th className="r">%</th></tr></thead>
                  <tbody>{r.models.map((m) => <tr key={m.key}><td>{m.label}</td><td className="r num">{m.qty}</td><td className="r num">{money(m.revenue_kgs)}</td><td className="r num">{money(m.revenue_kgs - m.cost_kgs)}</td><td className="r num"><Pct revenue={m.revenue_kgs} cost={m.cost_kgs} /></td></tr>)}</tbody>
                </table>
              </div>
            </Card>
            <Card title="По менеджерам" flush>
              <div className="ax-table-wrap" style={{ border: 0, borderRadius: 0 }}>
                <table className="ax-table">
                  <thead><tr><th>Менеджер</th><th className="r">Продаж</th><th className="r">Выручка</th><th className="r">Маржа</th><th className="r">%</th></tr></thead>
                  <tbody>{r.managers.map((m) => <tr key={m.manager}><td>{m.manager}</td><td className="r num">{m.n}</td><td className="r num">{money(m.revenue_kgs)}</td><td className="r num">{money(m.revenue_kgs - m.cost_kgs)}</td><td className="r num"><Pct revenue={m.revenue_kgs} cost={m.cost_kgs} /></td></tr>)}</tbody>
                </table>
              </div>
            </Card>
          </div>
          <Card title="Каждая продажа" flush>
            <div className="ax-only-phone" style={{ padding: "8px 12px 4px" }}>
              {r.sales.map((s) => (
                <Link key={s.id} href={`/admin/work/sales/${s.id}`} className="ax-mcard" style={{ borderBottom: "1px solid var(--border)", borderRadius: 0, marginBottom: 0 }}>
                  <div className="ax-mcard-l1"><span>{s.number} · {s.customer}</span><span className="num">{money(s.revenue_kgs - s.cost_kgs)}</span></div>
                  <div className="ax-small">{date(s.sold_at)} · {s.items || "нет позиций"} · выручка {money(s.revenue_kgs)} · <Pct revenue={s.revenue_kgs} cost={s.cost_kgs} /></div>
                  {s.preliminary ? <div className="ax-mcard-l3"><Badge tone="warn">предварительно</Badge></div> : null}
                </Link>
              ))}
            </div>
            <div className="ax-table-wrap ax-only-desktop" style={{ border: 0, borderRadius: 0 }}>
              <table className="ax-table">
                <thead><tr><th>Продажа</th><th>Что продали</th><th className="r">Выручка</th><th className="r">Себестоимость</th><th className="r">Маржа</th><th className="r">%</th></tr></thead>
                <tbody>
                  {r.sales.map((s) => (
                    <tr key={s.id}>
                      <td><Link href={`/admin/work/sales/${s.id}`} className="ax-strong num">{s.number}</Link><div className="ax-small">{date(s.sold_at)} · {s.customer}</div></td>
                      <td className="ax-small">{s.items || "нет позиций"}{s.manager ? <div>{s.manager}</div> : null}</td>
                      <td className="r num">{money(s.revenue_kgs)}</td>
                      <td className="r num">{s.cost_kgs ? money(s.cost_kgs) : <span className="ax-small">неизвестна</span>}</td>
                      <td className="r num ax-strong">{money(s.revenue_kgs - s.cost_kgs)}{s.preliminary ? <div><Badge tone="warn">предварительно</Badge></div> : null}</td>
                      <td className="r num"><Pct revenue={s.revenue_kgs} cost={s.cost_kgs} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <div className="ax-card"><Empty icon="trend" tone="teal" title="За этот период продаж нет" text="Выберите другой период или оформите продажу в разделе «Продажи»." /></div>
      )}
    </>
  );
}
