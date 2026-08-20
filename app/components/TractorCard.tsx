import Image from "next/image";
import { Link } from "./SiteLink";
import { ArrowUpRight, Gauge, Sprout } from "lucide-react";
import type { Tractor } from "../types";
import { formatPrice } from "../lib/format";

export function TractorCard({ tractor, featured = false }: { tractor: Tractor; featured?: boolean }) {
  return (
    <article className={`tractor-card ${featured ? "featured" : ""}`}>
      <Link href={`/catalog/${tractor.slug}`} className="tractor-card-image" aria-label={`Подробнее о ${tractor.model}`}>
        <span className={`stock-badge ${tractor.inStock ? "available" : "order"}`}>{tractor.inStock ? "В наличии" : "Под заказ"}</span>
        <Image src={tractor.image} alt={`Трактор Changfa ${tractor.model}`} width={620} height={470} sizes="(max-width: 760px) 92vw, (max-width: 1200px) 46vw, 31vw" />
      </Link>
      <div className="tractor-card-body">
        <div className="tractor-kicker"><span>{tractor.category}</span><span>{formatPrice(tractor.price)}</span></div>
        <h3><Link href={`/catalog/${tractor.slug}`}>Changfa {tractor.model}</Link></h3>
        <div className="tractor-meta"><span><Gauge size={17} />{tractor.hp} л.с.</span><span><Sprout size={17} />{tractor.farmArea}</span></div>
        <Link className="details-link" href={`/catalog/${tractor.slug}`}>Подробнее <ArrowUpRight size={17} /></Link>
      </div>
    </article>
  );
}
