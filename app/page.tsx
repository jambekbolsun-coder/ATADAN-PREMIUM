import { HomeContent } from "./components/HomeContent";
import { getCatalog } from "./lib/catalog";

export default async function Home() {
  const tractors = await getCatalog();
  return <HomeContent tractors={tractors} />;
}
