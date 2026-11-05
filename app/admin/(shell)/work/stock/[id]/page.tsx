import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection, seesCost } from "../../../../_lib/session";
import { getUnit, UNIT_STATUS, canStockEdit } from "../../../../_lib/stock";
import { date, dateTime, money } from "../../../../_lib/format";
import { Badge, Card, Notice, PageHeader } from "../../../../_ui/ui";
import { UnitActions } from "./unit-actions";

export const metadata = { title: "Машина" };

export default async function UnitCard({ params }: PageProps<"/admin/work/stock/[id]">) {
  const { actor } = await requireSection("/admin/work/stock");
  const { id } = await params;
  const data = await getUnit(id);
  if (!data) notFound();
  const { unit: u, events, order } = data;
  const st = UNIT_STATUS[u.status as string] ?? { label: String(u.status), tone: "mute" as const };
  const cost = seesCost(actor);
  const s = (k: string) => String(u[k] ?? "");

  return (
    <>
      <PageHeader
        title={<>{u.model} <Badge tone={u.written_off_at ? "mute" : st.tone}>{u.written_off_at ? "Списана" : st.label}</Badge></>}
        subtitle={<span className="num">VIN {u.vin}{u.received_at ? ` · на складе с ${date(u.received_at)}` : ""}{u.days !== null ? ` · ${u.days} дн.` : ""}</span>}
        actions={canStockEdit(actor) && !u.written_off_at ? (
          <UnitActions
            unitId={u.id}
            canPdi={!!u.received_at && !u.pdi_done_at}
            canWriteOff={actor.role === "owner" && !u.sale_id && !["sold", "delivered"].includes(String(u.status))}
            damage={s("damage_note")}
            info={{ engine: s("engine_number"), year: s("year"), color: s("color"), gtd: s("gtd_number"), certificate: s("certificate_number"), passport: s("passport_number"), location: s("location"), listPrice: u.list_price_minor ? String(Number(u.list_price_minor) / 100) : "" }}
            canPrice={actor.role === "owner" || actor.role === "director"}
          />
        ) : null}
      />
      {u.damage_note ? <div style={{ marginBottom: 12 }}><Notice tone="bad">Повреждение: {u.damage_note}</Notice></div> : null}
      {u.written_off_at ? <div style={{ marginBottom: 12 }}><Notice tone="warn">Списана {date(String(u.written_off_at))}: {s("write_off_reason")}</Notice></div> : null}
      <div className="ax-grid ax-g-main">
        <div className="ax-grid" style={{ alignContent: "start" }}>
          <div className="ax-grid ax-g2">
            <Card title="Машина">
              <dl className="ax-kv">
                <dt>Модель</dt><dd>{u.model}</dd>
                <dt>VIN</dt><dd className="num">{u.vin}</dd>
                <dt>№ двигателя</dt><dd>{s("engine_number") || "не указан"}</dd>
                <dt>Год / цвет</dt><dd>{[s("year"), s("color")].filter(Boolean).join(" · ") || "не указано"}</dd>
                <dt>Где</dt><dd>{u.location || "не указано"}</dd>
                <dt>PDI</dt><dd>{u.pdi_done_at ? `выполнен ${date(String(u.pdi_done_at))}` : "не выполнен"}</dd>
              </dl>
            </Card>
            <Card title="Документы">
              <dl className="ax-kv">
                <dt>ГТД</dt><dd>{s("gtd_number") || "нет"}</dd>
                <dt>Сертификат ТР ТС</dt><dd>{s("certificate_number") || "нет"}</dd>
                <dt>Паспорт СТМ</dt><dd>{s("passport_number") || "нет"}</dd>
              </dl>
            </Card>
          </div>
          <Card title="Откуда и куда">
            <dl className="ax-kv">
              <dt>Заказ заводу</dt><dd>{order ? <Link href={`/admin/work/logistics/orders/${order.id}`} style={{ color: "var(--brand)" }}>{order.order_number} · {order.supplier}</Link> : "не указан"}</dd>
              <dt>Поставка</dt><dd>{u.shipment ? <Link href={`/admin/work/logistics/shipments/${s("shipment_id")}`} style={{ color: "var(--brand)" }}>{u.shipment}</Link> : "не указана"}</dd>
              <dt>Продажа</dt><dd>{u.sale_id ? <Link href={`/admin/work/sales/${u.sale_id}`} style={{ color: "var(--brand)" }}>{u.sale_number} · {u.customer}</Link> : "не продана"}</dd>
            </dl>
          </Card>
          {cost ? (
            <Card title="Себестоимость">
              <dl className="ax-kv">
                <dt>Закупка по курсу</dt><dd className="num">{money(u.purchase_cost_minor)}</dd>
                <dt>Доля расходов поставки</dt><dd className="num">{money(Number(u.allocated_cost_minor ?? 0))}</dd>
                <dt>Себестоимость</dt><dd className="num" style={{ fontSize: 16 }}>{money(u.landed_cost_minor)}</dd>
                <dt>Цена прайса</dt><dd className="num">{u.list_price_minor ? money(u.list_price_minor) : "не задана"}</dd>
              </dl>
              {!u.received_at ? <p className="ax-small" style={{ marginBottom: 0 }}>Предварительно: расходы поставки ещё могут добавиться.</p> : null}
            </Card>
          ) : null}
        </div>
        <Card title="История">
          <ol className="ax-tl">
            {events.map((e) => <li key={e.id}>{e.note || `${UNIT_STATUS[e.from_status ?? ""]?.label ?? "Создана"} → ${UNIT_STATUS[e.to_status]?.label ?? e.to_status}`}<small>{dateTime(e.occurred_at)}{e.author ? ` · ${e.author}` : ""}</small></li>)}
          </ol>
        </Card>
      </div>
    </>
  );
}
