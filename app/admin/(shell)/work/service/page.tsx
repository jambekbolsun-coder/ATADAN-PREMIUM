import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireSection } from "../../../_lib/session";
import { listTickets, SERVICE_KIND, SERVICE_STATUS, ticketCounts } from "../../../_lib/service";
import { date } from "../../../_lib/format";
import { Badge, ButtonLink, Empty, PageHeader } from "../../../_ui/ui";

export const metadata = { title: "Сервис и гарантия" };

export default async function Service({ searchParams }: PageProps<"/admin/work/service">) {
  const { actor } = await requireSection("/admin/work/service");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "open";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const mine = sp.mine === "1";
  const [rows, counts] = await Promise.all([listTickets({ status, q, mine: mine ? actor.id : undefined }), ticketCounts()]);
  const open = Object.entries(counts).filter(([k]) => k !== "closed" && k !== "rejected").reduce((a, [, n]) => a + n, 0);
  const today = new Date().toISOString().slice(0, 10);
  const tabs = [{ k: "open", l: "Открытые", n: open }, { k: "new", l: "Новые", n: counts.new ?? 0 }, { k: "waiting_parts", l: "Ждём запчасти", n: counts.waiting_parts ?? 0 }, { k: "done", l: "Ждут клиента", n: counts.done ?? 0 }, { k: "closed", l: "Закрытые", n: counts.closed ?? 0 }];
  const href = (patch: Record<string, string>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries({ status, q, mine: mine ? "1" : "", ...patch })) if (v) p.set(k, v); return `/admin/work/service?${p}`; };

  return (
    <>
      <PageHeader title="Сервис и гарантия" subtitle="Обращения по проданной технике: гарантия, платный ремонт, ТО и предпродажная подготовка" actions={<ButtonLink href="/admin/work/service/new" variant="primary"><Plus size={17} aria-hidden />Новое обращение</ButtonLink>} />
      <nav className="ax-tabs" aria-label="Статус">{tabs.map((t) => <Link key={t.k} href={href({ status: t.k })} aria-current={status === t.k ? "page" : undefined}>{t.l}<span>{t.n}</span></Link>)}</nav>
      <form role="search" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input type="hidden" name="status" value={status} />
        <input name="q" defaultValue={q} className="ax-input" style={{ maxWidth: 280 }} placeholder="Номер, клиент, VIN" aria-label="Поиск" />
        <label className="ax-btn" style={{ cursor: "pointer" }}><input type="checkbox" name="mine" value="1" defaultChecked={mine} /> Мои</label>
        <button className="ax-btn"><Search size={16} aria-hidden />Найти</button>
      </form>
      {rows.length ? (
        <div className="ax-card" style={{ padding: 0 }}>
          <div className="ax-list">
            {rows.map((t) => {
              const late = t.due_at && t.due_at < today && !["done", "closed", "rejected"].includes(t.status);
              return (
                <Link key={t.id} href={`/admin/work/service/${t.id}`} className="ax-list-row" style={{ padding: "12px 16px", flexWrap: "wrap" }}>
                  <span className="ax-row-body" style={{ minWidth: 220, flex: 1 }}>
                    <span className="ax-row-t"><span className="num">{t.number}</span> · {t.customer ?? "без клиента"} <Badge tone={SERVICE_STATUS[t.status]?.tone}>{SERVICE_STATUS[t.status]?.label}</Badge>{late ? <> <Badge tone="bad">срок прошёл</Badge></> : null}</span>
                    <span className="ax-row-s">{SERVICE_KIND[t.kind]} · {t.model ?? ""}{t.vin ? ` · VIN ${t.vin}` : ""} · {t.issue.slice(0, 90)}</span>
                  </span>
                  <span className="ax-small" style={{ textAlign: "right" }}>{date(t.opened_at)}{t.assignee ? <div>{t.assignee}</div> : null}{t.due_at ? <div>срок {date(t.due_at)}</div> : null}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : <div className="ax-card"><Empty icon="wrench" tone="lilac" title="Обращений нет" text="Когда клиент позвонит с поломкой или придёт на ТО, создайте обращение по VIN машины." action={<ButtonLink href="/admin/work/service/new" variant="primary">Новое обращение</ButtonLink>} /></div>}
    </>
  );
}
