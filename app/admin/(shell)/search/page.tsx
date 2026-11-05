import Link from "next/link";
import { Search } from "lucide-react";
import { getRawDb } from "../../../../db";
import { requireStaff } from "../../_lib/session";
import { canSee, NAV } from "../../_lib/nav";
import { ago } from "../../_lib/format";
import { Card, Empty, IconTile, PageHeader } from "../../_ui/ui";

export const metadata = { title: "Поиск" };

type Hit = { id: string; title: string; hint: string; href: string };

export default async function SearchPage({ searchParams }: PageProps<"/admin/search">) {
  const actor = await requireStaff("/admin/search");
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const can = (href: string) => canSee(actor, NAV.find((i) => i.href === href)!);
  const db = getRawDb();
  const like = `%${q.toLowerCase().replace(/[%_\\]/g, "")}%`;
  const digits = q.replace(/\D/g, "");
  const phoneLike = digits.length >= 4 ? `%${digits}%` : "__no_phone__";
  const own = actor.role === "owner" || actor.role === "director" || actor.role === "accountant";

  const groups: { key: string; title: string; icon: "users" | "tractor" | "inbox" | "cart"; tone: "sky" | "teal" | "terra" | "green"; hits: Hit[] }[] = [];
  if (q.length >= 2) {
    const [clients, units, leads] = await Promise.all([
      can("/admin/work/clients")
        ? db.prepare(`SELECT c.id, c.name, c.phone, c.region FROM crm_customers c WHERE c.archived=0 AND (lower(c.name) LIKE ? OR regexp_replace(c.phone,'\\D','','g') LIKE ?)
            ${own ? "" : "AND (c.assigned_to=? OR EXISTS (SELECT 1 FROM crm_deals d WHERE d.customer_id=c.id AND d.assigned_to=?))"} ORDER BY c.updated_at DESC LIMIT 8`)
            .bind(like, phoneLike, ...(own ? [] : [actor.id, actor.id])).all<{ id: string; name: string; phone: string; region: string }>()
        : null,
      can("/admin/work/stock")
        ? db.prepare(`SELECT id, vin, model, status FROM inventory_units_v2 WHERE archived=0 AND (lower(vin) LIKE ? OR lower(model) LIKE ?) ORDER BY updated_at DESC LIMIT 8`)
            .bind(like, like).all<{ id: string; vin: string; model: string; status: string }>()
        : null,
      can("/admin/work/leads")
        ? db.prepare(`SELECT id, name, phone, tractor_model, created_at FROM leads WHERE lower(name) LIKE ? OR regexp_replace(phone,'\\D','','g') LIKE ? ORDER BY created_at DESC LIMIT 8`)
            .bind(like, phoneLike).all<{ id: string; name: string; phone: string; tractor_model: string | null; created_at: string }>()
        : null,
    ]);
    if (clients?.results.length) groups.push({ key: "c", title: "Клиенты", icon: "users", tone: "sky", hits: clients.results.map((c) => ({ id: c.id, title: c.name, hint: [c.phone, c.region].filter(Boolean).join(" · "), href: `/admin/work/clients/${c.id}` })) });
    if (units?.results.length) groups.push({ key: "u", title: "Техника", icon: "tractor", tone: "teal", hits: units.results.map((u) => ({ id: u.id, title: `${u.model} · VIN ${u.vin}`, hint: u.status, href: `/admin/work/stock/${u.id}` })) });
    if (leads?.results.length) groups.push({ key: "l", title: "Заявки", icon: "inbox", tone: "terra", hits: leads.results.map((l) => ({ id: l.id, title: l.name, hint: [l.phone, l.tractor_model, ago(l.created_at)].filter(Boolean).join(" · "), href: `/admin/work/leads/${l.id}` })) });
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader title="Поиск" subtitle="Клиент, телефон, VIN или модель" />
      <form role="search" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input name="q" defaultValue={q} className="ax-input" placeholder="Например: Асан, 0555 12, CFJ2004 или последние цифры VIN" aria-label="Что найти" />
        <button className="ax-btn ax-btn-primary"><Search size={17} aria-hidden />Найти</button>
      </form>
      {q.length > 0 && q.length < 2 ? <p className="ax-small">Введите хотя бы 2 символа.</p> : null}
      {q.length >= 2 && !groups.length ? (
        <div className="ax-card"><Empty icon="list" tone="sky" title="Ничего не нашлось" text={`По запросу «${q}» нет клиентов, техники и заявок. Проверьте написание или поищите по телефону.`} /></div>
      ) : null}
      <div className="ax-grid">
        {groups.map((g) => (
          <Card key={g.key} title={<><IconTile icon={g.icon} tone={g.tone} small />{g.title}</>}>
            <div className="ax-list">
              {g.hits.map((h) => (
                <Link key={h.id} href={h.href} className="ax-list-row">
                  <span className="ax-row-body"><span className="ax-row-t">{h.title}</span><span className="ax-row-s">{h.hint}</span></span>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
      {q.length < 2 ? <p className="ax-small">Поиск по продажам и платежам появится вместе с новыми разделами «Продажи» и «Касса».</p> : null}
    </div>
  );
}
