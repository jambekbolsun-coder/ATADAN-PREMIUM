import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSection } from "../../../_lib/session";
import { listPosts, POST_CATEGORIES, POST_STATUS } from "../../../_lib/news-admin";
import { date } from "../../../_lib/format";
import { Badge, ButtonLink, Empty, PageHeader } from "../../../_ui/ui";

export const metadata = { title: "Публикации" };
const TABS = [{ key: "", label: "Все" }, { key: "published", label: "Опубликовано" }, { key: "draft", label: "Черновики" }, { key: "archived", label: "Архив" }];

export default async function News({ searchParams }: PageProps<"/admin/marketing/news">) {
  await requireSection("/admin/marketing/news");
  const sp = await searchParams;
  const tab = typeof sp.status === "string" ? sp.status : "";
  const all = await listPosts();
  const rows = tab ? all.filter((p) => p.status === tab) : all.filter((p) => p.status !== "archived");
  const count = (k: string) => (k ? all.filter((p) => p.status === k).length : all.filter((p) => p.status !== "archived").length);

  return (
    <>
      <PageHeader title="Публикации" subtitle="АгроЖурнал на atadan.kg: советы, новости, истории клиентов" actions={<ButtonLink href="/admin/marketing/news/new" variant="primary"><Plus size={17} aria-hidden />Новая статья</ButtonLink>} />
      <nav className="ax-tabs" aria-label="Статус">{TABS.map((t) => <Link key={t.key} href={`/admin/marketing/news${t.key ? `?status=${t.key}` : ""}`} aria-current={tab === t.key ? "page" : undefined}>{t.label}<span>{count(t.key)}</span></Link>)}</nav>
      {rows.length ? (
        <div className="ax-grid ax-g3">
          {rows.map((p) => (
            <Link key={p.slug} href={`/admin/marketing/news/${p.slug}`} className="ax-card" style={{ padding: 0, overflow: "hidden", display: "grid" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.coverImage ? <img src={p.coverImage} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", background: "var(--surface-2)" }} /> : <span style={{ aspectRatio: "16/9", background: "var(--surface-2)", display: "grid", placeItems: "center" }} className="ax-small">нет обложки</span>}
              <span style={{ padding: "12px 14px", display: "grid", gap: 6 }}>
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Badge tone={POST_STATUS[p.status].tone}>{POST_STATUS[p.status].label}</Badge>{p.featured ? <Badge tone="info">главная</Badge> : null}<span className="ax-small">{POST_CATEGORIES[p.category]}</span></span>
                <b style={{ lineHeight: 1.3 }}>{p.title.ru}</b>
                <span className="ax-small">{date(p.publishedAt)} · {p.readingMinutes} мин · {p.views} просмотров{!p.title.ky || !p.title.en ? " · нет перевода" : ""}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : <div className="ax-card"><Empty icon="news" tone="sky" title="Статей нет" text="Напишите первую: как выбрать трактор, история клиента, новости поставок." action={<ButtonLink href="/admin/marketing/news/new" variant="primary">Новая статья</ButtonLink>} /></div>}
    </>
  );
}
