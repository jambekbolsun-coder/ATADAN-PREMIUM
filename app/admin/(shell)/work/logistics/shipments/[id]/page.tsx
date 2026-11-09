import Link from "next/link";
import { notFound } from "next/navigation";
import { getUsdKgsRate } from "../../../../../../lib/exchange-rate";
import { requireSection, seesCost } from "../../../../../_lib/session";
import { ALLOCATION, canLogistics, COST_CATEGORY, getShipment, SHIPMENT_STEPS, UNIT_STATUS } from "../../../../../_lib/stock";
import { moneyAccounts } from "../../../../../_lib/sales";
import { date, money, type Currency } from "../../../../../_lib/format";
import { Badge, Card, Notice, PageHeader } from "../../../../../_ui/ui";
import { ShipmentActions, VoidShipmentCost } from "../../logistics-actions";
import { shipmentInfoAction } from "../../../../../_lib/stock-actions";
import { ActionDialog, Field } from "../../../../../_ui/forms";
import { dateTime } from "../../../../../_lib/format";

export const metadata = { title: "Поставка" };

export default async function ShipmentCard({ params }: PageProps<"/admin/work/logistics/shipments/[id]">) {
  const { actor } = await requireSection("/admin/work/logistics");
  const { id } = await params;
  const data = await getShipment(id);
  if (!data) notFound();
  const { shipment: s, units, costs } = data;
  const [accounts, fx] = await Promise.all([moneyAccounts(), getUsdKgsRate()]);
  const cost = seesCost(actor);
  const stepIdx = SHIPMENT_STEPS.findIndex((x) => x.key === s.status);
  const costsTotal = costs.filter((c) => c.status === "posted").reduce((sum, c) => sum + c.amount_kgs_minor, 0);
  const late = s.eta && s.eta < new Date().toISOString().slice(0, 10) && s.status !== "received";
  const missing = units.filter((u) => !u.received_at);
  const dates: Record<string, unknown> = { shipped: s.shipped_at, customs: s.customs_at, cleared: s.cleared_at, received: s.received_at };

  return (
    <>
      <PageHeader
        title={<>Поставка {s.tracking_number} {late ? <Badge tone="bad">опаздывает</Badge> : null}</>}
        subtitle={<>Заказ <Link href={`/admin/work/logistics/orders/${s.purchase_order_id}`} style={{ color: "var(--brand)" }}>{s.order_number}</Link> · {s.supplier}{s.eta ? ` · ETA ${date(s.eta)}` : ""}</>}
        actions={canLogistics(actor) ? (
          <ShipmentActions
            shipmentId={s.id}
            status={s.status}
            units={units.map((u) => ({ id: u.id, vin: u.vin, model: u.model, received: !!u.received_at }))}
            accounts={accounts}
            rates={{ USD: fx?.value ? Math.round(fx.value * 100) / 100 : 0 }}
            allocation={s.allocation_method}
            manual={units.map((u) => ({ id: u.id, vin: u.vin, value: u.manual_cost_minor !== null ? String(u.manual_cost_minor / 100) : "" }))}
            categories={COST_CATEGORY}
          />
        ) : null}
      />
      <div className="ax-card" style={{ marginBottom: 14, padding: "14px 18px" }}>
        <ol className="ax-steps" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {SHIPMENT_STEPS.map((step, i) => (
            <li key={step.key} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 ? <span className={`ax-step-line ${i <= stepIdx ? "is-done" : ""}`} aria-hidden /> : null}
              <span className={`ax-step ${i < stepIdx || s.status === "received" ? "is-done" : i === stepIdx ? "is-cur" : ""}`}><i>{i < stepIdx || s.status === "received" ? "✓" : i + 1}</i>{step.label}{dates[step.key] ? <span className="ax-small">&nbsp;{date(String(dates[step.key]))}</span> : null}</span>
            </li>
          ))}
        </ol>
      </div>
      {s.status === "cleared" && missing.length && units.some((u) => u.received_at) ? <div style={{ marginBottom: 12 }}><Notice tone="warn">Недостача: не пришли {missing.map((m) => m.vin).join(", ")}. Примите их, когда приедут, или разберитесь с поставщиком.</Notice></div> : null}

      <div className="ax-grid ax-g-main">
        <Card title={`Машины (${units.length})`} flush>
          <div className="ax-table-wrap" style={{ border: 0, borderRadius: 0 }}>
            <table className="ax-table">
              <thead><tr><th>VIN</th><th>Модель</th><th>Статус</th><th>Клиент</th>{cost ? <><th className="r">Закупка</th><th className="r">Доля расходов</th><th className="r">Себестоимость</th></> : null}</tr></thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.id}>
                    <td className="num"><Link href={`/admin/work/stock/${u.id}`} className="ax-strong">{u.vin}</Link>{u.engine_number ? <div className="ax-small">двиг. {u.engine_number}</div> : null}</td>
                    <td>{u.model}</td>
                    <td><Badge tone={UNIT_STATUS[u.status]?.tone ?? "mute"}>{UNIT_STATUS[u.status]?.label ?? u.status}</Badge></td>
                    <td className="ax-small">{u.client ?? ""}</td>
                    {cost ? <><td className="r num">{money(u.purchase_cost_minor)}</td><td className="r num">{money(u.allocated_cost_minor)}</td><td className="r num ax-strong">{money(u.landed_cost_minor)}</td></> : null}
                  </tr>
                ))}
              </tbody>
              {cost ? <tfoot><tr><td colSpan={4}>Итого</td><td className="r num">{money(units.reduce((a, u) => a + u.purchase_cost_minor, 0))}</td><td className="r num">{money(units.reduce((a, u) => a + u.allocated_cost_minor, 0))}</td><td className="r num">{money(units.reduce((a, u) => a + u.landed_cost_minor, 0))}</td></tr></tfoot> : null}
            </table>
          </div>
        </Card>
        <div className="ax-grid" style={{ alignContent: "start" }}>
          <Card title="Расходы поставки">
            <div className="ax-row-line" style={{ marginBottom: 8 }}><span className="ax-small">Всего</span><b className="num">{money(costsTotal)}</b></div>
            <p className="ax-small" style={{ marginTop: 0 }}>Распределение: {ALLOCATION[s.allocation_method] ?? s.allocation_method}</p>
            {cost && s.allocation_method === "manual" && units.reduce((a, u) => a + (u.manual_cost_minor ?? 0), 0) !== costsTotal ? <div style={{ marginBottom: 8 }}><Notice tone="warn">Вручную распределено {money(units.reduce((a, u) => a + (u.manual_cost_minor ?? 0), 0))} из {money(costsTotal)}. Проверьте доли машин.</Notice></div> : null}
            {costs.length ? (
              <div className="ax-list">
                {costs.map((c) => (
                  <div key={c.id} className="ax-list-row" style={c.status === "void" ? { opacity: 0.55 } : undefined}>
                    <span className="ax-row-body">
                      <span className="ax-row-t">{COST_CATEGORY[c.category] ?? c.category}</span>
                      <span className="ax-row-s">{date(c.paid_at)} · {c.account ?? "ещё не оплачено"}{c.note ? ` · ${c.note}` : ""}{c.status === "void" ? ` · сторно: ${c.void_reason}` : ""}</span>
                    </span>
                    <span className="num ax-strong">{c.status === "void" ? <s>{money(c.amount_minor, c.currency as Currency)}</s> : money(c.amount_minor, c.currency as Currency)}</span>
                    {c.status === "posted" && canLogistics(actor) ? <VoidShipmentCost shipmentId={s.id} costId={c.id} /> : null}
                  </div>
                ))}
              </div>
            ) : <p className="ax-small" style={{ margin: 0 }}>Расходов пока нет. Добавьте фрахт, пошлину, брокера: они войдут в себестоимость машин.</p>}
          </Card>
          <Card title="Маршрут и перевозчик">
            <dl className="ax-kv">
              <dt>Откуда</dt><dd>{String(s.origin || "не указано")}</dd>
              <dt>Куда</dt><dd>{String(s.destination || "не указано")}</dd>
              <dt>Маршрут</dt><dd>{String(s.route || "не указан")}</dd>
              <dt>Транспорт</dt><dd>{String(s.transport || "не указан")}</dd>
              <dt>Перевозчик</dt><dd>{String(s.carrier || "не указан")}</dd>
              <dt>Водитель</dt><dd>{[s.driver_name, s.driver_phone].filter(Boolean).map(String).join(", ") || "не указан"}</dd>
              <dt>Отправление</dt><dd>{s.departure_at ? dateTime(String(s.departure_at)) : "не указано"}</dd>
              <dt>Ожидаем</dt><dd>{s.eta ? date(s.eta) : "не указано"}</dd>
            </dl>
            {canLogistics(actor) ? (
              <ActionDialog label="Изменить" triggerClass="ax-btn-sm" title="Маршрут и перевозчик" action={shipmentInfoAction.bind(null, s.id)} submitLabel="Сохранить">
                <Field label="Откуда" htmlFor="si-o"><input id="si-o" name="origin" className="ax-input" defaultValue={String(s.origin ?? "")} /></Field>
                <Field label="Куда" htmlFor="si-d"><input id="si-d" name="destination" className="ax-input" defaultValue={String(s.destination ?? "")} /></Field>
                <Field label="Маршрут" htmlFor="si-r"><input id="si-r" name="route" className="ax-input" defaultValue={String(s.route ?? "")} /></Field>
                <Field label="Транспорт" htmlFor="si-t"><input id="si-t" name="transport" className="ax-input" defaultValue={String(s.transport ?? "")} /></Field>
                <Field label="Перевозчик" htmlFor="si-c"><input id="si-c" name="carrier" className="ax-input" defaultValue={String(s.carrier ?? "")} /></Field>
                <Field label="Водитель" htmlFor="si-n"><input id="si-n" name="driverName" className="ax-input" defaultValue={String(s.driver_name ?? "")} /></Field>
                <Field label="Телефон водителя" htmlFor="si-p"><input id="si-p" name="driverPhone" className="ax-input" inputMode="tel" defaultValue={String(s.driver_phone ?? "")} /></Field>
                <Field label="Дата и время отправления" htmlFor="si-dep"><input id="si-dep" name="departure" type="datetime-local" className="ax-input" defaultValue={String(s.departure_local ?? "")} /></Field>
                <Field label="Ожидаемая дата" htmlFor="si-eta"><input id="si-eta" name="eta" type="date" className="ax-input" defaultValue={s.eta ?? ""} /></Field>
              </ActionDialog>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}
