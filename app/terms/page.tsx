import type { Metadata } from "next";
import { LegalPage } from "../components/LegalPage";
export const metadata:Metadata={title:"Условия использования | ATADAN",description:"Условия использования каталога тракторов и сервисов ATADAN Changfa."};
export default function TermsPage(){return <LegalPage kind="terms"/>}
