"use client";

import Image from "next/image";
import { Link } from "./SiteLink";
import { ArrowUpRight, Camera as Instagram, MapPin, Phone } from "lucide-react";
import { useI18n } from "./I18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="site-footer" id="contacts">
      <div className="footer-top">
        <div>
          <span className="section-label light">{t("footer.kicker")}</span>
          <h2>{t("footer.title")}</h2>
        </div>
        <a className="footer-contact" href="https://wa.me/996706131404" target="_blank" rel="noreferrer">{t("footer.whatsapp")} <ArrowUpRight /></a>
      </div>
      <div className="footer-grid">
        <div className="footer-brand"><div className="footer-logo"><Image src="/atadan-logo-cropped.png" alt="ATADAN Changfa" width={260} height={90} /></div><p>{t("footer.about")}</p></div>
        <div><strong>{t("footer.navigation")}</strong><Link href="/catalog">{t("nav.catalog")}</Link><Link href="/finance">{t("nav.finance")}</Link><Link href="/service">{t("nav.service")}</Link><Link href="/about">{t("nav.about")}</Link></div>
        <div><strong>{t("footer.contacts")}</strong><a href="tel:+996706131404"><Phone size={15} />+996 706 131 404</a><a href="https://www.instagram.com/atadan_kg" target="_blank" rel="noreferrer"><Instagram size={15} />@atadan_kg</a><span><MapPin size={15} />{t("footer.region")}</span><a href="/admin">{t("footer.admin")}</a></div>
      </div>
      <div className="footer-bottom"><span>© 2026 ATADAN Changfa</span><span>{t("footer.tagline")}</span></div>
    </footer>
  );
}
