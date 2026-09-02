import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsArticleClient } from "../../components/NewsArticleClient";
import { getNewsPost, getNewsPosts } from "../../lib/news";
import { getTractor } from "../../lib/catalog";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNewsPost(slug);
  if (!post) return { title: "Материал не найден — ATADAN" };
  return {
    title: `${post.title.ru} — ATADAN АгроЖурнал`,
    description: post.excerpt.ru,
    alternates: { canonical: `/news/${post.slug}` },
    openGraph: { title: post.title.ru, description: post.excerpt.ru, type: "article", publishedTime: post.publishedAt, images: [{ url: post.coverImage, alt: post.title.ru }] },
    twitter: { card: "summary_large_image", title: post.title.ru, description: post.excerpt.ru, images: [post.coverImage] },
  };
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getNewsPost(slug);
  if (!post) notFound();
  const [allPosts, tractor] = await Promise.all([getNewsPosts(), post.relatedTractorSlug ? getTractor(post.relatedTractorSlug) : Promise.resolve(null)]);
  const related = allPosts.filter((item) => item.slug !== post.slug && (item.category === post.category || item.tags.some((tag) => post.tags.includes(tag)))).slice(0, 3);
  const schema = { "@context": "https://schema.org", "@type": "Article", headline: post.title.ru, description: post.excerpt.ru, image: post.coverImage, datePublished: post.publishedAt, author: { "@type": "Organization", name: post.author }, publisher: { "@type": "Organization", name: "ATADAN Changfa" }, mainEntityOfPage: `/news/${post.slug}` };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /><NewsArticleClient post={post} related={related} tractor={tractor} /></>;
}
