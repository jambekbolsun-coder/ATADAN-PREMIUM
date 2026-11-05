import Link from "next/link";
import { Search, Truck } from "lucide-react";
import { requireSection, seesCost } from "../../../_lib/session";
import { listUnits, UNIT_STATUS, UNIT_VIEWS, canLogistics } from "../../../_lib/stock";
import { money } from "../../../_lib/format";
import { Badge, ButtonLink, Empty, PageHeader } from "../../../_ui/ui";

export const metadata = { title: "Техника" };

export default async function Stock({ searchParams }: PageProps<"/admin/work/stock">) {
  const { actor } = await requireSection("/admin/work/stock");
  const sp = await searchParams;
  const view = typeof sp.view === "string" ? sp.view : "all";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const { rows, counts } = await listUnits(view, q);
  const cost = seesCost(actor);
  const href = (v: string) => `/admin/work/stock?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageHeader
        title="Техника"
        subtitle="Каждая машина по VIN: где она, сколько стоила, кому продана"
        actions={canLogistics(actor) ? <ButtonLink href="/admin/work/logistics" variant="primary"><Truck size={17} aria-hidden />Поставки и приём</ButtonLink> : null}
      />
      <nav className="ax-tabs" aria-label="Статус техники">
        {UNIT_VIEWS.map((v) => <Link key={v.key} href={href(v.key)} aria-current={view === v.key || (!UNIT_VIEWS.some((x) => x.key === view) && v.key === "all") ? "page" : undefined}>{v.label}<span>{counts[v.key] ?? 0}</span></Link>)}
      </nav>
      <form role="search" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input type="hidden" name="view" value={view} />
        <input name="q" defaultValue={q} className="ax-input" style={{ maxWidth: 320 }} placeholder="VIN, модель, место" aria-label="Поиск техники" />
        <button className="ax-btn"><Search size={16} aria-hidden />Найти</button>
      </form>
      {rows.length ? (
        <div className="ax-table-wrap">
          <table className="ax-table">
            <thead><tr><th>VIN</th><th>Модель</th><th>Статус</th><th>Где</th><th className="r">Дней на складе</th>{cost ? <th className="r">Себестоимость</th> : null}<th className="r">Цена прайса</th><th>Продажа</th></tr></thead>
            <tbody>
              {rows.map((u) => {
                const st = UNIT_STATUS[u.status] ?? { label: u.status, tone: "mute" as const };
                return (
                  <tr key={u.id}>
                    <td className="num"><Link href={`/admin/work/stock/${u.id}`} className="ax-strong">…{u.vin.slice(-6)}</Link><div className="ax-small">{u.vin}</div></td>
                    <td>{u.model}{u.damage_note ? <div><Badge tone="bad">Повреждена</Badge></div> : null}</td>
                    <td><Badge tone={u.written_off_at ? "mute" : st.tone}>{u.written_off_at ? "Списана" : st.label}</Badge>{u.status === "stock" && !u.pdi_done_at ? <div className="ax-small">без PDI</div> : null}</td>
                    <td className="ax-small">{u.location || (u.shipment ? `поставка ${u.shipment}` : "не указано")}</td>
                    <td className={`r num ax-strong ${u.days !== null && u.days > 90 ? "ax-down" : ""}`}>{u.days ?? ""}</td>
                    {cost ? <td className="r num">{u.landed_cost_minor ? money(u.landed_cost_minor) : <span className="ax-small">нет данных</span>}</td> : null}
                    <td className="r num">{u.list_price_minor ? money(u.list_price_minor) : ""}</td>
                    <td>{u.sale_id ? <Link href={`/admin/work/sales/${u.sale_id}`} className="ax-strong" style={{ color: "var(--brand)" }}>{u.sale_number}</Link> : null}<div className="ax-small">{u.customer ?? ""}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ax-card"><Empty icon="tractor" tone="teal" title={q ? "Ничего не нашлось" : "Здесь пока пусто"} text={q ? "Проверьте VIN или модель." : "Машины появляются, когда вы создаёте поставку по заказу заводу."} action={canLogistics(actor) ? <ButtonLink href="/admin/work/logistics" size="sm">Открыть логистику</ButtonLink> : undefined} /></div>
      )}
      <p className="ax-small" style={{ marginTop: 10 }}>Наличие на сайте считается из этой таблицы автоматически. Себестоимость = закупка по курсу + доля расходов поставки.</p>
    </>
  );
}
