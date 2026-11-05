import { requireSection } from "../../../../_lib/session";
import { POST_CATEGORIES } from "../../../../_lib/news-admin";
import { listModels } from "../../../../_lib/catalog-admin";
import { PageHeader } from "../../../../_ui/ui";
import { PostForm } from "../post-form";

export const metadata = { title: "Новая статья" };

export default async function NewPost() {
  const { actor } = await requireSection("/admin/marketing/news");
  const models = (await listModels()).filter((m) => m.status !== "archived").map((m) => ({ slug: m.slug, model: m.model }));
  const empty = { ru: "", ky: "", en: "" };
  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader title="Новая статья" subtitle="Черновик видите только вы и коллеги. Для публикации нужны заголовок, анонс, текст и обложка." />
      <PostForm
        categories={POST_CATEGORIES}
        models={models}
        initial={{ slug: "", category: "selection", status: "draft", featured: false, coverImage: "", gallery: [], publishedAt: new Date().toISOString().slice(0, 10), author: actor.display_name, relatedTractorSlug: "", sourceUrl: "", tags: "", title: { ...empty }, excerpt: { ...empty }, content: { ...empty } }}
      />
    </div>
  );
}
