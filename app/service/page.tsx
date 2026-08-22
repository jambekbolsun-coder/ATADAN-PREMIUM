import type { Metadata } from "next";
import { Link } from "../components/SiteLink";
import { ArrowUpRight, ClipboardCheck, Cog, Headphones, PackageCheck, Wrench } from "lucide-react";
import { Trans } from "../components/I18n";
import { PageHero } from "../components/PageHero";

export const metadata: Metadata = { title: "Сервис тракторов Changfa | ATADAN", description: "Гарантийная поддержка, регламентное обслуживание и запчасти для тракторов Changfa." };
export default function ServicePage() { return <main><PageHero image="/images/banners/service.png" kickerId="service.kicker" titleId="service.title" subtitleId="service.subtitle" /><section className="section-shell service-grid"><article><Wrench /><span>01</span><h2><Trans id="service.maintenance" /></h2><p><Trans id="service.maintenanceText" /></p></article><article><ClipboardCheck /><span>02</span><h2><Trans id="service.diagnostics" /></h2><p><Trans id="service.diagnosticsText" /></p></article><article><PackageCheck /><span>03</span><h2><Trans id="service.parts" /></h2><p><Trans id="service.partsText" /></p></article><article><Headphones /><span>04</span><h2><Trans id="service.support" /></h2><p><Trans id="service.supportText" /></p></article></section><section className="service-cta"><div><Cog /><span><Trans id="service.need" /></span><h2><Trans id="service.needTitle" /></h2></div><div><a className="primary-btn" href="tel:+996706131404"><Trans id="service.call" /></a><Link className="outline-btn light" href="/contacts"><Trans id="nav.contacts" /> <ArrowUpRight size={17} /></Link></div></section></main>; }
