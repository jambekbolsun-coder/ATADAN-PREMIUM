"use client";

import Image from "next/image";
import { Link } from "./SiteLink";
import { ArrowUpRight, Gauge, Sprout } from "lucide-react";
import type { Tractor } from "../types";
import { formatPrice } from "../lib/format";
import { useI18n } from "./I18n";

export function TractorCard({ tractor, featured = false }: { tractor: Tractor; featured?: boolean }) {
  const { t } = useI18n();
  const discount = Math.min(90, Math.max(0, tractor.discountPercent ?? 0));
  const salePrice = tractor.price && discount ? Math.round(tractor.price * (1 - discount / 100)) : tractor.price;
  const monthly = salePrice ? Math.ceil(salePrice / 36) : null;
  return (
    <article className={`tractor-card ${featured ? "featured" : ""}`}>
      <Link href={`/catalog/${tractor.slug}`} className="tractor-card-image" aria-label={`Подробнее о ${tractor.model}`}>
        <span className={`stock-badge ${tractor.inStock ? "available" : "order"}`}>{tractor.inStock ? t("product.inStock") : t("product.onOrder")}</span>
        {discount ? <span className="promotion-badge"><small>{tractor.promotionLabel || t("product.promo")}</small><strong>−{discount}%</strong></span> : null}
        <Image src={tractor.image} alt={`Трактор Changfa ${tractor.model}`} width={620} height={470} sizes="(max-width: 760px) 92vw, (max-width: 1200px) 46vw, 31vw" />
      </Link>
      <div className="tractor-card-body">
        <div className="tractor-kicker"><span>{tractor.category}</span><span className={discount ? "sale-card-price" : ""}>{discount && tractor.price ? <del>{formatPrice(tractor.price)}</del> : null}{salePrice ? formatPrice(salePrice) : t("product.priceOnRequest")}</span></div>
        <h3><Link href={`/catalog/${tractor.slug}`}>Changfa {tractor.model}</Link></h3>
        <div className="tractor-meta"><span><Gauge size={17} />{tractor.hp} {t("common.hp")}</span><span><Sprout size={17} />{tractor.farmArea}</span></div>
        <div className="tractor-finance"><small>{t("product.installment")}</small><strong>{monthly ? `${new Intl.NumberFormat("ru-RU").format(monthly)} сом / ${t("common.month")}` : t("product.fromMonthly")}</strong></div>
        <Link className="details-link" href={`/catalog/${tractor.slug}`}>{t("product.details")} <ArrowUpRight size={17} /></Link>
      </div>
    </article>
  );
}
