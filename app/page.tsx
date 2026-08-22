import type { Metadata } from "next";
import { HomeContent } from "./components/HomeContent";
import { getCatalog } from "./lib/catalog";

export const metadata: Metadata = {
  title: "ATADAN Changfa — официальный каталог тракторов",
  description: "ATADAN — официальный дистрибьютор Changfa в Кыргызстане: 6 лет на рынке, каталог 50–240 л.с., рассрочка и сервис.",
};

export default async function Home() {
  const tractors = await getCatalog();
  return <HomeContent tractors={tractors} />;
}
