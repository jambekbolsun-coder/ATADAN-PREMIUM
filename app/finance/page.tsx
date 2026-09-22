import type { Metadata } from "next";
import { BadgeCheck, CalendarClock, FileCheck2, Handshake } from "lucide-react";
import { FinanceCalculator } from "../components/FinanceCalculator";
import { LeadForm } from "../components/LeadForm";
import { PageHero } from "../components/PageHero";
import { Trans } from "../components/I18n";
import { getCatalog } from "../lib/catalog";
import { getLeasingPublicConfig } from "../lib/leasing-public";
import { getUsdKgsRate } from "../lib/exchange-rate";

export const metadata:Metadata={title:"Лизинг на тракторы Changfa | ATADAN",description:"Предварительный расчёт лизинга на тракторы Changfa и персональные условия финансирования."};
export const dynamic = "force-dynamic";
export default async function FinancePage(){
  const [tractors,config,usdKgsRate]=await Promise.all([getCatalog(),getLeasingPublicConfig(),getUsdKgsRate()]);
  return <main><PageHero image="/images/banners/finance.webp" kickerId="finance.kicker" titleId="finance.title" subtitleId="finance.subtitle"/><section className="section-shell finance-main"><div className="finance-explanation"><span className="section-label">ATADAN · Лизинг</span><h2>Трактор для работы. Оплата в течение 7 лет.</h2><p>В ATADAN можно оформить трактор Changfa в лизинг на 7 лет. Выберите модель и удобный первоначальный взнос · калькулятор покажет ориентировочный ежемесячный платёж и общую сумму.</p><p>Оставьте заявку: менеджер уточнит задачи хозяйства, поможет подобрать технику и расскажет о необходимых документах. Условия финансирования и график платежей согласовываются до подписания договора.</p></div><FinanceCalculator tractors={tractors} config={config} usdKgsRate={usdKgsRate}/><div className="finance-steps"><article><i><FileCheck2/></i><span>01</span><h3><Trans id="finance.step1"/></h3><p><Trans id="finance.step1Text"/></p></article><article><i><Handshake/></i><span>02</span><h3><Trans id="finance.step2"/></h3><p><Trans id="finance.step2Text"/></p></article><article><i><CalendarClock/></i><span>03</span><h3><Trans id="finance.step3"/></h3><p><Trans id="finance.step3Text"/></p></article><article><i><BadgeCheck/></i><span>04</span><h3><Trans id="finance.step4"/></h3><p><Trans id="finance.step4Text"/></p></article></div></section><section className="home-lead section-shell"><div><span className="section-label"><Trans id="finance.requestLabel"/></span><h2><Trans id="finance.requestTitle"/></h2><p><Trans id="finance.requestText"/></p></div><LeadForm/></section></main>;
}
