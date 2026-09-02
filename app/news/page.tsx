import type { Metadata } from "next";
import { NewsHub } from "../components/NewsHub";
import { getNewsPosts } from "../lib/news";

export const metadata: Metadata = {
  title: "ATADAN АгроЖурнал — тракторы Changfa и работа в поле",
  description: "Практические материалы о выборе, эксплуатации, комфорте и обслуживании тракторов Changfa в Кыргызстане.",
};

export default async function NewsPage() {
  return <NewsHub posts={await getNewsPosts()} />;
}
