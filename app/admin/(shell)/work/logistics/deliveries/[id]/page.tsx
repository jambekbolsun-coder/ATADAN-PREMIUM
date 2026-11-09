import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "../../../../../_lib/session";
import { canLogistics } from "../../../../../_lib/stock";
import { canMoney } from "../../../../../_lib/money";
import { catalogModels, moneyAccounts } from "../../../../../_lib/sales";
import { DELIVERY_KIND, DELIVERY_STATUS, getDelivery } from "../../../../../_lib/deliveries";
import { deliveryStatusAction, payDeliveryAction, voidDeliveryPaymentAction } from "../../../../../_lib/deliveries-actions";
import { date, dateTime, money } from "../../../../../_lib/format";
import { ActionButton, ActionDialog, Field } from "../../../../../_ui/forms";
import { Badge, ButtonLink, Card, Notice, PageHeader } from "../../../../../_ui/ui";
import { DeliveryForm } from "../delivery-form";

export const metadata = { title: "Перевозка" };

export default async function DeliveryCard({ params, searchParams }: PageProps<"/admin/work/logistics/deliveries/[id]">) {
  const { actor } = await requireSection("/admin/work/logistics");
  const { id } = await params;
  const sp = await searchParams;
  const data = await getDelivery(id);
  if (!data) notFound();
  const { delivery: d, items } = data;
  const edit = canLogistics(actor);
  const st = DELIVERY_STATUS[d.status];

  if (sp.edit && edit) {
    const models = await catalogModels();
    return (
      <div style={{ maxWidth: 820 }}>
        <PageHeader title={`Изменить ${d.number}`} actions={<ButtonLink href={`/admin/work/logistics/deliveries/${d.id}`} variant="ghost">Отмена</ButtonLink>} />
        <DeliveryForm
          deliveryId={d.id}
          costLocked={!!d.tx_id}
          kinds={DELIVERY_KIND}
          models={models.map((m) => ({ slug: m.slug, model: m.model }))}
          initial={{ kind: d.kind, clientName: d.client_name, clientPhone: d.client_phone, saleId: d.sale_id ?? "", customerId: d.customer_id ?? "", fromPlace: d.from_place, toPlace: d.to_place, plannedAt: d.planned_local, carrier: d.carrier, driverName: d.driver_name, driverPhone: d.driver_phone, vehicle: d.vehicle, cost: d.cost_minor ? String(d.cost_minor / 100) : "", note: d.note, items: items.filter((i) => i.tractor_slug).map((i) => ({ slug: i.tractor_slug as string, qty: String(i.qty), vin: i.vin })) }}
        />
      </div>
    );
  }

  const money_ = canMoney(actor);
  const accounts = money_ && !d.tx_id ? (await moneyAccounts()).filter((a) => a.currency === "KGS") : [];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bishkek" }).format(new Date());
  const action = (s: string) => deliveryStatusAction.bind(null, d.id, s);

  return (
    <div style={{ maxWidth: 820, display: "grid", gap: 14 }}>
      <PageHeader
        title={<>{d.number} <Badge tone={st.tone}>{st.label}</Badge></>}
        subtitle={`${DELIVERY_KIND[d.kind]} · ${dateTime(d.planned_at)}`}
        actions={edit ? (
          <>
            {d.status === "planned" ? <ActionButton variant="primary" label="Выехала" action={action("in_transit")} /> : null}
            {d.status === "planned" || d.status === "in_transit" ? <ActionButton variant={d.status === "in_transit" ? "primary" : "default"} label="Доставлена" action={action("delivered")} /> : null}
            <ButtonLink href={`/admin/work/logistics/deliveries/${d.id}?edit=1`}>Изменить</ButtonLink>
            {d.status === "planned" || d.status === "in_transit" ? <ActionButton variant="danger" label="Отменить" confirm="Перевозка будет отменена." action={action("cancelled")} /> : null}
            {d.status === "cancelled" ? <ActionButton label="Вернуть в план" action={action("planned")} /> : null}
            {d.status === "delivered" ? <ActionButton label="Вернуть в путь" action={action("in_transit")} /> : null}
          </>
        ) : null}
      />
      {sp.saved ? <Notice tone="good">Перевозка сохранена.</Notice> : null}
      <Card title="Кому и куда">
        <dl className="ax-kv">
          {d.client_name ? <><dt>{d.kind === "to_client" ? "ФИО клиента" : "Получатель"}</dt><dd>{d.client_name}</dd></> : null}
          {d.client_phone ? <><dt>Телефон</dt><dd><a href={`tel:${d.client_phone.replace(/[^\d+]/g, "")}`}>{d.client_phone}</a></dd></> : null}
          <dt>Откуда</dt><dd>{d.from_place}</dd>
          <dt>Куда</dt><dd>{d.to_place}</dd>
          <dt>Дата и время</dt><dd>{dateTime(d.planned_at)}, {date(d.planned_at)}</dd>
          {d.departed_at ? <><dt>Выехала</dt><dd>{dateTime(d.departed_at)}</dd></> : null}
          {d.delivered_at ? <><dt>Доставлена</dt><dd>{dateTime(d.delivered_at)}</dd></> : null}
          {d.sale_id ? <><dt>Продажа</dt><dd><Link href={`/admin/work/sales/${d.sale_id}`}>{d.sale_number}</Link></dd></> : null}
        </dl>
      </Card>
      <Card title="Модели">
        <div className="ax-list">{items.map((i) => <div key={i.id} className="ax-list-row"><span className="ax-row-body"><span className="ax-row-t">{i.model}{i.qty > 1 ? ` × ${i.qty}` : ""}</span>{i.vin ? <span className="ax-row-s num">VIN {i.unit_id ? <Link href={`/admin/work/stock/${i.unit_id}`}>{i.vin}</Link> : i.vin}</span> : null}</span></div>)}</div>
      </Card>
      <Card title="Кто везёт">
        <dl className="ax-kv">
          <dt>Перевозчик</dt><dd>{d.carrier || "не указан"}</dd>
          <dt>Транспорт</dt><dd>{d.vehicle || "не указан"}</dd>
          <dt>Водитель</dt><dd>{d.driver_name || "не указан"}</dd>
          <dt>Телефон водителя</dt><dd>{d.driver_phone ? <a href={`tel:${d.driver_phone.replace(/[^\d+]/g, "")}`}>{d.driver_phone}</a> : "не указан"}</dd>
          {d.note ? <><dt>Комментарий</dt><dd>{d.note}</dd></> : null}
        </dl>
      </Card>
      <Card title="Оплата">
        <div className="ax-row-line" style={{ marginBottom: 8 }}><span className="ax-small">Стоимость</span><b className="num">{d.cost_minor ? money(d.cost_minor) : "не указана"}</b></div>
        {d.tx_id ? <p className="ax-small" style={{ marginTop: 0 }}>Оплачено {d.paid_at ? date(d.paid_at) : ""}{d.paid_account ? ` · ${d.paid_account}` : ""}</p> : <p className="ax-small" style={{ marginTop: 0 }}>Оплата в кассу ещё не записана.</p>}
        {money_ && !d.tx_id && d.status !== "cancelled" ? (
          <ActionDialog label="Записать оплату" triggerClass="ax-btn-sm" title="Оплата перевозки" description="Попадёт в расходы с категорией «Логистика»." action={payDeliveryAction.bind(null, d.id)} submitLabel="Записать">
            <Field label="Сумма, сом" htmlFor="p-amt"><input id="p-amt" name="amount" className="ax-input num" inputMode="decimal" defaultValue={d.cost_minor ? String(d.cost_minor / 100) : ""} required /></Field>
            <Field label="Касса или счёт" htmlFor="p-acc"><select id="p-acc" name="accountId" className="ax-input" required>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
            <Field label="Дата" htmlFor="p-date"><input id="p-date" name="paidAt" type="date" className="ax-input" defaultValue={today} required /></Field>
          </ActionDialog>
        ) : null}
        {money_ && d.tx_id ? (
          <ActionDialog label="Сторно оплаты" triggerClass="ax-btn-sm" variant="danger" title="Сторно оплаты" description="Деньги вернутся в кассу." action={voidDeliveryPaymentAction.bind(null, d.id)} submitLabel="Сторнировать">
            <Field label="Причина" htmlFor="p-why"><input id="p-why" name="reason" className="ax-input" required minLength={5} /></Field>
          </ActionDialog>
        ) : null}
      </Card>
    </div>
  );
}
