import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "../../../../_lib/session";
import { canSee, findItem } from "../../../../_lib/nav";
import { CHAPTERS, findGuide, GUIDES, type Block } from "../../../../_lib/guides";
import { ButtonLink, Notice, PageHeader } from "../../../../_ui/ui";

function Piece({ b }: { b: Block }) {
  if (b.t === "p") return <p>{b.text}</p>;
  if (b.t === "steps") return <ol className="ax-guide-steps">{b.items.map((s) => <li key={s}>{s}</li>)}</ol>;
  if (b.t === "list") return <ul className="ax-guide-list">{b.items.map((s) => <li key={s}>{s}</li>)}</ul>;
  if (b.t === "tip") return <Notice tone="info">{b.text}</Notice>;
  if (b.t === "warn") return <Notice tone="warn">{b.text}</Notice>;
  const src = `/images/admin-guide/${b.img}.jpg`;
  return (
    <figure className="ax-guide-shot">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <a href={src} target="_blank" rel="noreferrer"><img src={src} alt={b.alt} loading="lazy" /></a>
      {b.legend?.length ? <figcaption><ol>{b.legend.map((s) => <li key={s}>{s}</li>)}</ol></figcaption> : null}
    </figure>
  );
}

export async function generateMetadata({ params }: PageProps<"/admin/work/guide/[slug]">) {
  const { slug } = await params;
  return { title: findGuide(slug)?.title ?? "Инструкция" };
}

export default async function GuideArticle({ params }: PageProps<"/admin/work/guide/[slug]">) {
  const { actor } = await requireSection("/admin/work/guide");
  const { slug } = await params;
  const g = findGuide(slug);
  if (!g) notFound();
  const visible = (h?: string) => { const item = h ? findItem(h.split("?")[0]) : undefined; return !item || canSee(actor, item); };
  if (!visible(g.href)) notFound();
  const same = GUIDES.filter((x) => x.chapter === g.chapter && visible(x.href));
  const next = same[same.findIndex((x) => x.slug === g.slug) + 1];
  const chapter = CHAPTERS.find((c) => c.key === g.chapter);

  return (
    <article className="ax-guide-article">
      <PageHeader title={g.title} subtitle={g.summary} actions={g.href && g.action ? <ButtonLink href={g.href} variant="primary">{g.action}</ButtonLink> : null} />
      <p className="ax-small" style={{ marginTop: -6 }}><Link href="/admin/work/guide">Все инструкции</Link> / {chapter?.title}</p>
      {g.blocks.map((b, i) => <Piece key={i} b={b} />)}
      {next ? <Link href={`/admin/work/guide/${next.slug}`} className="ax-card ax-guide-next"><span className="ax-small">Следующая инструкция</span><b>{next.title}</b></Link> : null}
    </article>
  );
}
