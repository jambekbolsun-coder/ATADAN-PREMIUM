import type { Metadata } from "next";
import { Clock3, MapPin, MessageCircle, Phone } from "lucide-react";
import { LeadForm } from "../components/LeadForm";
import { Trans } from "../components/I18n";
import { PageHero } from "../components/PageHero";
import { getSiteSettings } from "../lib/site-settings";

export const metadata: Metadata = { title: "Контакты ATADAN Changfa", description: "Связаться с официальным дистрибьютором тракторов Changfa в Кыргызстане." };

export default async function ContactsPage() {
  const { settings } = await getSiteSettings();
  const phoneHref = "tel:" + settings.phone.replace(/[^+\d]/g, "");
  const whatsappHref = "https://wa.me/" + settings.phone.replace(/\D/g, "");
  return <main>
    <PageHero image="/images/banners/contacts-trio-4k.webp" kickerId="contacts.kicker" titleId="contacts.title" subtitleId="contacts.subtitle" />
    <section className="section-shell contacts-grid">
      <div className="contact-cards">
        <a href={phoneHref}><i><Phone /></i><span><small><Trans id="contacts.phone" /></small><strong>{settings.phone}</strong></span></a>
        <a href={whatsappHref} target="_blank" rel="noreferrer"><i><MessageCircle /></i><span><small><Trans id="contacts.whatsapp" /></small><strong><Trans id="contacts.manager" /></strong></span></a>
        <div><i><MapPin /></i><span><small><Trans id="contacts.region" /></small><strong>{settings.address}</strong></span></div>
        <div><i><Clock3 /></i><span><small><Trans id="contacts.response" /></small><strong><Trans id="contacts.hours" /></strong></span></div>
      </div>
      <div className="contact-form-card"><span className="section-label"><Trans id="contacts.formLabel" /></span><h2><Trans id="contacts.formTitle" /></h2><p className="contact-form-note"><Trans id="contacts.formNote" /></p><LeadForm /></div>
    </section>
  </main>;
}
