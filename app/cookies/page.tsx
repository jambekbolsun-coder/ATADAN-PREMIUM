import type { Metadata } from "next";
import { LegalPage } from "../components/LegalPage";
export const metadata:Metadata={title:"Политика cookie | ATADAN",description:"Какие настройки браузера использует сайт ATADAN и как управлять аналитикой."};
export default function CookiesPage(){return <LegalPage kind="cookies"/>}
