import Link from "next/link";
import { Plus } from "lucide-react";
import { getRawDb } from "../../../../../db";
import { requireSection } from "../../../_lib/session";
import { isCompany } from "../../../_lib/sales";
import { sourceLabel } from "../../../_lib/dashboard";
import { dateTime } from "../../../_lib/format";
import { Badge, ButtonLink, Empty, PageHeader } from "../../../_ui/ui";
import { LeadActions } from "./lead-actions";

export const metadata = { title: "Заявки" };

type Lead = { id: string; name: string; phone: string; tractor_model: string | null; tractor_slug: string | null; source: string; status: string; message: string; created_at: string; assigned_to: string | null; assignee: string | null; sale_id: string | null; sale_number: string | null; reject_reason: string; wait_min: number; meeting_at: string | null; meeting_day: number | null };
const VIEWS = [
  { key: "new", label: "Новые", sql: "l.status='new'" },
  { key: "work", label: "В работе", sql: "l.status='contacted'" },
  { key: "closed", label: "Закрытые", sql: "l.status='closed'" },
] as const;

export default async function Leads({ searchParams }: PageProps<"/admin/work/leads">) {
  const { actor } = await requireSection("/admin/work/leads");
  const sp = await searchParams;
  const view = VIEWS.find((v) => v.key === sp.view) ?? VIEWS[0];
  const seller = actor.role !== "marketer";
  // Менеджер видит новые заявки (их может взять любой) и свои; остальные: все.
  const scope = isCompany(actor) || !seller ? "" : "AND (l.status='new' OR l.assigned_to=?)";
  const args = isCompany(actor) || !seller ? [] : [actor.id];
  const db = getRawDb();
  const [rows, counts] = await Promise.all([
    db.prepare(`SELECT l.id, l.name, l.phone, l.tractor_model, l.tractor_slug, l.source, l.status, l.message, l.created_at, l.assigned_to, s.display_name AS assignee, l.sale_id, o.number AS sale_number, COALESCE(l.reject_reason,'') AS reject_reason, (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - l.created_at))/60)::int AS wait_min, l.meeting_at, ((l.meeting_at AT TIME ZONE 'Asia/Bishkek')::date - (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bishkek')::date) AS meeting_day
        FROM leads l LEFT JOIN staff s ON s.id=l.assigned_to LEFT JOIN sale_orders o ON o.id=l.sale_id
        WHERE ${view.sql} ${scope} ORDER BY l.created_at ${view.key === "new" ? "ASC" : "DESC"} LIMIT 200`).bind(...args).all<Lead>(),
    db.prepare(`SELECT COUNT(*) FILTER (WHERE l.status='new')::int AS new, COUNT(*) FILTER (WHERE l.status='contacted')::int AS work, COUNT(*) FILTER (WHERE l.status='closed')::int AS closed FROM leads l WHERE 1=1 ${scope}`).bind(...args).first<Record<string, number>>(),
  ]);
  const mask = (phone: string) => (seller ? phone : phone.replace(/\d(?=\d{2})/g, "•"));

  return (
    <>
      <PageHeader
        title="Заявки"
        subtitle={view.key === "new" ? "Сначала самые старые: отвечайте в течение 15 минут" : "Заявки с сайта, WhatsApp, звонков и выставок"}
        actions={seller ? <ButtonLink href="/admin/work/leads/new" variant="primary"><Plus size={17} aria-hidden />Новая заявка</ButtonLink> : null}
      />
      <nav className="ax-tabs" aria-label="Статус заявки">
        {VIEWS.map((v) => <Link key={v.key} href={`/admin/work/leads?view=${v.key}`} aria-current={view.key === v.key ? "page" : undefined}>{v.label}<span>{counts?.[v.key] ?? 0}</span></Link>)}
      </nav>
      {rows.results.length === 0 ? (
        <div className="ax-card">
          <Empty icon="inbox" tone="teal" title={view.key === "new" ? "Новых заявок нет" : "Здесь пусто"} text={view.key === "new" ? "Заявки с сайта появятся здесь сразу. Звонок или визит добавьте кнопкой «Новая заявка»." : undefined} />
        </div>
      ) : (
        <div className="ax-grid" style={{ gap: 10 }}>
          {rows.results.map((l) => {
            const waiting = l.status === "new" ? Number(l.wait_min) : 0;
            return (
              <article key={l.id} className="ax-card" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <b style={{ fontSize: 15 }}>{l.name}</b>
                    <span className="ax-tag ax-c-teal">{sourceLabel(l.source)}</span>
                    {l.status === "new" ? <Badge tone={waiting > 15 ? "bad" : "warn"}>{waiting > 15 ? `ждёт ${waiting < 120 ? `${waiting} мин` : waiting < 2880 ? `${Math.floor(waiting / 60)} ч` : `${Math.floor(waiting / 1440)} дн`}` : "новая"}</Badge> : null}
                    {l.meeting_at && l.status !== "closed" ? <Badge tone={l.meeting_day === 0 ? "warn" : l.meeting_day !== null && l.meeting_day < 0 ? "mute" : "info"}>{l.meeting_day === 0 ? "встреча сегодня" : l.meeting_day === 1 ? "встреча завтра" : "встреча"} {dateTime(l.meeting_at)}</Badge> : null}
                    {l.sale_id ? <Link href={`/admin/work/sales/${l.sale_id}`}><Badge tone="good">Продажа {l.sale_number}</Badge></Link> : null}
                    {l.status === "closed" && !l.sale_id ? <Badge tone="mute">Отказ{l.reject_reason ? `: ${l.reject_reason}` : ""}</Badge> : null}
                  </div>
                  <div className="ax-small" style={{ marginTop: 3 }}>
                    {seller ? <a href={`tel:${l.phone}`} className="num">{l.phone}</a> : <span className="num">{mask(l.phone)}</span>}
                    {l.tractor_model ? ` · ${l.tractor_model}` : ""} · {dateTime(l.created_at)}{l.assignee ? ` · ${l.assignee}` : ""}
                  </div>
                  {l.message ? <div className="ax-small" style={{ marginTop: 4, color: "var(--text)", whiteSpace: "pre-line" }}>{l.message}</div> : null}
                </div>
                {seller ? <LeadActions leadId={l.id} status={l.status} hasSale={!!l.sale_id} phone={l.phone} /> : null}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
