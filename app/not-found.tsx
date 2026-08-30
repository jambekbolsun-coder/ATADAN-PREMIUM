import { ArrowRight, Headphones, Home, Search, Tractor, Wrench } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "./components/SiteLink";

export default function NotFound() {
  return (
    <main className="not-found">
      <div className="not-found-sun" aria-hidden="true" />
      <div className="not-found-tracks" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div>
      <div className="falling-leaves" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i style={{ left: `${2 + index * 5.5}%`, animationDelay: `${index * -.65}s`, animationDuration: `${7 + index * .37}s` } as CSSProperties} key={index} />)}</div>
      <div className="not-found-content">
        <span className="not-found-kicker"><Tractor size={17} aria-hidden="true" />Маршрут потерян</span>
        <strong className="not-found-code">404</strong>
        <h1>Этой дороги пока нет</h1>
        <p>Похоже, адрес изменился. Вернитесь к каталогу Changfa или начните с главной страницы ATADAN.</p>
        <div className="not-found-actions">
          <Link className="not-found-primary" href="/catalog"><Search size={18} aria-hidden="true" />Открыть каталог<ArrowRight size={18} aria-hidden="true" /></Link>
          <Link className="not-found-secondary" href="/"><Home size={18} aria-hidden="true" />На главную</Link>
        </div>
        <nav className="not-found-quick-links" aria-label="Полезные разделы"><Link href="/service"><Wrench size={16} aria-hidden="true" />Сервис и запчасти</Link><Link href="/contacts"><Headphones size={16} aria-hidden="true" />Связаться с нами</Link></nav>
      </div>
      <span className="not-found-mark" aria-hidden="true">ATADAN</span>
    </main>
  );
}
