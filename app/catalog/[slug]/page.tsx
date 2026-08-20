import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "../../components/ProductDetailClient";
import { getCatalog, getTractor } from "../../lib/catalog";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tractor = await getTractor(slug);
  if (!tractor) return { title: "Модель не найдена | ATADAN" };
  return { title: `Changfa ${tractor.model} — ${tractor.hp} л.с. | ATADAN`, description: tractor.description, openGraph: { title: `Changfa ${tractor.model}`, description: tractor.description, images: tractor.imageUrl ? [{ url: tractor.imageUrl, alt: `Changfa ${tractor.model}` }] : [] }, twitter: { card: "summary_large_image", title: `Changfa ${tractor.model}`, description: tractor.description, images: tractor.imageUrl ? [tractor.imageUrl] : [] } };
}

export async function generateStaticParams() { return (await getCatalog()).map((tractor) => ({ slug: tractor.slug })); }

export default async function TractorDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tractor = await getTractor(slug);
  if (!tractor) notFound();
  const catalog = await getCatalog();
  const related = catalog.filter((item) => item.slug !== tractor.slug).sort((a, b) => Math.abs(a.hp - tractor.hp) - Math.abs(b.hp - tractor.hp)).slice(0, 3);
  return <ProductDetailClient tractor={tractor} related={related} />;
}
