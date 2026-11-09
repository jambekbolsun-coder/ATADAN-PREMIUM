import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireSection } from "../../../_lib/session";
import { listOrders, listShipments, listSuppliers, SHIPMENT_STEPS, canLogistics } from "../../../_lib/stock";
import { DELIVERY_KIND, DELIVERY_STATUS, listDeliveries } from "../../../_lib/deliveries";
import { date, dateTime, money, type Currency } from "../../../_lib/format";
import { Badge, ButtonLink, Empty, PageHeader, Progress } from "../../../_ui/ui";
import { NewSupplierButton } from "./logistics-actions";

export const metadata = { title: "Логистика" };

const TABS = [
  { key: "shipments", label: "Поставки" },
  { key: "deliveries", label: "Перевозки" },
  { key: "orders", label: "Заказы заводу" },
  { key: "suppliers", label: "Поставщики" },
];

export default async function Logistics({ searchParams }: PageProps<"/admin/work/logistics">) {
  const { actor } = await requireSection("/admin/work/logistics");
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "shipments";
  const dStatus = typeof sp.dstatus === "string" ? sp.dstatus : "";
  const dQuery = typeof sp.dq === "string" ? sp.dq.trim().slice(0, 60) : "";
  const [shipments, orders, suppliers, deliveries] = await Promise.all([listShipments(), listOrders(), listSuppliers(), listDeliveries(dStatus, dQuery)]);
  const edit = canLogistics(actor);
  const active = shipments.filter((s) => s.status !== "received");

  return (
    <>
      <PageHeader
        title="Логистика"
        subtitle="Заказ заводу → оплата → поставка → таможня → приём на склад. Себестоимость машин считается сама"
        actions={edit ? (tab === "deliveries" ? <ButtonLink href="/admin/work/logistics/deliveries/new" variant="primary"><Plus size={17} aria-hidden />Новая перевозка</ButtonLink> : <><NewSupplierButton /><ButtonLink href="/admin/work/logistics/orders/new" variant="primary"><Plus size={17} aria-hidden />Новый заказ заводу</ButtonLink></>) : null}
      />
      <nav className="ax-tabs" aria-label="Разделы логистики">
        {TABS.map((t) => <Link key={t.key} href={`/admin/work/logistics?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined}>{t.label}<span>{t.key === "shipments" ? active.length : t.key === "deliveries" ? deliveries.length : t.key === "orders" ? orders.length : suppliers.length}</span></Link>)}
      </nav>

      {tab === "shipments" ? (
        shipments.length ? (
          <>
            <div className="ax-pipe">
              {SHIPMENT_STEPS.map((step) => {
                const list = shipments.filter((s) => s.status === step.key && (step.key !== "received" || true)).slice(0, step.key === "received" ? 4 : 50);
                return (
                  <section key={step.key} className="ax-pipe-col" aria-label={step.label}>
                    <h4>{step.label} <span>{shipments.filter((s) => s.status === step.key).length}</span></h4>
                    {list.length ? list.map((s) => (
                      <Link key={s.id} href={`/admin/work/logistics/shipments/${s.id}`} className="ax-pipe-card" style={s.late ? { borderColor: "var(--bad)" } : undefined}>
                        <div className="ax-row-line"><b>{s.tracking_number}</b>{s.late ? <Badge tone="bad">опаздывает</Badge> : null}</div>
                        <div className="ax-small">{s.units} шт. · заказ {s.order_number}</div>
                        <div className="ax-small">{[s.route, s.eta ? `ETA ${date(s.eta)}` : ""].filter(Boolean).join(" · ")}</div>
                        {s.costs_kgs ? <div className="ax-small">Расходы: {money(s.costs_kgs)}</div> : null}
                      </Link>
                    )) : <p className="ax-small" style={{ margin: 4 }}>Пусто</p>}
                  </section>
                );
              })}
            </div>
            <p className="ax-small" style={{ marginTop: 10 }}>Поставка создаётся из заказа заводу: откройте заказ и нажмите «Новая поставка».</p>
          </>
        ) : <div className="ax-card"><Empty icon="truck" tone="sky" title="Поставок пока нет" text="Создайте заказ заводу, затем оформите по нему поставку с VIN из упаковочного листа." action={edit ? <ButtonLink href="/admin/work/logistics/orders/new" size="sm" variant="primary">Новый заказ заводу</ButtonLink> : undefined} /></div>
      ) : null}

      {tab === "deliveries" ? (
        <>
          <nav className="ax-chips" aria-label="Статус перевозки" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <Link className="ax-chip" aria-pressed={!dStatus} href="/admin/work/logistics?tab=deliveries">Все</Link>
            {Object.entries(DELIVERY_STATUS).map(([k, s]) => <Link key={k} className="ax-chip" aria-pressed={dStatus === k} href={`/admin/work/logistics?tab=deliveries&dstatus=${k}`}>{s.label}</Link>)}
          </nav>
          <form role="search" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input type="hidden" name="tab" value="deliveries" />
            {dStatus ? <input type="hidden" name="dstatus" value={dStatus} /> : null}
            <input name="dq" defaultValue={dQuery} className="ax-input" style={{ maxWidth: 300 }} placeholder="ФИО, телефон или номер" aria-label="Поиск перевозок" />
            <button className="ax-btn"><Search size={16} aria-hidden />Найти</button>
          </form>
          {deliveries.length ? (
            <>
              <div className="ax-only-phone">
                {deliveries.map((d) => (
                  <Link key={d.id} href={`/admin/work/logistics/deliveries/${d.id}`} className="ax-card ax-mcard" style={{ display: "block" }}>
                    <span className="ax-mcard-l1"><span>{d.client_name || DELIVERY_KIND[d.kind]}</span><Badge tone={DELIVERY_STATUS[d.status].tone}>{DELIVERY_STATUS[d.status].label}</Badge></span>
                    <span className="ax-small" style={{ display: "block" }}>{d.from_place} → {d.to_place}</span>
                    <span className="ax-small" style={{ display: "block" }}>{dateTime(d.planned_at)} · {d.models}</span>
                    {d.client_phone ? <span className="ax-small" style={{ display: "block" }}>{d.client_phone}</span> : null}
                  </Link>
                ))}
              </div>
              <div className="ax-table-wrap ax-only-desktop">
                <table className="ax-table">
                  <thead><tr><th>Номер</th><th>Клиент</th><th>Откуда → куда</th><th>Когда</th><th>Модели</th><th>Кто везёт</th><th className="r">Стоимость</th></tr></thead>
                  <tbody>
                    {deliveries.map((d) => (
                      <tr key={d.id}>
                        <td><Link href={`/admin/work/logistics/deliveries/${d.id}`} className="ax-strong">{d.number}</Link><div><Badge tone={DELIVERY_STATUS[d.status].tone}>{DELIVERY_STATUS[d.status].label}</Badge></div></td>
                        <td>{d.client_name || DELIVERY_KIND[d.kind]}<div className="ax-small">{d.client_phone}</div></td>
                        <td>{d.from_place} → {d.to_place}</td>
                        <td className="num">{dateTime(d.planned_at)}</td>
                        <td>{d.models}</td>
                        <td>{d.driver_name || d.carrier}<div className="ax-small">{d.driver_phone || d.vehicle}</div></td>
                        <td className="r num">{d.cost_minor ? money(d.cost_minor) : ""}{d.cost_minor ? <div className="ax-small">{d.tx_id ? "оплачено" : "не оплачено"}</div> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <div className="ax-card"><Empty icon="truck" tone="sky" title="Перевозок пока нет" text="ФИО клиента, телефон, откуда, куда, дата, время и модели." action={edit ? <ButtonLink href="/admin/work/logistics/deliveries/new" size="sm" variant="primary">Новая перевозка</ButtonLink> : undefined} /></div>}
        </>
      ) : null}

      {tab === "orders" ? (
        orders.length ? (
          <div className="ax-table-wrap">
            <table className="ax-table">
              <thead><tr><th>Заказ</th><th>Поставщик</th><th className="r">Сумма</th><th>Оплачено</th><th>Машин: отгружено / принято</th><th>Ожидаем</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/work/logistics/orders/${o.id}`} className="ax-strong">{o.order_number}</Link><div className="ax-small">{o.ordered_at ? date(o.ordered_at) : ""}</div></td>
                    <td>{o.supplier}</td>
                    <td className="r num ax-strong">{money(o.total_minor, o.currency as Currency)}</td>
                    <td style={{ minWidth: 130 }}><Progress value={o.paid_po_minor} max={o.total_minor || 1} /><div className="ax-small num">{o.total_minor ? Math.round((o.paid_po_minor / o.total_minor) * 100) : 0}% · {money(o.paid_po_minor, o.currency as Currency)}</div></td>
                    <td className="num">{o.shipped} / {o.received} из {o.qty}</td>
                    <td className="ax-small">{o.expected_at ? date(o.expected_at) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="ax-card"><Empty icon="truck" tone="sky" title="Заказов заводу пока нет" action={edit ? <ButtonLink href="/admin/work/logistics/orders/new" size="sm" variant="primary">Новый заказ заводу</ButtonLink> : undefined} /></div>
      ) : null}

      {tab === "suppliers" ? (
        suppliers.length ? (
          <div className="ax-table-wrap">
            <table className="ax-table">
              <thead><tr><th>Поставщик</th><th>Страна</th><th>Контакт</th><th>Условия</th></tr></thead>
              <tbody>{suppliers.map((s) => <tr key={s.id}><td className="ax-strong">{s.name}</td><td>{s.country}</td><td>{[s.contact_name, s.phone].filter(Boolean).join(" · ")}</td><td className="ax-small">{s.terms}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <div className="ax-card"><Empty icon="building" tone="green" title="Поставщиков пока нет" text="Добавьте завод Changfa и других поставщиков." action={edit ? <NewSupplierButton /> : undefined} /></div>
      ) : null}
    </>
  );
}
