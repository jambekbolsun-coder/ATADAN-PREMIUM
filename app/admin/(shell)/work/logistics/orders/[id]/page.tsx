import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { getUsdKgsRate } from "../../../../../../lib/exchange-rate";
import { requireSection, seesCost } from "../../../../../_lib/session";
import { canLogistics, COST_CATEGORY, getOrder } from "../../../../../_lib/stock";
import { COST_ITEMS, paymentPlan } from "../../../../../_lib/landed-cost";
import { moneyAccounts } from "../../../../../_lib/sales";
import { date, money, type Currency } from "../../../../../_lib/format";
import { Badge, ButtonLink, Card, Notice, PageHeader, Progress } from "../../../../../_ui/ui";
import { SupplierPayment, VoidSupplierPayment } from "../../logistics-actions";
import { CostDialog, PlanDialog, VoidOrderCost } from "../../cost-forms";

export const metadata = { title: "Заказ заводу" };
const STEP_LABEL: Record<string, string> = { planned: "Планируется", shipped: "Отгружено", transit: "В пути", customs: "На таможне", cleared: "Растаможено", received: "Принято" };
const SRC: Record<string, [string, string]> = { plan: ["план", "is-plan"], fact: ["факт", "is-fact"], mixed: ["частично факт", "is-mixed"] };

export default async function OrderCard({ params }: PageProps<"/admin/work/logistics/orders/[id]">) {
  const { actor } = await requireSection("/admin/work/logistics");
  const { id } = await params;
  const data = await getOrder(id);
  if (!data) notFound();
  const { order: o, lines, payments, shipments, costs, plan, schedule, calc, effectiveRate } = data;
  const [accounts, fx] = await Promise.all([moneyAccounts(), getUsdKgsRate()]);
  const c = o.currency as Currency;
  const edit = canLogistics(actor);
  const cost = seesCost(actor);
  const left = Math.max(0, o.total_minor - o.paid_po_minor);
  const canShip = lines.some((l) => l.shipped < l.qty);
  const nbkr = fx?.value ? Math.round(fx.value * 100) / 100 : 0;
  const calcById = new Map(calc.map((x) => [x.lineId, x]));
  // строки расчёта: статьи, у которых есть план или факт хотя бы у одной модели
  const rows = COST_ITEMS.filter((it) => calc.some((x) => x.items[it.key]));
  const anyCalc = rows.length > 0 || lines.some((l) => l.target_price_minor);
  const steps = paymentPlan(schedule, o.total_minor, o.paid_po_minor);
  const scopes = [
    { value: "order", label: "Весь заказ" },
    ...lines.map((l) => ({ value: `line:${l.id}`, label: `Только ${l.model}` })),
    ...shipments.map((s) => ({ value: `shipment:${s.id}`, label: `Поставка ${s.tracking_number}` })),
  ];
  const posted = costs.filter((x) => x.status === "posted");
  const m = (minor: number) => money(Math.round(minor), c);

  return (
    <>
      <PageHeader
        title={<>Заказ {o.order_number} {o.received >= o.qty && o.qty ? <Badge tone="good">Всё принято</Badge> : o.shipped ? <Badge tone="info">В поставках</Badge> : <Badge tone="mute">Заказан</Badge>}</>}
        subtitle={<>{o.supplier}{o.ordered_at ? ` · от ${date(o.ordered_at)}` : ""}{o.expected_at ? ` · ждём ${date(o.expected_at)}` : ""}</>}
        actions={edit ? <>
          {left > 0 ? <SupplierPayment poId={o.id} poCurrency={o.currency} accounts={accounts} rates={{ USD: nbkr }} /> : null}
          <CostDialog target={{ poId: o.id }} accounts={accounts} usdRate={nbkr} currency={o.currency} scopes={scopes} />
          {cost ? <PlanDialog poId={o.id} currency={o.currency} lines={lines.map((l) => ({ id: l.id, model: l.model, qty: l.qty, price: l.unit_price_minor, target: l.target_price_minor }))} plan={plan} schedule={schedule} usdRate={nbkr} /> : null}
          {canShip ? <ButtonLink href={`/admin/work/logistics/shipments/new?po=${o.id}`} variant={left > 0 ? "default" : "primary"}><Plus size={17} aria-hidden />Новая поставка</ButtonLink> : null}
        </> : null}
      />
      <div className="ax-grid ax-g-main">
        <div className="ax-grid" style={{ alignContent: "start" }}>
          {cost ? (
            <Card title="Расчёт себестоимости" flush>
              {anyCalc ? (
                <div className="ax-table-wrap" style={{ border: 0, borderRadius: 0 }}>
                  <table className="ax-table ax-calc">
                    <thead><tr><th>На 1 машину, {c === "USD" ? "$" : c}</th>{lines.map((l) => <th key={l.id} className="num">{l.model} · {l.qty} шт.</th>)}</tr></thead>
                    <tbody>
                      <tr><td className="ax-strong">Цена завода (EXW)</td>{lines.map((l) => <td key={l.id} className="num">{m(l.unit_price_minor)}</td>)}</tr>
                      {rows.map((it) => (
                        <tr key={it.key}>
                          <td>{it.label}</td>
                          {lines.map((l) => {
                            const part = calcById.get(l.id)?.items[it.key];
                            return <td key={l.id} className="num">{part ? <>{m(part.po)}<span className={`ax-calc-src ${SRC[part.source][1]}`}>{SRC[part.source][0]}</span></> : <span className="ax-small">нет</span>}</td>;
                          })}
                        </tr>
                      ))}
                      <tr className="ax-calc-total"><td>Себестоимость</td>{lines.map((l) => <td key={l.id} className="num">{m(calcById.get(l.id)?.totalPo ?? l.unit_price_minor)}</td>)}</tr>
                      {c !== "KGS" ? <tr className="ax-calc-sub"><td>в сомах по курсу заказа {effectiveRate.toFixed(2)}</td>{lines.map((l) => <td key={l.id} className="num">{money(Math.round(calcById.get(l.id)?.totalKgs ?? 0))}</td>)}</tr> : null}
                      {c === "USD" && nbkr ? <tr className="ax-calc-sub"><td>в сомах по курсу НБКР сегодня {nbkr}</td>{lines.map((l) => <td key={l.id} className="num">{money(Math.round((calcById.get(l.id)?.totalPo ?? 0) * nbkr))}</td>)}</tr> : null}
                      <tr><td className="ax-strong">Цена продажи</td>{lines.map((l) => <td key={l.id} className="num">{l.target_price_minor ? m(l.target_price_minor) : <span className="ax-small">не задана</span>}</td>)}</tr>
                      <tr>
                        <td className="ax-strong">Прибыль с машины</td>
                        {lines.map((l) => {
                          const total = calcById.get(l.id)?.totalPo ?? l.unit_price_minor;
                          if (!l.target_price_minor) return <td key={l.id} />;
                          const p = l.target_price_minor - total;
                          return <td key={l.id} className="num" style={{ color: p >= 0 ? "var(--brand)" : "var(--terra)", fontWeight: 700 }}>{m(p)} · {Math.round((p / l.target_price_minor) * 100)}%</td>;
                        })}
                      </tr>
                    </tbody>
                    {lines.length > 0 ? (
                      <tfoot><tr><td>Весь заказ: себестоимость</td><td className="num" colSpan={lines.length}>{m(lines.reduce((a, l) => a + (calcById.get(l.id)?.totalPo ?? l.unit_price_minor) * l.qty, 0))}{c !== "KGS" ? ` · ${money(Math.round(lines.reduce((a, l) => a + (calcById.get(l.id)?.totalKgs ?? 0) * l.qty, 0)))}` : ""}</td></tr></tfoot>
                    ) : null}
                  </table>
                  <p className="ax-small" style={{ margin: 0, padding: "10px 14px" }}>«План»: оценка из расчёта. «Факт»: внесённые расходы. Как только по статье внесён расход, план по ней больше не считается, и себестоимость машин пересчитывается сама.</p>
                </div>
              ) : (
                <div style={{ padding: 16 }}>
                  <Notice tone="info">Нажмите «Расчёт себестоимости» и внесите на одну машину: пошлину, транспорт, НДС, сборы, брокера, СВХ и цену продажи. Получится расчёт как в Excel, в {c === "USD" ? "долларах" : c} и в сомах.</Notice>
                </div>
              )}
            </Card>
          ) : null}
          <Card title="Что заказали" flush>
            <div className="ax-table-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table className="ax-table">
                <thead><tr><th>Модель</th><th className="r">Заказано</th><th className="r">Отгружено</th><th className="r">Цена</th><th className="r">Сумма</th></tr></thead>
                <tbody>
                  {lines.map((l) => <tr key={l.id}><td className="ax-strong">{l.model}</td><td className="r num">{l.qty}</td><td className="r num">{l.shipped}</td><td className="r num">{m(l.unit_price_minor)}</td><td className="r num">{m(l.unit_price_minor * l.qty)}</td></tr>)}
                </tbody>
                <tfoot><tr><td colSpan={4}>Итого</td><td className="r num">{m(o.total_minor)}</td></tr></tfoot>
              </table>
            </div>
          </Card>
          <Card title="Расходы по заказу">
            {posted.length ? <div className="ax-row-line" style={{ marginBottom: 8 }}><span className="ax-small">Всего внесено</span><b className="num">{money(posted.reduce((a, x) => a + x.amount_kgs_minor, 0))}{c !== "KGS" ? ` · ≈ ${m(posted.reduce((a, x) => a + (x.currency === o.currency ? x.amount_minor : x.amount_kgs_minor / effectiveRate), 0))}` : ""}</b></div> : null}
            {costs.length ? (
              <div className="ax-list">
                {costs.map((x) => (
                  <div key={x.id} className="ax-list-row" style={x.status === "void" ? { opacity: 0.55 } : undefined}>
                    <span className="ax-row-body">
                      <span className="ax-row-t">{COST_CATEGORY[x.category] ?? x.category} <span className="ax-small" style={{ fontWeight: 400 }}>· {x.shipment_id ? <Link href={`/admin/work/logistics/shipments/${x.shipment_id}`} style={{ color: "var(--brand)" }}>поставка {x.tracking_number}</Link> : x.line_model ? x.line_model : "весь заказ"}</span></span>
                      <span className="ax-row-s">{date(x.paid_at)} · {x.account ?? "ещё не оплачено"}{x.currency !== "KGS" ? ` · курс ${x.fx_rate} · ${money(x.amount_kgs_minor)}` : ""}{x.note ? ` · ${x.note}` : ""}{x.status === "void" ? ` · сторно: ${x.void_reason}` : ""}</span>
                    </span>
                    <span className="num ax-strong">{x.status === "void" ? <s>{money(x.amount_minor, x.currency as Currency)}</s> : money(x.amount_minor, x.currency as Currency)}</span>
                    {x.status === "posted" && edit ? <VoidOrderCost poId={o.id} costId={x.id} /> : null}
                  </div>
                ))}
              </div>
            ) : <p className="ax-small" style={{ margin: 0 }}>Расходов пока нет. Кнопка «Расход»: фрахт, пошлина, НДС, брокер, СВХ. Можно на весь заказ, на одну модель или на поставку. Внести можно сразу, даже если поставки ещё нет.</p>}
          </Card>
          <Card title="Поставки по заказу">
            {shipments.length ? (
              <div className="ax-list">
                {shipments.map((s) => <Link key={s.id} href={`/admin/work/logistics/shipments/${s.id}`} className="ax-list-row"><span className="ax-row-body"><span className="ax-row-t">{s.tracking_number}</span><span className="ax-row-s">{s.units} шт. · {s.route || "маршрут не указан"}{s.eta ? ` · ETA ${date(s.eta)}` : ""}</span></span><Badge tone={s.status === "received" ? "good" : s.late ? "bad" : "info"}>{s.late ? "опаздывает" : STEP_LABEL[s.status] ?? s.status}</Badge></Link>)}
              </div>
            ) : <p className="ax-small" style={{ margin: 0 }}>Поставок ещё нет. Когда завод отгрузит машины, нажмите «Новая поставка» и внесите VIN из упаковочного листа.</p>}
          </Card>
        </div>
        <div className="ax-grid" style={{ alignContent: "start" }}>
          <Card title="Оплата заводу">
            <div className="ax-row-line" style={{ marginBottom: 8 }}><span className="ax-small">Оплачено</span><b className="num">{m(o.paid_po_minor)} из {m(o.total_minor)}{o.total_minor ? ` · ${Math.round((o.paid_po_minor / o.total_minor) * 100)}%` : ""}</b></div>
            <Progress value={o.paid_po_minor} max={o.total_minor || 1} />
            {steps.length ? (
              <div className="ax-list" style={{ marginTop: 10 }}>
                {steps.map((s) => (
                  <div key={s.label} className="ax-list-row">
                    <span className="ax-row-body"><span className="ax-row-t">{s.label} · {s.percent}%</span><span className="ax-row-s">{s.done ? "оплачено" : s.covered ? `оплачено ${m(s.covered)}, осталось ${m(s.amount - s.covered)}` : "не оплачено"}</span></span>
                    <span className="num ax-strong">{m(s.amount)}</span>
                    {s.done ? <Badge tone="good">✓</Badge> : null}
                  </div>
                ))}
              </div>
            ) : edit && cost ? <p className="ax-small" style={{ margin: "10px 0 0" }}>График оплат («Оплата 1: 20%, Оплата 2: 80%») задаётся в «Расчёте себестоимости».</p> : null}
            {c !== "KGS" ? <p className="ax-small" style={{ margin: "10px 0 0" }}>Курс для себестоимости: <b className="num">{effectiveRate.toFixed(2)}</b> сом за 1 {c === "USD" ? "$" : "¥"} {o.paid_po_minor ? "(по фактическим оплатам)" : "(из заказа, уточнится после оплаты)"}</p> : null}
            {payments.length ? (
              <div className="ax-list" style={{ marginTop: 10 }}>
                {payments.map((p) => (
                  <div key={p.id} className="ax-list-row" style={p.status === "void" ? { opacity: 0.55 } : undefined}>
                    <span className="ax-row-body">
                      <span className="ax-row-t num">{p.status === "void" ? <s>{money(p.amount_minor, p.currency as Currency)}</s> : money(p.amount_minor, p.currency as Currency)}{p.currency !== "KGS" ? ` · курс ${p.fx_rate}` : ""}{o.total_minor && p.status !== "void" ? ` · ${Math.round((p.amount_po_minor / o.total_minor) * 1000) / 10}%` : ""}</span>
                      <span className="ax-row-s">{date(p.paid_at)} · {p.account}{p.note ? ` · ${p.note}` : ""}{p.status === "void" ? ` · сторно: ${p.void_reason}` : ""}</span>
                    </span>
                    {p.status === "posted" && edit ? <VoidSupplierPayment poId={o.id} paymentId={p.id} /> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}
