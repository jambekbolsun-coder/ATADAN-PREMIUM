import { ArrowRight, Home, Search, Tractor } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "./components/SiteLink";

export default function NotFound() {
  return (
    <main className="not-found">
      <div className="falling-leaves" aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <i style={{ left: `${2 + index * 7}%`, animationDelay: `${index * -.65}s`, animationDuration: `${7 + index * .37}s` } as CSSProperties} key={index} />)}</div>
      <div className="not-found-content">
        <span className="not-found-kicker"><Tractor size={17} />Маршрут потерян</span>
        <strong className="not-found-code">404</strong>
        <h1>Этой дороги пока нет</h1>
        <p>Похоже, адрес изменился. Вернитесь к каталогу Changfa или начните с главной страницы ATADAN.</p>
        <div className="not-found-actions">
          <Link className="not-found-primary" href="/catalog"><Search size={18} />Открыть каталог<ArrowRight size={18} /></Link>
          <Link className="not-found-secondary" href="/"><Home size={18} />На главную</Link>
        </div>
      </div>
      <span className="not-found-mark" aria-hidden="true">ATADAN</span>
    </main>
  );
}
