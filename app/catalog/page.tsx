import type { Metadata } from "next";
import { CatalogExplorer } from "../components/CatalogExplorer";
import { PageHero } from "../components/PageHero";
import { getCatalog } from "../lib/catalog";

export const metadata: Metadata = { title: "Каталог тракторов Changfa | ATADAN", description: "Все модели тракторов Changfa мощностью от 50 до 240 л.с. Фильтры по мощности и наличию." };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ power?: string; search?: string }> }) {
  const tractors = await getCatalog();
  const { power, search } = await searchParams;
  const initialPower = Number.parseInt(power ?? "", 10);
  return <main><PageHero image="/images/banners/catalog.png" kickerId="catalog.kicker" titleId="catalog.title" subtitleId="catalog.subtitle" values={{ count: tractors.length }} /><div className="section-shell catalog-shell"><CatalogExplorer tractors={tractors} initialPower={Number.isFinite(initialPower) ? initialPower : undefined} initialQuery={search ?? ""} /></div></main>;
}
