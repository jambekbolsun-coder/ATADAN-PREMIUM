import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsArticleClient } from "../../components/NewsArticleClient";
import { getNewsPost, getNewsPosts } from "../../lib/news";
import { getTractor } from "../../lib/catalog";
import { getRequestLocale } from "../../lib/locale-server";
import { jsonLd, publicMetadata, SITE_URL } from "../../lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [post,locale] = await Promise.all([getNewsPost(slug),getRequestLocale()]);
  if (!post) return { title: "Материал не найден: ATADAN",robots:{index:false,follow:false} };
  return publicMetadata({path:`/news/${post.slug}`,locale,title:`${post.title[locale]} | ATADAN`,description:post.excerpt[locale],image:post.coverImage,type:"article",publishedTime:post.publishedAt});
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getNewsPost(slug);
  if (!post) notFound();
  const [allPosts, tractor] = await Promise.all([getNewsPosts(), post.relatedTractorSlug ? getTractor(post.relatedTractorSlug) : Promise.resolve(null)]);
  const related = allPosts.filter((item) => item.slug !== post.slug && (item.category === post.category || item.tags.some((tag) => post.tags.includes(tag)))).slice(0, 3);
  const locale=await getRequestLocale();
  const schema = { "@context": "https://schema.org", "@type": "Article", headline: post.title[locale], description: post.excerpt[locale], image: new URL(post.coverImage,SITE_URL).toString(), datePublished: post.publishedAt, inLanguage:locale, author: { "@type": "Organization", name: post.author }, publisher: { "@type": "Organization", name: "ATADAN" }, mainEntityOfPage: new URL(`/news/${post.slug}`,SITE_URL).toString() };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} /><NewsArticleClient post={post} related={related} tractor={tractor} /></>;
}
