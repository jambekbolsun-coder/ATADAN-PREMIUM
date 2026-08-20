"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Phone, X } from "lucide-react";
import { useState } from "react";

const nav = [
  ["Каталог", "/catalog"],
  ["Рассрочка", "/finance"],
  ["Сервис", "/service"],
  ["О компании", "/about"],
  ["Контакты", "/contacts"],
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header-shell">
      <div className="site-header">
        <Link href="/" className="brand" aria-label="ATADAN Changfa — на главную">
          <Image src="/atadan-logo-cropped.png" alt="ATADAN Changfa" width={260} height={90} priority />
        </Link>
        <nav className="desktop-nav" aria-label="Основная навигация">
          {nav.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <a className="header-phone" href="tel:+996706131404"><Phone size={16} /> <span>+996 706 131 404</span></a>
          <a className="header-cta" href="https://wa.me/996706131404" target="_blank" rel="noreferrer">Связаться</a>
          <button className="menu-toggle" type="button" aria-label={open ? "Закрыть меню" : "Открыть меню"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      <div className={`mobile-menu ${open ? "is-open" : ""}`}>
        <nav aria-label="Мобильная навигация">
          {nav.map(([label, href], index) => <Link href={href} key={href} onClick={() => setOpen(false)}><span>0{index + 1}</span>{label}</Link>)}
        </nav>
        <a className="mobile-call" href="tel:+996706131404"><Phone size={18} /> Позвонить</a>
      </div>
    </header>
  );
}
