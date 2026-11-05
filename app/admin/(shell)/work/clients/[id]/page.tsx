import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, MessageCircle } from "lucide-react";
import { getRawDb } from "../../../../../../db";
import { requireSection } from "../../../../_lib/session";
import { isCompany, METHOD, statusLabel, type SaleRow } from "../../../../_lib/sales";
import { sourceLabel } from "../../../../_lib/dashboard";
import { date, dateTime, money } from "../../../../_lib/format";
import { Badge, ButtonLink, Card, Empty, PageHeader, Tag } from "../../../../_ui/ui";

export const metadata = { title: "Клиент" };

export default async function ClientCard({ params }: PageProps<"/admin/work/clients/[id]">) {
  const { actor } = await requireSection("/admin/work/clients");
  const { id } = await params;
  const db = getRawDb();
  const company = isCompany(actor);
  const client = await db
    .prepare(`SELECT c.id, c.name, c.phone, c.email, c.region, c.notes, c.source, c.created_at, s.display_name AS manager FROM crm_customers c LEFT JOIN staff s ON s.id=c.assigned_to
      WHERE c.id=? AND c.archived=0 ${company ? "" : "AND (c.assigned_to=? OR EXISTS (SELECT 1 FROM sale_orders o WHERE o.customer_id=c.id AND o.manager_id=?))"}`)
    .bind(id, ...(company ? [] : [actor.id, actor.id]))
    .first<{ id: string; name: string; phone: string; email: string; region: string; notes: string; source: string; created_at: string; manager: string | null }>();
  if (!client) notFound();
  const [sales, units, leads] = await Promise.all([
    db.prepare(`SELECT o.id, o.number, o.status, o.sold_at, o.currency, o.payment_method, o.bank_decision, o.total_minor,
        COALESCE((SELECT SUM(CASE WHEN p.direction='in' THEN p.amount_sale_minor ELSE -p.amount_sale_minor END) FROM sale_payments p WHERE p.sale_id=o.id AND p.status='posted'),0)::bigint AS paid_minor,
        COALESCE((SELECT string_agg(i.title, ', ') FROM sale_order_items i WHERE i.sale_id=o.id AND i.active=1),'') AS items
      FROM sale_orders o WHERE o.customer_id=? ${company ? "" : "AND o.manager_id=?"} ORDER BY o.sold_at DESC`).bind(id, ...(company ? [] : [actor.id])).all<SaleRow>(),
    db.prepare(`SELECT u.id, u.model, u.vin, o.delivered_at, o.number FROM sale_order_items i JOIN sale_orders o ON o.id=i.sale_id JOIN inventory_units_v2 u ON u.id=i.inventory_unit_id
      WHERE o.customer_id=? AND i.active=1 AND o.delivered_at IS NOT NULL ORDER BY o.delivered_at DESC`).bind(id).all<{ id: string; model: string; vin: string; delivered_at: string; number: string }>(),
    db.prepare(`SELECT l.id, l.source, l.tractor_model, l.created_at, l.status, COALESCE(l.reject_reason,'') AS reject_reason FROM leads l
      WHERE regexp_replace(l.phone,'\\D','','g')=regexp_replace(?,'\\D','','g') ORDER BY l.created_at DESC LIMIT 20`).bind(client.phone).all<{ id: string; source: string; tractor_model: string | null; created_at: string; status: string; reject_reason: string }>(),
  ]);
  const rows = sales.results.map((s) => ({ ...s, total_minor: Number(s.total_minor), paid_minor: Number(s.paid_minor) }));
  const debtBy = (cur: string) => rows.filter((s) => s.currency === cur && (s.status === "booked" || s.status === "delivered")).reduce((sum, s) => sum + Math.max(0, s.total_minor - s.paid_minor), 0);
  const debtUsd = debtBy("USD"), debtKgs = debtBy("KGS");
  const wa = client.phone.replace(/\D/g, "");

  return (
    <>
      <PageHeader
        title={client.name}
        subtitle={<>{client.region || "регион не указан"} · клиент с {date(client.created_at)}{client.manager ? ` · менеджер ${client.manager}` : ""}</>}
        actions={<>
          <a className="ax-btn" href={`tel:${client.phone}`}><Phone size={16} aria-hidden />Позвонить</a>
          {wa.length >= 9 ? <a className="ax-btn" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><MessageCircle size={16} aria-hidden />WhatsApp</a> : null}
          <ButtonLink href="/admin/work/sales/new" variant="primary">Новая продажа</ButtonLink>
        </>}
      />
      <div className="ax-grid ax-g-main">
        <div className="ax-grid" style={{ alignContent: "start" }}>
          <Card title="Покупки" flush>
            {rows.length ? (
              <div className="ax-table-wrap" style={{ border: 0, borderRadius: 0 }}>
                <table className="ax-table">
                  <tbody>
                    {rows.map((s) => {
                      const st = statusLabel(s);
                      return (
                        <tr key={s.id}>
                          <td><Link href={`/admin/work/sales/${s.id}`} className="ax-strong">{s.number}</Link><div className="ax-small">{date(s.sold_at)}</div></td>
                          <td style={{ maxWidth: 280 }}>{s.items}</td>
                          <td><Tag tone={METHOD[s.payment_method].tone}>{METHOD[s.payment_method].short}</Tag></td>
                          <td className="r num ax-strong">{money(s.total_minor, s.currency)}</td>
                          <td><Badge tone={st.tone}>{st.label}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <Empty icon="cart" title="Покупок пока нет" action={<ButtonLink href="/admin/work/sales/new" size="sm" variant="primary">Оформить продажу</ButtonLink>} />}
          </Card>
          <Card title="Техника клиента">
            {units.results.length ? (
              <div className="ax-list">
                {units.results.map((u) => <Link key={u.id} href={`/admin/work/stock/${u.id}`} className="ax-list-row"><span className="ax-row-body"><span className="ax-row-t">{u.model}</span><span className="ax-row-s num">VIN {u.vin} · выдана {date(u.delivered_at)} · {u.number}</span></span></Link>)}
              </div>
            ) : <p className="ax-small" style={{ margin: 0 }}>Выданной техники нет. Здесь будет история для сервиса и гарантии.</p>}
          </Card>
        </div>
        <div className="ax-grid" style={{ alignContent: "start" }}>
          <Card title="Контакты">
            <dl className="ax-kv">
              <dt>Телефон</dt><dd className="num">{client.phone}</dd>
              {client.email ? <><dt>Email</dt><dd>{client.email}</dd></> : null}
              <dt>Откуда пришёл</dt><dd>{sourceLabel(client.source)}</dd>
            </dl>
            {client.notes ? <p className="ax-small" style={{ marginBottom: 0 }}>{client.notes}</p> : null}
          </Card>
          <Card title="Долг">
            {debtUsd || debtKgs ? <div className="num ax-down" style={{ fontSize: 20, fontWeight: 700 }}>{[debtUsd ? money(debtUsd, "USD") : "", debtKgs ? money(debtKgs) : ""].filter(Boolean).join(" + ")}</div> : <p className="ax-small" style={{ margin: 0 }}>Долгов нет.</p>}
          </Card>
          <Card title="Обращения">
            {leads.results.length ? (
              <ol className="ax-tl">
                {leads.results.map((l) => <li key={l.id}>{sourceLabel(l.source)}{l.tractor_model ? ` · ${l.tractor_model}` : ""}{l.reject_reason ? ` · отказ: ${l.reject_reason}` : ""}<small>{dateTime(l.created_at)}</small></li>)}
              </ol>
            ) : <p className="ax-small" style={{ margin: 0 }}>Заявок не было.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
