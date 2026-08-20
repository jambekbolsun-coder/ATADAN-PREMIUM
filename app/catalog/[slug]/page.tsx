import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BadgeCheck, Banknote, Gauge, MessageCircle, ShieldCheck, Sprout, Wrench } from "lucide-react";
import { LeadForm } from "../../components/LeadForm";
import { ScrollStudio } from "../../components/ScrollStudio";
import { TractorCard } from "../../components/TractorCard";
import { getCatalog, getTractor } from "../../lib/catalog";
import { formatPrice } from "../../lib/format";

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
  return <main>
    <section className="product-hero section-shell"><div className="product-breadcrumb"><Link href="/catalog"><ArrowLeft size={16} />Каталог</Link><span>/</span><span>{tractor.model}</span></div><div className="product-hero-grid"><div className="product-visual"><span className={`stock-badge ${tractor.inStock ? "available" : "order"}`}>{tractor.inStock ? "В наличии" : "Под заказ"}</span><Image src={tractor.image} alt={`Трактор Changfa ${tractor.model}`} width={900} height={690} priority sizes="(max-width: 900px) 100vw, 58vw" /></div><div className="product-summary"><span className="section-label">{tractor.category}</span><h1>Changfa<br />{tractor.model}</h1><p>{tractor.description}</p><div className="product-price"><span>Стоимость</span><strong>{formatPrice(tractor.price)}</strong><small>Доступна рассрочка · точный расчёт после заявки</small></div><div className="product-actions"><a className="primary-btn" href="#request"><MessageCircle size={18} /> Получить предложение</a><a className="outline-btn" href="tel:+996706131404">Позвонить</a></div></div></div></section>
    <section className="key-specs section-shell"><article><Gauge /><span>Мощность</span><strong>{tractor.hp} л.с.</strong></article><article><Sprout /><span>Рекомендуемая площадь</span><strong>{tractor.farmArea}</strong></article><article><BadgeCheck /><span>Привод</span><strong>4×4</strong></article><article><Banknote /><span>Финансирование</span><strong>Рассрочка</strong></article></section>
    <section className="product-story section-shell"><div><span className="section-label">Комфорт весь день</span><h2>Рабочее место, в котором всё под рукой</h2><p>{tractor.comfort}. Продуманная эргономика помогает меньше уставать и сохранять точность управления в течение длинной смены.</p><ul><li><ShieldCheck />Широкий круговой обзор</li><li><Wrench />Удобный доступ к сервисным узлам</li><li><BadgeCheck />Надёжная трансмиссия и тяга</li></ul></div><div className="story-image"><Image src={tractor.image} alt={`Комфорт и конструкция ${tractor.model}`} width={720} height={560} /></div></section>
    <ScrollStudio image={tractor.image} model={tractor.model} />
    <section className="spec-section section-shell"><div className="section-heading"><div><span className="section-label">Технические данные</span><h2>Характеристики</h2></div><p>Параметры приведены по материалам производителя. Комплектация для поставки уточняется у менеджера ATADAN.</p></div><div className="spec-table">{Object.entries(tractor.specs).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><a className="source-link" href={tractor.sourceUrl} target="_blank" rel="noreferrer">Источник: Changfa Agricultural Equipment <ArrowUpRight size={16} /></a></section>
    <section className="product-request" id="request"><div><span className="section-label light">Персональное предложение</span><h2>Узнайте цену и условия на {tractor.model}</h2><p>Оставьте контакты — менеджер уточнит комплектацию, наличие и рассчитает рассрочку.</p></div><LeadForm tractorSlug={tractor.slug} tractorModel={tractor.model} /></section>
    <section className="related section-shell"><div className="section-heading"><div><span className="section-label">Ещё варианты</span><h2>Похожие по мощности</h2></div><Link className="text-link" href="/catalog">Весь каталог <ArrowUpRight size={17} /></Link></div><div className="catalog-grid related-grid">{related.map((item) => <TractorCard tractor={item} key={item.slug} />)}</div></section>
  </main>;
}
