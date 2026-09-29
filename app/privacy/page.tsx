import { LegalPage } from "../components/LegalPage";
import { getRequestLocale } from "../lib/locale-server";
import { pageMetadata } from "../lib/seo";
export async function generateMetadata(){return pageMetadata("privacy","/privacy",await getRequestLocale())}
export default function PrivacyPage(){return <LegalPage kind="privacy"/>}
