"use client";

import Image from "next/image";
import { Link } from "./SiteLink";
import { Menu, Phone, X } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher, useI18n } from "./I18n";

const nav = [
  ["nav.catalog", "/catalog"],
  ["nav.finance", "/finance"],
  ["nav.service", "/service"],
  ["nav.about", "/about"],
  ["nav.contacts", "/contacts"],
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return (
    <header className="site-header-shell">
      <div className="site-header">
        <Link href="/" className="brand" aria-label="ATADAN Changfa — на главную">
          <Image src="/atadan-logo-cropped.png" alt="ATADAN Changfa" width={260} height={90} priority />
        </Link>
        <nav className="desktop-nav" aria-label="Основная навигация">
          {nav.map(([label, href]) => <Link href={href} key={href}>{t(label)}</Link>)}
        </nav>
        <div className="header-actions">
          <LanguageSwitcher />
          <a className="header-phone" href="tel:+996706131404"><Phone size={16} /> <span>+996 706 131 404</span></a>
          <a className="header-cta" href="https://wa.me/996706131404" target="_blank" rel="noreferrer">{t("nav.contact")}</a>
          <button className="menu-toggle" type="button" aria-label={open ? t("nav.close") : t("nav.open")} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      <div className={`mobile-menu ${open ? "is-open" : ""}`}>
        <nav aria-label="Мобильная навигация">
          {nav.map(([label, href], index) => <Link href={href} key={href} onClick={() => setOpen(false)}><span>0{index + 1}</span>{t(label)}</Link>)}
        </nav>
        <div className="mobile-language"><LanguageSwitcher compact /></div>
        <a className="mobile-call" href="tel:+996706131404"><Phone size={18} /> {t("nav.call")}</a>
      </div>
    </header>
  );
}
