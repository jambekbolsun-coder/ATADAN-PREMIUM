import { BadgeCheck, CalendarClock, FileCheck2, Handshake } from "lucide-react";
import { FinanceCalculator } from "../components/FinanceCalculator";
import { LeadForm } from "../components/LeadForm";
import { PageHero } from "../components/PageHero";
import { Trans } from "../components/I18n";
import { getCatalog } from "../lib/catalog";
import { getLeasingPublicConfig } from "../lib/leasing-public";
import { formatLeaseTerm } from "../lib/leasing";
import { getUsdKgsRate } from "../lib/exchange-rate";
import { getRequestLocale } from "../lib/locale-server";
import { pageMetadata } from "../lib/seo";
import { copy } from "../data/site-copy";

export async function generateMetadata(){return pageMetadata("finance","/finance",await getRequestLocale())}
export const dynamic = "force-dynamic";
export default async function FinancePage(){
  const [tractors,config,usdKgsRate,locale]=await Promise.all([getCatalog(),getLeasingPublicConfig(),getUsdKgsRate(),getRequestLocale()]);
  const tr=(id:string,values:Record<string,string|number>={})=>(copy[locale][id]??copy.ru[id]??id).replace(/\{(\w+)\}/g,(_,k:string)=>String(values[k]??`{${k}}`));
  return <main><PageHero image="/images/banners/finance.webp" kickerId="finance.kicker" titleId="finance.title" subtitleId="finance.subtitle"/><section className="section-shell finance-main"><div className="finance-explanation"><span className="section-label">{tr("finance.page.label")}</span><h2>{tr("finance.page.title",{term:formatLeaseTerm(config.maxMonths,locale)})}</h2><p>{tr(config.programs.length?"finance.page.textBanks":"finance.page.text",{max:config.maxMonths})}</p><p>{tr("finance.page.text2")}</p></div><FinanceCalculator tractors={tractors} config={config} usdKgsRate={usdKgsRate}/><div className="finance-steps"><article><i><FileCheck2/></i><span>01</span><h3><Trans id="finance.step1"/></h3><p><Trans id="finance.step1Text"/></p></article><article><i><Handshake/></i><span>02</span><h3><Trans id="finance.step2"/></h3><p><Trans id="finance.step2Text"/></p></article><article><i><CalendarClock/></i><span>03</span><h3><Trans id="finance.step3"/></h3><p><Trans id="finance.step3Text"/></p></article><article><i><BadgeCheck/></i><span>04</span><h3><Trans id="finance.step4"/></h3><p><Trans id="finance.step4Text"/></p></article></div></section><section className="home-lead section-shell"><div><span className="section-label"><Trans id="finance.requestLabel"/></span><h2><Trans id="finance.requestTitle"/></h2><p><Trans id="finance.requestText"/></p></div><LeadForm/></section></main>;
}
