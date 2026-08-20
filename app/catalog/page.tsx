import type { Metadata } from "next";
import { CatalogExplorer } from "../components/CatalogExplorer";
import { getCatalog } from "../lib/catalog";

export const metadata: Metadata = { title: "Каталог тракторов Changfa | ATADAN", description: "Все модели тракторов Changfa мощностью от 50 до 240 л.с. Фильтры по мощности и наличию." };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ power?: string }> }) {
  const tractors = await getCatalog();
  const { power } = await searchParams;
  const initialPower = Number.parseInt(power ?? "", 10);
  return <main><section className="page-hero catalog-hero"><span className="eyebrow">Только оригинальная техника Changfa</span><h1>Каталог тракторов</h1><p>{tractors.length} моделей от 50 до 240 л.с. — сравните мощности и найдите технику под своё хозяйство.</p></section><div className="section-shell catalog-shell"><CatalogExplorer tractors={tractors} initialPower={Number.isFinite(initialPower) ? initialPower : undefined} /></div></main>;
}
