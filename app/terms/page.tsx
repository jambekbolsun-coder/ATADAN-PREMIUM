import { LegalPage } from "../components/LegalPage";
import { getRequestLocale } from "../lib/locale-server";
import { pageMetadata } from "../lib/seo";
export async function generateMetadata(){return pageMetadata("terms","/terms",await getRequestLocale())}
export default function TermsPage(){return <LegalPage kind="terms"/>}
