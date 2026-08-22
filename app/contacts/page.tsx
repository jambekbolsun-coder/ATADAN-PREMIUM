import type { Metadata } from "next";
import { Clock3, MapPin, MessageCircle, Phone } from "lucide-react";
import { LeadForm } from "../components/LeadForm";
import { Trans } from "../components/I18n";
import { PageHero } from "../components/PageHero";

export const metadata: Metadata = { title: "Контакты ATADAN Changfa", description: "Связаться с официальным дистрибьютором тракторов Changfa в Кыргызстане." };
export default function ContactsPage() { return <main><PageHero image="/images/banners/contacts.webp" kickerId="contacts.kicker" titleId="contacts.title" subtitleId="contacts.subtitle" /><section className="section-shell contacts-grid"><div className="contact-cards"><a href="tel:+996706131404"><i><Phone /></i><span><small><Trans id="contacts.phone" /></small><strong>+996 706 131 404</strong></span></a><a href="https://wa.me/996706131404" target="_blank" rel="noreferrer"><i><MessageCircle /></i><span><small><Trans id="contacts.whatsapp" /></small><strong><Trans id="contacts.manager" /></strong></span></a><div><i><MapPin /></i><span><small><Trans id="contacts.region" /></small><strong><Trans id="footer.region" /></strong></span></div><div><i><Clock3 /></i><span><small><Trans id="contacts.response" /></small><strong><Trans id="contacts.hours" /></strong></span></div></div><div className="contact-form-card"><span className="section-label"><Trans id="contacts.formLabel" /></span><h2><Trans id="contacts.formTitle" /></h2><LeadForm /></div></section></main>; }
