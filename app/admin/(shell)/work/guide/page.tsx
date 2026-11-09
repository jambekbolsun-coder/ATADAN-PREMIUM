import Link from "next/link";
import { Search } from "lucide-react";
import { requireSection } from "../../../_lib/session";
import { canSee, findItem } from "../../../_lib/nav";
import { CHAPTERS, GUIDES, guideText } from "../../../_lib/guides";
import { Empty, PageHeader } from "../../../_ui/ui";
import { GuideCover } from "./covers";

export const metadata = { title: "Инструкции" };

export default async function Guide({ searchParams }: PageProps<"/admin/work/guide">) {
  const { actor } = await requireSection("/admin/work/guide");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase().slice(0, 60) : "";
  const allowed = GUIDES.filter((g) => { const item = g.href ? findItem(g.href.split("?")[0]) : undefined; return !item || canSee(actor, item); });
  const found = q ? allowed.filter((g) => guideText(g).includes(q)) : allowed;
  const shown = CHAPTERS.map((c) => ({ ...c, items: found.filter((g) => g.chapter === c.key) })).filter((c) => c.items.length);

  return (
    <div className="ax-guide">
      <PageHeader title="Инструкции" subtitle="Как работать в админке: коротко, по шагам и с картинками" />
      <form role="search" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input name="q" defaultValue={q} className="ax-input" placeholder="Например: поставщик, документ, продажа" aria-label="Поиск по инструкциям" />
        <button className="ax-btn"><Search size={16} aria-hidden />Найти</button>
      </form>
      {shown.length ? (
        <div className="ax-guide-grid">
          {shown.map((c) => (
            <section key={c.key} className="ax-card ax-card-flush ax-guide-chapter">
              <GuideCover id={c.key} />
              <div className="ax-guide-chapter-body">
                <h3>{c.title}</h3>
                <p className="ax-small">{c.hint}</p>
                <ul>
                  {c.items.map((g) => <li key={g.slug}><Link href={`/admin/work/guide/${g.slug}`}><b>{g.title}</b><span className="ax-small">{g.summary}</span></Link></li>)}
                </ul>
              </div>
            </section>
          ))}
        </div>
      ) : <div className="ax-card"><Empty icon="book" tone="lilac" title="Ничего не нашлось" text="Попробуйте другое слово." /></div>}
    </div>
  );
}
