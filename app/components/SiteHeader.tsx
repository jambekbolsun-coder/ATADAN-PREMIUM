"use client";
import { Instagram } from "./BrandIcons";

import Image from "next/image";
import { Link } from "./SiteLink";
import { ArrowUpRight, Menu, Phone, Search, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LanguageSwitcher, useI18n } from "./I18n";
import { useSiteSettings } from "./SiteSettings";

const nav = [
  ["nav.catalog", "/catalog"],
  ["nav.service", "/service"],
  ["nav.finance", "/finance"],
  ["nav.news", "/news"],
  ["nav.about", "/about"],
  ["nav.contacts", "/contacts"],
];

function HeaderSearch({ mobile = false, close }: { mobile?: boolean; close?: () => void }) {
  const [query, setQuery] = useState("");
  const { t } = useI18n();

  return (
    <form className={`header-search ${mobile ? "mobile" : ""}`} role="search" action="/catalog" method="get" onSubmit={close}>
      <Search size={16} aria-hidden="true" />
      <input name="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("catalog.search")} placeholder={t("catalog.search")} />
      <button type="submit" aria-label={t("catalog.search")}><ArrowUpRight size={15} /></button>
    </form>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();
  const settings = useSiteSettings();
  const phoneHref = "tel:" + settings.phone.replace(/[^+\d]/g, "");
  const whatsappHref = "https://wa.me/" + settings.phone.replace(/\D/g, "");
  const isHome = pathname === "/";

  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 36);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <header className={`site-header-shell${isHome ? " is-home" : ""}${scrolled ? " is-scrolled" : ""}`}>
      <div className="header-utility">
        <div>
          <span><ShieldCheck size={13} />{t("home.kicker")}</span>
          <nav aria-label="Социальные сети и контакты">
            <a href={settings.instagram} target="_blank" rel="noreferrer"><Instagram size={13} />@atadan_kg</a>
            <a href={phoneHref}><Phone size={13} />{settings.phone}</a>
          </nav>
        </div>
      </div>
      <div className="site-header">
        <Link href="/" className="brand" aria-label="ATADAN Changfa — на главную">
          <Image src="/atadan-logo-cropped.png" alt="ATADAN Changfa" width={260} height={90} priority />
        </Link>
        <nav className="desktop-nav" aria-label="Основная навигация">
          {nav.map(([label, href]) => <Link href={href} className={isActive(href) ? "active" : ""} aria-current={isActive(href) ? "page" : undefined} key={href}>{t(label)}</Link>)}
        </nav>
        <div className="header-actions">
          <HeaderSearch />
          <LanguageSwitcher />
          <a className="header-cta" href={whatsappHref} target="_blank" rel="noreferrer"><span>{t("nav.contact")}</span><ArrowUpRight size={16} /></a>
          <button className="menu-toggle" type="button" aria-label={open ? t("nav.close") : t("nav.open")} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((value) => !value)}>
            {open ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </div>
      <div className={`mobile-menu ${open ? "is-open" : ""}`} id="mobile-navigation" aria-hidden={!open}>
        <HeaderSearch mobile close={() => setOpen(false)} />
        <nav aria-label="Мобильная навигация">
          {nav.map(([label, href], index) => <Link href={href} className={isActive(href) ? "active" : ""} aria-current={isActive(href) ? "page" : undefined} key={href} onClick={() => setOpen(false)}><span>0{index + 1}</span>{t(label)}</Link>)}
        </nav>
        <div className="mobile-language"><LanguageSwitcher compact /></div>
        <a className="mobile-call" href={phoneHref}><Phone size={18} /> {t("nav.call")}</a>
      </div>
    </header>
  );
}
