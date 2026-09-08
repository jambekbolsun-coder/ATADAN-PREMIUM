import { seedNews } from "../data/news";
import type { NewsPost } from "../types";

export async function getNewsPosts(includeUnpublished = false): Promise<NewsPost[]> {
  let posts = [...seedNews];
  try {
    const { ensureDb, getRawDb } = await import("../../db");
    await ensureDb();
    const result = await getRawDb().prepare("SELECT slug, data_json, is_deleted FROM news_posts")
      .all<{ slug: string; data_json: string; is_deleted: number }>();
    const rows = result.results as Array<{ slug: string; data_json: string; is_deleted: number }>;
    const changes = new Map<string, { slug: string; data_json: string; is_deleted: number }>(rows.map((row) => [row.slug, row]));
    posts = [];
    for (const post of seedNews) {
      const change = changes.get(post.slug);
      if (change?.is_deleted) continue;
      posts.push(change ? { ...post, ...JSON.parse(change.data_json) } : post);
      changes.delete(post.slug);
    }
    for (const change of changes.values()) {
      if (!change.is_deleted) posts.push(JSON.parse(change.data_json));
    }
  } catch {
    posts = [...seedNews];
  }

  return posts
    .filter((post) => includeUnpublished || post.status === "published")
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.publishedAt.localeCompare(a.publishedAt));
}

export async function getNewsPost(slug: string, includeUnpublished = false) {
  const posts = await getNewsPosts(includeUnpublished);
  return posts.find((post) => post.slug === slug) ?? null;
}
