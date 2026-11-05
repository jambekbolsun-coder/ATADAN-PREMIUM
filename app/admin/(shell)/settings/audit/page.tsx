import Link from "next/link";
import { Search } from "lucide-react";
import { getRawDb } from "../../../../../db";
import { requireSection } from "../../../_lib/session";
import { dateTime } from "../../../_lib/format";
import { Empty, PageHeader } from "../../../_ui/ui";

export const metadata = { title: "Журнал действий" };

export default async function Audit({ searchParams }: PageProps<"/admin/settings/audit">) {
  await requireSection("/admin/settings/audit");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? String(sp[k]).slice(0, 80) : "");
  const page = Math.max(1, Number(str("page")) || 1);
  const where = ["1=1"], args: unknown[] = [];
  if (str("who")) { where.push("l.actor_id=?"); args.push(str("who")); }
  if (str("q")) { const like = `%${str("q").toLowerCase().replace(/[%_\\]/g, "")}%`; where.push("(lower(l.action) LIKE ? OR lower(l.detail) LIKE ? OR lower(l.entity_id) LIKE ?)"); args.push(like, like, like); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str("from"))) { where.push("l.created_at >= ?::date"); args.push(str("from")); }
  const db = getRawDb();
  const [rows, staff] = await Promise.all([
    db.prepare(`SELECT l.id, l.action, l.entity_id, l.detail, l.created_at, s.display_name AS who FROM audit_logs l LEFT JOIN staff s ON s.id=l.actor_id WHERE ${where.join(" AND ")} ORDER BY l.created_at DESC LIMIT 101 OFFSET ${(page - 1) * 100}`).bind(...args).all<{ id: string; action: string; entity_id: string; detail: string; created_at: string; who: string | null }>(),
    db.prepare("SELECT id, display_name FROM staff WHERE active>=0 ORDER BY display_name").all<{ id: string; display_name: string }>(),
  ]);
  const list = rows.results.slice(0, 100);
  const qs = (p: number) => { const u = new URLSearchParams(); for (const k of ["who", "q", "from"]) if (str(k)) u.set(k, str(k)); u.set("page", String(p)); return `/admin/settings/audit?${u}`; };
  return (
    <>
      <PageHeader title="Журнал действий" subtitle="Кто, что и когда изменил. Записи не редактируются и не удаляются." actions={<a className="ax-btn" href="/api/admin/export?type=audit">Скачать в Excel</a>} />
      <form role="search" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <select name="who" defaultValue={str("who")} className="ax-input" style={{ maxWidth: 220 }} aria-label="Сотрудник"><option value="">Все сотрудники</option>{staff.results.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}</select>
        <input type="date" name="from" defaultValue={str("from")} className="ax-input" style={{ maxWidth: 170 }} aria-label="С даты" />
        <input name="q" defaultValue={str("q")} className="ax-input" style={{ maxWidth: 240 }} placeholder="Действие, номер, VIN" aria-label="Поиск" />
        <button className="ax-btn"><Search size={16} aria-hidden />Показать</button>
      </form>
      {list.length ? (
        <div className="ax-card" style={{ padding: 0 }}>
          <div className="ax-list">
            {list.map((r) => (
              <div key={r.id} className="ax-list-row" style={{ padding: "10px 16px" }}>
                <span className="ax-row-body">
                  <span className="ax-row-t">{r.action} <span className="ax-small num">{r.entity_id?.length > 40 ? `${r.entity_id.slice(0, 8)}…` : r.entity_id}</span></span>
                  <span className="ax-row-s">{dateTime(r.created_at)} · {r.who ?? "система"}{r.detail ? ` · ${r.detail}` : ""}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : <div className="ax-card"><Empty icon="list" title="Записей нет" /></div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
        {page > 1 ? <Link className="ax-btn" href={qs(page - 1)}>← Назад</Link> : null}
        {rows.results.length > 100 ? <Link className="ax-btn" href={qs(page + 1)}>Ещё →</Link> : null}
      </div>
    </>
  );
}
