import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireSection } from "../../../../_lib/session";
import { getPost, POST_CATEGORIES, POST_STATUS } from "../../../../_lib/news-admin";
import { listModels } from "../../../../_lib/catalog-admin";
import { deletePostAction, postStatusAction } from "../../../../_lib/marketing-actions";
import { ActionButton } from "../../../../_ui/forms";
import { Badge, Notice, PageHeader } from "../../../../_ui/ui";
import { PostForm } from "../post-form";

export const metadata = { title: "Статья" };

export default async function PostCard({ params, searchParams }: PageProps<"/admin/marketing/news/[slug]">) {
  await requireSection("/admin/marketing/news");
  const { slug } = await params;
  const sp = await searchParams;
  const p = await getPost(slug);
  if (!p) notFound();
  const models = (await listModels()).filter((m) => m.status !== "archived").map((m) => ({ slug: m.slug, model: m.model }));
  const st = POST_STATUS[p.status];
  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        title={<>{p.title.ru} <Badge tone={st.tone}>{st.label}</Badge></>}
        subtitle={<>{p.views} просмотров{p.status === "published" ? <> · <a href={`/news/${p.slug}`} target="_blank" rel="noreferrer" style={{ color: "var(--brand)" }}>открыть на сайте <ExternalLink size={13} aria-hidden /></a></> : null}</>}
        actions={
          <>
            {p.status === "published" ? <ActionButton label="Снять с сайта" action={postStatusAction.bind(null, p.slug, "draft")} confirm="Статья пропадёт из журнала и станет черновиком." /> : null}
            {p.status !== "archived" ? <ActionButton label="В архив" action={postStatusAction.bind(null, p.slug, "archived")} confirm="Статья уйдёт в архив и пропадёт с сайта." /> : <ActionButton label="Вернуть в черновики" action={postStatusAction.bind(null, p.slug, "draft")} />}
            <ActionButton variant="danger" label="Удалить" action={deletePostAction.bind(null, p.slug)} confirm="Удалить статью? Вернуть её можно будет только из резервной копии." />
          </>
        }
      />
      {sp.saved ? <div style={{ marginBottom: 12 }}><Notice tone="good">Сохранено.</Notice></div> : null}
      <PostForm
        originalSlug={p.slug}
        published={p.status === "published"}
        categories={POST_CATEGORIES}
        models={models}
        initial={{ slug: p.slug, category: p.category, status: p.status, featured: p.featured, coverImage: p.coverImage, gallery: p.gallery ?? [], publishedAt: p.publishedAt, author: p.author, relatedTractorSlug: p.relatedTractorSlug ?? "", sourceUrl: p.sourceUrl ?? "", tags: p.tags.join(", "), title: p.title, excerpt: p.excerpt, content: p.content }}
      />
    </div>
  );
}
