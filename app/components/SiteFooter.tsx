"use client";
import { Instagram } from "./BrandIcons";

import Image from "next/image";
import { Link } from "./SiteLink";
import { ArrowUpRight, MapPin, MessageCircle, Phone } from "lucide-react";
import { useI18n } from "./I18n";
import { useSiteSettings } from "./SiteSettings";

export function SiteFooter() {
  const { t } = useI18n();
  const settings = useSiteSettings();
  const phoneHref = "tel:" + settings.phone.replace(/[^+\d]/g, "");
  const whatsappHref = "https://wa.me/" + settings.phone.replace(/\D/g, "");
  return (
    <footer className="site-footer" id="contacts">
      <div className="footer-top">
        <div className="footer-pitch">
          <span className="section-label light">{t("footer.kicker")}</span>
          <h2>{t("footer.title")}</h2>
          <p>{t("footer.about")}</p>
        </div>
        <a className="footer-contact" href={whatsappHref} target="_blank" rel="noreferrer"><i><MessageCircle size={19} /></i><span>{t("footer.whatsapp")}<small>{settings.phone}</small></span><ArrowUpRight size={18} /></a>
      </div>
      <div className="footer-grid">
        <div className="footer-brand"><div className="footer-logo"><Image src="/atadan-logo-cropped.png" alt="ATADAN Changfa" width={260} height={90} /></div><span>Official Changfa distributor</span></div>
        <div><strong>{t("footer.navigation")}</strong><Link href="/catalog">{t("nav.catalog")}</Link><Link href="/finance">{t("nav.finance")}</Link><Link href="/service">{t("nav.service")}</Link><Link href="/about">{t("nav.about")}</Link></div>
        <div><strong>{t("footer.contacts")}</strong><a href={phoneHref}><Phone size={15} />{settings.phone}</a><a href={settings.instagram} target="_blank" rel="noreferrer"><Instagram size={15} />@atadan_kg</a><span><MapPin size={15} />{settings.address}</span></div>
        <div><strong>ATADAN</strong><Link href="/contacts">{t("nav.contacts")}</Link><a href="https://en.changfanz.com/" target="_blank" rel="noreferrer">Changfa Global <ArrowUpRight size={13} /></a></div>
      </div>
      <div className="footer-bottom"><span>© 2026 ATADAN Changfa</span><span>{t("footer.tagline")}</span></div>
    </footer>
  );
}
