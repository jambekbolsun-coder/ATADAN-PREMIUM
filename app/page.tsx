import { HomeContent } from "./components/HomeContent";
import { getCatalog } from "./lib/catalog";
import { getLeasingPublicConfig } from "./lib/leasing-public";
import { getUsdKgsRate } from "./lib/exchange-rate";
import { getRequestLocale } from "./lib/locale-server";
import { pageMetadata } from "./lib/seo";

export async function generateMetadata(){return pageMetadata("home","/",await getRequestLocale())}

export default async function Home() {
  const [tractors, config, usdKgsRate] = await Promise.all([getCatalog(), getLeasingPublicConfig(), getUsdKgsRate()]);
  return <HomeContent tractors={tractors} config={config} usdKgsRate={usdKgsRate} />;
}
