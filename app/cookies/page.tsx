import { LegalPage } from "../components/LegalPage";
import { getRequestLocale } from "../lib/locale-server";
import { pageMetadata } from "../lib/seo";
export async function generateMetadata(){return pageMetadata("cookies","/cookies",await getRequestLocale())}
export default function CookiesPage(){return <LegalPage kind="cookies"/>}
