import { ArrowRight, Headphones, Home, Search, Tractor, Wrench } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "./components/SiteLink";
import { copy } from "./data/site-copy";
import { getRequestLocale } from "./lib/locale-server";

export default async function NotFound() {
  const locale = await getRequestLocale();
  const t = (key: string) => copy[locale]?.[key] ?? copy.ru[key] ?? key;
  return (
    <main className="not-found">
      <div className="not-found-sun" aria-hidden="true" />
      <div className="not-found-tracks" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div>
      <div className="falling-leaves" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i style={{ left: `${2 + index * 5.5}%`, animationDelay: `${index * -.65}s`, animationDuration: `${7 + index * .37}s` } as CSSProperties} key={index} />)}</div>
      <div className="not-found-content">
        <span className="not-found-kicker"><Tractor size={17} aria-hidden="true" />{t("ui.404.kicker")}</span>
        <strong className="not-found-code">404</strong>
        <h1>{t("ui.404.title")}</h1>
        <p>{t("ui.404.text")}</p>
        <div className="not-found-actions">
          <Link className="not-found-primary" href="/catalog"><Search size={18} aria-hidden="true" />{t("ui.404.catalog")}<ArrowRight size={18} aria-hidden="true" /></Link>
          <Link className="not-found-secondary" href="/"><Home size={18} aria-hidden="true" />{t("ui.404.home")}</Link>
        </div>
        <nav className="not-found-quick-links" aria-label={t("ui.404.links")}><Link href="/service"><Wrench size={16} aria-hidden="true" />{t("nav.service")}</Link><Link href="/contacts"><Headphones size={16} aria-hidden="true" />{t("ui.404.contact")}</Link></nav>
      </div>
      <span className="not-found-mark" aria-hidden="true">ATADAN</span>
    </main>
  );
}
