import { NewsHub } from "../components/NewsHub";
import { getNewsPosts } from "../lib/news";
import { getRequestLocale } from "../lib/locale-server";
import { pageMetadata } from "../lib/seo";

export async function generateMetadata(){return pageMetadata("news","/news",await getRequestLocale())}

export default async function NewsPage() {
  return <NewsHub posts={await getNewsPosts()} />;
}
