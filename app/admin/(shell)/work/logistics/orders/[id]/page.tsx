import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { getUsdKgsRate } from "../../../../../../lib/exchange-rate";
import { requireSection } from "../../../../../_lib/session";
import { canLogistics, COST_CATEGORY, getOrder } from "../../../../../_lib/stock";
import { moneyAccounts } from "../../../../../_lib/sales";
import { date, money, type Currency } from "../../../../../_lib/format";
import { Badge, ButtonLink, Card, PageHeader, Progress } from "../../../../../_ui/ui";
import { SupplierPayment, VoidSupplierPayment } from "../../logistics-actions";
import { CostDialog, VoidOrderCost } from "../../cost-forms";

export const metadata = { title: "Заказ заводу" };
const STEP_LABEL: Record<string, string> = { planned: "Планируется", shipped: "Отгружено", transit: "В пути", customs: "На таможне", cleared: "Растаможено", received: "Принято" };

export default async function OrderCard({ params }: PageProps<"/admin/work/logistics/orders/[id]">) {
  const { actor } = await requireSection("/admin/work/logistics");
  const { id } = await params;
  const data = await getOrder(id);
  if (!data) notFound();
  const { order: o, lines, payments, shipments, costs, effectiveRate } = data;
  const [accounts, fx] = await Promise.all([moneyAccounts(), getUsdKgsRate()]);
  const c = o.currency as Currency;
  const edit = canLogistics(actor);
  const left = Math.max(0, o.total_minor - o.paid_po_minor);
  const canShip = lines.some((l) => l.shipped < l.qty);
  const nbkr = fx?.value ? Math.round(fx.value * 100) / 100 : 0;
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
          {canShip ? <ButtonLink href={`/admin/work/logistics/shipments/new?po=${o.id}`} variant={left > 0 ? "default" : "primary"}><Plus size={17} aria-hidden />Новая поставка</ButtonLink> : null}
        </> : null}
      />
      <div className="ax-grid ax-g-main">
        <div className="ax-grid" style={{ alignContent: "start" }}>
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
