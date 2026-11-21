"use client";

import Image from "next/image";
import { Link } from "./SiteLink";
import { Check, MessageCircle, Plus } from "lucide-react";
import type { Tractor } from "../types";
import { formatApproximateUsdPrice, formatPrice } from "../lib/format";
import { useI18n } from "./I18n";
import { useSiteSettings } from "./SiteSettings";
import { localizeTractor } from "../lib/tractor-localization";
import { tractorCabin, tractorGearbox, tractorMassKg, tractorMaxSpeed, tractorTractionKn } from "../lib/tractor-facts";
import { canTrimPhoto, tractorPhotoLoader } from "../lib/photo-loader";
import type { LeasePreview } from "../lib/lease-preview";

type CompareControl = { active: boolean; full: boolean; onToggle: () => void };

export function TractorCard({ tractor, featured = false, preview = null, compare }: { tractor: Tractor; featured?: boolean; preview?: LeasePreview | null; compare?: CompareControl }) {
  const { t, locale } = useI18n();
  const settings = useSiteSettings();
  const localized = localizeTractor(tractor, locale);
  const discount = Math.min(90, Math.max(0, tractor.discountPercent ?? 0));
  const salePrice = tractor.price && discount ? Math.round(tractor.price * (1 - discount / 100)) : tractor.price;
  const numberLocale = locale === "en" ? "en-US" : "ru-RU";
  const num = (value: number) => new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 1 }).format(value);
  const mass = tractorMassKg(tractor), traction = tractorTractionKn(tractor), gearbox = tractorGearbox(tractor), cabin = tractorCabin(tractor);
  const speed = tractorMaxSpeed(tractor);
  // Мощность всегда первая, дальше три разных факта по важности, без повторов.
  const extra: Array<[string, string] | null> = [
    mass ? [t("ui.card.mass"), `${num(mass)} ${t("ui.card.kg")}`] : null,
    gearbox ? [t("ui.card.gearbox"), gearbox] : null,
    cabin ? [t("ui.card.cabin"), t(`ui.card.cabin.${cabin}`)] : null,
    traction ? [t("ui.card.traction"), `${num(traction)} ${t("ui.card.kn")}`] : null,
    speed ? [t("ui.cat.cmp.speed"), t("ui.cat.speedUpTo", { n: speed })] : null,
    [t("ui.card.drive"), "4×4"],
    [t("ui.card.class"), localized.category.replace(/\s*(класс|классы|class)$/i, "")],
  ];
  const tiles: Array<[string, string]> = [[t("ui.card.power"), `${tractor.hp} ${t("common.hp")}`], ...extra.filter((item): item is [string, string] => Boolean(item)).slice(0, 3)];
  const stockText = tractor.inStock ? (tractor.availableUnits ? t("ui.card.stockCount", { n: tractor.availableUnits }) : t("product.inStock")) : t("product.onOrder");
  const href = `/catalog/${tractor.slug}`;
  const whatsapp = `https://wa.me/${settings.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Здравствуйте! Интересует Changfa ${tractor.model} (${tractor.hp} л.с.). Подскажите цену и наличие.`)}`;

  return (
    <article className={`tractor-card tractor-card-v4 ${featured ? "featured" : ""}`}>
      <Link href={href} className="tractor-card-image" aria-label={t("ui.card.details", { model: tractor.model })}>
        <span className={`stock-badge ${tractor.inStock ? "available" : "order"}`}>{tractor.inStock ? <Check size={13} aria-hidden /> : null}{stockText}</span>
        {discount && tractor.price ? <span className="promotion-badge"><small>{tractor.promotionLabel || t("product.promo")}</small><strong>−{discount}%</strong></span> : null}
        <Image loader={canTrimPhoto(tractor.image) ? tractorPhotoLoader : undefined} src={tractor.image} alt={t("ui.card.alt", { model: tractor.model })} width={620} height={470} sizes="(max-width: 760px) 92vw, (max-width: 1200px) 46vw, 31vw" />
      </Link>
      <div className="tractor-card-body">
        <h3><Link href={href}>Changfa {tractor.model}</Link></h3>
        <p className="tractor-card-fit">{t("ui.card.fits", { area: localized.farmArea })}</p>
        <dl className="tractor-card-specs">
          {tiles.map(([label, value], index) => <div key={`${label}-${index}`}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <div className="tractor-card-money">
          <div>
            <small>{discount && tractor.price ? <del>{formatPrice(tractor.price, locale)}</del> : t("ui.card.price")}</small>
            <strong>{salePrice ? formatPrice(salePrice, locale) : formatApproximateUsdPrice(tractor.approximatePriceUsd, locale)}</strong>
          </div>
          {preview ? (
            <Link href={`${href}#leasing`} className="tractor-card-lease">
              <small>{t("ui.card.lease", { p: num(preview.downPercent) })}</small>
              <strong>{t("ui.card.perMonth", { sum: new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 0 }).format(preview.monthly) })}</strong>
            </Link>
          ) : (
            <Link href={`${href}#leasing`} className="tractor-card-lease">
              <small>{t("product.installment")}</small>
              <strong>{t("finance.calcCta")}</strong>
            </Link>
          )}
        </div>
        <div className="tractor-card-actions">
          <Link className="primary-btn" href={href}>{t("product.details")}</Link>
          <a className="tractor-card-icon" href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={t("ui.card.whatsapp", { model: tractor.model })} title={t("ui.card.whatsapp", { model: tractor.model })}><MessageCircle size={19} aria-hidden /></a>
          {compare ? (
            <button
              type="button"
              className={`tractor-card-icon${compare.active ? " is-on" : ""}`}
              aria-pressed={compare.active}
              disabled={!compare.active && compare.full}
              onClick={compare.onToggle}
              aria-label={t(compare.active ? "ui.card.compareRemove" : "ui.card.compareAdd", { model: tractor.model })}
              title={t(compare.active ? "ui.card.compareRemove" : compare.full ? "ui.card.compareFull" : "ui.card.compareAdd", { model: tractor.model })}
            >
              {compare.active ? <Check size={19} aria-hidden /> : <Plus size={19} aria-hidden />}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
