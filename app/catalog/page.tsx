import { CatalogExplorer } from "../components/CatalogExplorer";
import { PageHero } from "../components/PageHero";
import { getCatalog } from "../lib/catalog";
import { getLeasingPublicConfig } from "../lib/leasing-public";
import { getUsdKgsRate } from "../lib/exchange-rate";
import { getRequestLocale } from "../lib/locale-server";
import { pageMetadata } from "../lib/seo";

export async function generateMetadata(){return pageMetadata("catalog","/catalog",await getRequestLocale())}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ power?: string; search?: string; popular?: string; compare?: string }> }) {
  const [tractors, leasingConfig, usdKgsRate] = await Promise.all([getCatalog(), getLeasingPublicConfig(), getUsdKgsRate()]);
  const { power, search, popular, compare } = await searchParams;
  const initialPower = Number.parseInt(power ?? "", 10);
  return <main><PageHero image="/images/banners/catalog.webp" video="/videos/editorial/catalog-field-10s-v2.mp4" kickerId="catalog.kicker" titleId="catalog.title" subtitleId="catalog.subtitle" values={{ count: tractors.length }} /><div className="section-shell catalog-shell"><CatalogExplorer tractors={tractors} initialPower={Number.isFinite(initialPower) ? initialPower : undefined} initialQuery={search ?? ""} initialPopular={popular === "1"} initialCompare={(compare ?? "").split(",").filter(Boolean).slice(0, 3)} config={leasingConfig} usdKgsRate={usdKgsRate} /></div></main>;
}
