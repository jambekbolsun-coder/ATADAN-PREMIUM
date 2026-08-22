import type { Metadata } from "next";
import { BadgeCheck, CalendarClock, FileCheck2, Handshake } from "lucide-react";
import { FinanceCalculator } from "../components/FinanceCalculator";
import { LeadForm } from "../components/LeadForm";
import { PageHero } from "../components/PageHero";
import { Trans } from "../components/I18n";

export const metadata: Metadata = { title: "Рассрочка на тракторы Changfa | ATADAN", description: "Предварительный расчёт рассрочки на тракторы Changfa и персональные условия финансирования." };
export default function FinancePage() { return <main><PageHero image="/images/banners/finance.png" kickerId="finance.kicker" titleId="finance.title" subtitleId="finance.subtitle" /><section className="section-shell finance-main"><FinanceCalculator /><div className="finance-steps"><article><i><FileCheck2 /></i><span>01</span><h3><Trans id="finance.step1" /></h3><p><Trans id="finance.step1Text" /></p></article><article><i><Handshake /></i><span>02</span><h3><Trans id="finance.step2" /></h3><p><Trans id="finance.step2Text" /></p></article><article><i><CalendarClock /></i><span>03</span><h3><Trans id="finance.step3" /></h3><p><Trans id="finance.step3Text" /></p></article><article><i><BadgeCheck /></i><span>04</span><h3><Trans id="finance.step4" /></h3><p><Trans id="finance.step4Text" /></p></article></div></section><section className="home-lead section-shell"><div><span className="section-label"><Trans id="finance.requestLabel" /></span><h2><Trans id="finance.requestTitle" /></h2><p><Trans id="finance.requestText" /></p></div><LeadForm /></section></main>; }
