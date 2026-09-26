import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "../../components/ProductDetailClient";
import { getCatalog, getTractor } from "../../lib/catalog";
import { getLeasingPublicConfig } from "../../lib/leasing-public";
import { getUsdKgsRate } from "../../lib/exchange-rate";
import { getRequestLocale } from "../../lib/locale-server";
import { localizeTractor } from "../../lib/tractor-localization";
import { jsonLd, publicMetadata, SITE_URL } from "../../lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [tractor,locale] = await Promise.all([getTractor(slug),getRequestLocale()]);
  if (!tractor) return { title: "Модель не найдена | ATADAN",robots:{index:false,follow:false} };
  const localized=localizeTractor(tractor,locale);
  const hp=locale==="en"?"hp":locale==="ky"?"а.к.":"л.с.";
  return publicMetadata({path:`/catalog/${tractor.slug}`,locale,title:`Changfa ${tractor.model}: ${tractor.hp} ${hp} | ATADAN`,description:localized.description,image:tractor.image});
}

export async function generateStaticParams() { return (await getCatalog()).map((tractor) => ({ slug: tractor.slug })); }

export default async function TractorDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tractor = await getTractor(slug);
  if (!tractor) notFound();
  const [catalog,leasingConfig,usdKgsRate] = await Promise.all([getCatalog(),getLeasingPublicConfig(),getUsdKgsRate()]);
  const related = catalog.filter((item) => item.slug !== tractor.slug).sort((a, b) => Math.abs(a.hp - tractor.hp) - Math.abs(b.hp - tractor.hp)).slice(0, 3);
  const locale=await getRequestLocale();
  const localized=localizeTractor(tractor,locale);
  const product={"@context":"https://schema.org","@type":"Product",name:`Changfa ${tractor.model}`,model:tractor.model,description:localized.description,image:(tractor.images?.length?tractor.images:[tractor.image]).map(image=>new URL(image,SITE_URL).toString()),brand:{"@type":"Brand",name:"Changfa"},category:localized.category,url:new URL(`/catalog/${tractor.slug}`,SITE_URL).toString(),additionalProperty:localized.specs.map(([name,value])=>({"@type":"PropertyValue",name,value})),offers:{"@type":"Offer",url:new URL(`/catalog/${tractor.slug}`,SITE_URL).toString(),availability:`https://schema.org/${tractor.inStock?"InStock":"PreOrder"}`,itemCondition:"https://schema.org/NewCondition",seller:{"@type":"Organization",name:"ATADAN"},...(tractor.price!==null?{price:tractor.price,priceCurrency:"KGS"}:{})}};
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(product)}}/><ProductDetailClient tractor={tractor} related={related} leasingConfig={leasingConfig} usdKgsRate={usdKgsRate} /></>;
}
