import { HomeContent } from "./components/HomeContent";
import { getCatalog } from "./lib/catalog";
import { getRequestLocale } from "./lib/locale-server";
import { pageMetadata } from "./lib/seo";

export async function generateMetadata(){return pageMetadata("home","/",await getRequestLocale())}

export default async function Home() {
  const tractors = await getCatalog();
  return <HomeContent tractors={tractors} />;
}
