"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Banknote, FileSignature, Gauge, KeyRound, MessageCircle, Package, ShieldCheck, Sprout, Wrench } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { useSiteSettings } from "./SiteSettings";
import { tractorGearbox, tractorMaxSpeed, tractorTractionKn } from "../lib/tractor-facts";
import { FinanceCalculator } from "./FinanceCalculator";
import { ProductVideo } from "./ProductVideo";
import { ProductSpecs } from "./ProductSpecs";
import { leasePreview } from "../lib/lease-preview";
import { useState } from "react";
import type { Tractor } from "../types";
import { formatApproximateUsdPrice, formatPrice } from "../lib/format";
import { LeadForm } from "./LeadForm";
import { Link } from "./SiteLink";
import { TractorCard } from "./TractorCard";
import { useI18n } from "./I18n";
import type { LeasePublicConfig } from "../lib/leasing";
import type { UsdKgsRate } from "../lib/exchange-rate";
import { localizeTractor } from "../lib/tractor-localization";
import { trackAnalyticsEvent } from "../lib/analytics-client";

export function ProductDetailClient({ tractor, related, leasingConfig, usdKgsRate }: { tractor: Tractor; related: Tractor[]; leasingConfig:LeasePublicConfig; usdKgsRate: UsdKgsRate | null }) {
  const { t, locale } = useI18n();
  const localized = localizeTractor(tractor, locale);
  const rawGallery = (tractor.images?.length ? tractor.images : [tractor.image]).slice(0, 7);
  const preferredIndex = rawGallery.findIndex((image) => !image.includes("/images/tractors"));
  const gallery = preferredIndex > 0 ? [rawGallery[preferredIndex], ...rawGallery.filter((_, index) => index !== preferredIndex)] : rawGallery;
  const [activeImage, setActiveImage] = useState(0);
  const settings = useSiteSettings();
  const numberLocale = locale === "en" ? "en-US" : "ru-RU";
  const fmtNum = (value: number) => new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 1 }).format(value);
  const factGearbox = tractorGearbox(tractor), factTraction = tractorTractionKn(tractor), factSpeed = tractorMaxSpeed(tractor);
  const modelNumbers = ([
    [t("ui.card.power"), `${tractor.hp} ${t("common.hp")}`],
    factGearbox ? [t("ui.card.gearbox"), factGearbox] : null,
    factTraction ? [t("ui.card.traction"), `${fmtNum(factTraction)} ${t("ui.card.kn")}`] : null,
    factSpeed ? [t("ui.cat.cmp.speed"), t("ui.cat.speedUpTo", { n: factSpeed })] : null,
  ] as Array<[string, string] | null>).filter((item): item is [string, string] => Boolean(item));
  const bankCount = leasingConfig.programs.length;
  const whyItems = [
    { id: 1, Icon: BadgeCheck, text: t("ui.prod.why1t"), href: "/about" },
    { id: 2, Icon: FileSignature, text: t("ui.prod.why2t"), href: "" },
    { id: 3, Icon: Banknote, text: bankCount ? t("ui.prod.why3t", { n: bankCount }) : t("ui.prod.why3t0"), href: "#leasing" },
    { id: 4, Icon: KeyRound, text: t("ui.prod.why4t"), href: "" },
    { id: 5, Icon: Wrench, text: t("ui.prod.why5t"), href: "/service" },
    { id: 6, Icon: Package, text: t("ui.prod.why6t"), href: "/parts" },
  ];
  const discount = Math.min(90, Math.max(0, tractor.discountPercent ?? 0));
  const salePrice = tractor.price && discount ? Math.round(tractor.price * (1 - discount / 100)) : tractor.price;


  function moveGallery(direction: -1 | 1) {
    setActiveImage((current) => (current + direction + gallery.length) % gallery.length);
  }

  return <main className="product-page-v3">
    <section className="product-detail-top section-shell">
      <div className="product-breadcrumb-v3"><Link href="/catalog"><ArrowLeft size={17} />{t("product.back")}</Link><span>Changfa {tractor.model}</span></div>
      <div className="product-detail-grid">
        <div className="product-gallery" aria-label={t("product.gallery")}>
          <div className={`gallery-main ${gallery[activeImage].includes("/images/tractors") ? "product-cutout" : "series-photo"}`}>
            <span className={`stock-badge ${tractor.inStock ? "available" : "order"}`}>{tractor.inStock ? t("product.inStock") : t("product.onOrder")}</span>
            {discount ? <span className="promotion-badge detail-promo"><small>{tractor.promotionLabel || t("product.promo")}</small><strong>−{discount}%</strong></span> : null}
            <Image key={gallery[activeImage]} src={gallery[activeImage]} alt={`Changfa ${tractor.model}: ${t("product.photo", { current: activeImage + 1, total: gallery.length })}`} fill priority={activeImage === 0} sizes="(max-width: 900px) 100vw, 58vw" />
            {gallery.length > 1 ? <div className="gallery-arrows"><button type="button" onClick={() => moveGallery(-1)} aria-label={t("product.prevPhoto")}><ArrowLeft /></button><button type="button" onClick={() => moveGallery(1)} aria-label={t("product.nextPhoto")}><ArrowRight /></button></div> : null}
            <span className="gallery-count">{t("product.photo", { current: activeImage + 1, total: gallery.length })}</span>
          </div>
          {gallery.length > 1 ? <div className="gallery-thumbs">{gallery.map((image, index) => <button type="button" className={`${activeImage === index ? "active" : ""} ${image.includes("/images/tractors") ? "cutout-thumb" : ""}`} aria-label={t("product.photo", { current: index + 1, total: gallery.length })} aria-current={activeImage === index ? "true" : undefined} onClick={() => setActiveImage(index)} key={`${image}-${index}`}><Image src={image} alt="" fill sizes="96px" /></button>)}</div> : null}
          <p className="gallery-origin"><BadgeCheck size={17} />{t("product.gallery")}</p>
        </div>

        <aside className="product-buy-card">
          <div className="buy-card-heading"><span>{localized.category}</span><small>Changfa · ATADAN</small></div>
          <h1>Changfa <strong>{tractor.model}</strong></h1>
          <p className="product-lead-copy">{localized.description}</p>
          <div className="buy-key-specs">
            <div><Gauge /><span>{t("product.power")}<strong>{tractor.hp} {t("common.hp")}</strong></span></div>
            <div><Sprout /><span>{t("product.area")}<strong>{localized.farmArea}</strong></span></div>
            <div><BadgeCheck /><span>{t("product.drive")}<strong>4×4</strong></span></div>
          </div>
          <div className={`buy-price ${discount && tractor.price ? "has-discount" : ""}`}><span>{t("product.cost")}</span>{discount && tractor.price ? <del>{formatPrice(tractor.price, locale)}</del> : null}<strong>{salePrice ? formatPrice(salePrice, locale) : formatApproximateUsdPrice(tractor.approximatePriceUsd, locale)}</strong><small>{!salePrice && tractor.approximatePriceUsd ? t("ui.product.usdNote") : t("product.costNote")}</small></div>
          <div className="installment-panel"><Banknote /><div><span>{t("product.installment")}</span><strong><a href="#leasing" onClick={()=>trackAnalyticsEvent({path:window.location.pathname,tractorSlug:tractor.slug,eventType:"model_interest"})}>{t("finance.calcCta")}</a></strong></div></div>
          <div className="buy-actions"><a className="primary-btn" href="#request" onClick={()=>trackAnalyticsEvent({path:window.location.pathname,tractorSlug:tractor.slug,eventType:"model_interest"})}><MessageCircle size={19}/>{t("contacts.manager")}</a><a className="call-action" href="tel:+996706131404" onClick={()=>trackAnalyticsEvent({path:window.location.pathname,tractorSlug:tractor.slug,eventType:"model_interest"})}>{t("product.phone")}</a></div>
          <div className="buy-assurance"><ShieldCheck size={18} /><span>{t("product.assurance")}</span></div>
        </aside>
      </div>
    </section>

    <section className="product-comfort product-comfort-v5 section-shell">
      <div className="comfort-copy"><span className="section-label">{t("product.comfortLabel")}</span><h2>{t("product.comfortTitle")}</h2><p><strong>{localized.comfort}.</strong> {t("product.comfortText")}</p>
        {modelNumbers.length ? <div className="pc-numbers"><small>{t("ui.prod.numbers")}</small><dl>{modelNumbers.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div> : null}
      </div>
      <ScrollReveal className="comfort-points pc-points">
        <article data-reveal><i><BadgeCheck aria-hidden /></i><div><h3>{t("product.featureVision")}</h3><p>{t("ui.prod.visionText")}</p></div></article>
        <article data-reveal><i><Wrench aria-hidden /></i><div><h3>{t("product.featureService")}</h3><p>{t("ui.prod.serviceText")}</p></div></article>
        <article data-reveal><i><ShieldCheck aria-hidden /></i><div><h3>{t("product.featureDrive")}</h3><p>{t("ui.prod.driveText")}</p></div></article>
      </ScrollReveal>
    </section>

    <section className="why-atadan section-shell" aria-labelledby="why-atadan-title">
      <div className="why-head">
        <div><span className="section-label">{t("ui.prod.whyLabel")}</span><h2 id="why-atadan-title">{t("ui.prod.whyTitle")}</h2></div>
        <p>{t("ui.prod.whyText", { year: 2024, exp: 15 })}</p>
      </div>
      <ScrollReveal className="why-grid">
        {whyItems.map(({ id, Icon, text, href }) => {
          const body = <><span className="why-icon"><Icon size={22} aria-hidden /></span><h3>{t(`ui.prod.why${id}`)}</h3><p>{text}</p>{href ? <ArrowUpRight className="why-arrow" size={18} aria-hidden /> : null}</>;
          return href ? <Link key={id} href={href} className="why-card is-link" data-reveal>{body}</Link> : <article key={id} className="why-card" data-reveal>{body}</article>;
        })}
      </ScrollReveal>
      <div className="why-cta">
        <a className="primary-btn" href="#request">{t("ui.prod.offer")}<ArrowRight size={18} aria-hidden /></a>
        <a className="ghost-btn" href={`https://wa.me/${settings.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Здравствуйте! Интересует Changfa ${tractor.model}. Подскажите цену и условия.`)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden />WhatsApp</a>
      </div>
    </section>

    {tractor.equipment?.length ? <section className="product-equipment section-shell">
      <div className="product-equipment-heading"><span className="section-label">{t("product.equipmentLabel")}</span><h2>{t("product.equipmentTitle")}</h2><p>{t("product.equipmentNote")}</p></div>
      <ul>{tractor.equipment.map((item) => <li key={item}><BadgeCheck size={19} aria-hidden="true" /><span>{item}</span></li>)}</ul>
    </section> : null}

    <ProductVideo tractor={tractor}/>
    <ProductSpecs tractor={tractor} />

    <div className="section-shell product-lease"><FinanceCalculator tractor={tractor} config={leasingConfig} usdKgsRate={usdKgsRate}/></div>
    <section className="product-request-v3" id="request"><div className="section-shell product-request-inner"><div><span className="section-label light">Changfa {tractor.model}</span><h2>{t("ui.product.discussTitle")}</h2><p>{t("ui.product.discussText")}</p></div><LeadForm tractorSlug={tractor.slug} tractorModel={tractor.model} manager /></div></section>

    <section className="related-v3 section-shell"><div className="editorial-heading"><div><span className="section-label">{t("product.relatedLabel")}</span><h2>{t("product.relatedTitle")}</h2></div><Link className="text-link" href="/catalog">{t("product.allCatalog")}<ArrowUpRight size={17} /></Link></div><div className="catalog-grid related-grid">{related.map((item) => <TractorCard tractor={item} key={item.slug} preview={leasePreview(item, leasingConfig, usdKgsRate)} />)}</div></section>
  </main>;
}
