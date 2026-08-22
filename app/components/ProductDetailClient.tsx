"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Banknote, ChevronDown, Gauge, MessageCircle, ShieldCheck, Sprout, Wrench } from "lucide-react";
import { useState } from "react";
import type { Tractor } from "../types";
import { formatPrice } from "../lib/format";
import { LeadForm } from "./LeadForm";
import { Link } from "./SiteLink";
import { TractorCard } from "./TractorCard";
import { useI18n } from "./I18n";

export function ProductDetailClient({ tractor, related }: { tractor: Tractor; related: Tractor[] }) {
  const { t } = useI18n();
  const rawGallery = (tractor.images?.length ? tractor.images : [tractor.image]).slice(0, 5);
  const preferredIndex = rawGallery.findIndex((image) => !image.includes("/images/tractors/"));
  const gallery = preferredIndex > 0 ? [rawGallery[preferredIndex], ...rawGallery.filter((_, index) => index !== preferredIndex)] : rawGallery;
  const [activeImage, setActiveImage] = useState(0);
  const [specsOpen, setSpecsOpen] = useState(false);
  const specs = Object.entries(tractor.specs);
  const visibleSpecs = specsOpen ? specs : specs.slice(0, 8);
  const monthly = tractor.price ? Math.ceil(tractor.price / 36) : null;

  function moveGallery(direction: -1 | 1) {
    setActiveImage((current) => (current + direction + gallery.length) % gallery.length);
  }

  return <main className="product-page-v3">
    <section className="product-detail-top section-shell">
      <div className="product-breadcrumb-v3"><Link href="/catalog"><ArrowLeft size={17} />{t("product.back")}</Link><span>Changfa {tractor.model}</span></div>
      <div className="product-detail-grid">
        <div className="product-gallery" aria-label={t("product.gallery")}>
          <div className={`gallery-main ${gallery[activeImage].includes("/images/tractors/") ? "product-cutout" : "series-photo"}`}>
            <span className={`stock-badge ${tractor.inStock ? "available" : "order"}`}>{tractor.inStock ? t("product.inStock") : t("product.onOrder")}</span>
            <Image key={gallery[activeImage]} src={gallery[activeImage]} alt={`Changfa ${tractor.model} — ${t("product.photo", { current: activeImage + 1, total: gallery.length })}`} fill priority={activeImage === 0} sizes="(max-width: 900px) 100vw, 58vw" />
            {gallery.length > 1 ? <div className="gallery-arrows"><button type="button" onClick={() => moveGallery(-1)} aria-label={t("product.prevPhoto")}><ArrowLeft /></button><button type="button" onClick={() => moveGallery(1)} aria-label={t("product.nextPhoto")}><ArrowRight /></button></div> : null}
            <span className="gallery-count">{t("product.photo", { current: activeImage + 1, total: gallery.length })}</span>
          </div>
          {gallery.length > 1 ? <div className="gallery-thumbs">{gallery.map((image, index) => <button type="button" className={`${activeImage === index ? "active" : ""} ${image.includes("/images/tractors/") ? "cutout-thumb" : ""}`} aria-label={t("product.photo", { current: index + 1, total: gallery.length })} onClick={() => setActiveImage(index)} key={`${image}-${index}`}><Image src={image} alt="" fill sizes="96px" /></button>)}</div> : null}
          <p className="gallery-origin"><BadgeCheck size={17} />{t("product.gallery")}</p>
        </div>

        <aside className="product-buy-card">
          <div className="buy-card-heading"><span>{tractor.category}</span><small>Changfa · ATADAN</small></div>
          <h1>Changfa <strong>{tractor.model}</strong></h1>
          <p className="product-lead-copy">{tractor.description}</p>
          <div className="buy-key-specs">
            <div><Gauge /><span>{t("product.power")}<strong>{tractor.hp} {t("common.hp")}</strong></span></div>
            <div><Sprout /><span>{t("product.area")}<strong>{tractor.farmArea}</strong></span></div>
            <div><BadgeCheck /><span>{t("product.drive")}<strong>4×4</strong></span></div>
          </div>
          <div className="buy-price"><span>{t("product.cost")}</span><strong>{tractor.price ? formatPrice(tractor.price) : t("product.priceOnRequest")}</strong><small>{t("product.costNote")}</small></div>
          <div className="installment-panel"><Banknote /><div><span>{t("product.installment")}</span><strong>{monthly ? `${new Intl.NumberFormat("ru-RU").format(monthly)} сом / ${t("common.month")}` : t("product.fromMonthly")}</strong></div></div>
          <div className="buy-actions"><a className="hero-primary" href="#request"><MessageCircle size={18} />{t("product.offer")}</a><a className="call-action" href="tel:+996706131404">{t("product.phone")}</a></div>
          <div className="buy-assurance"><ShieldCheck size={18} /><span>{t("product.assurance")}</span></div>
        </aside>
      </div>
    </section>

    <section className="product-comfort section-shell">
      <div className="comfort-copy"><span className="section-label">{t("product.comfortLabel")}</span><h2>{t("product.comfortTitle")}</h2><p><strong>{tractor.comfort}.</strong> {t("product.comfortText")}</p></div>
      <div className="comfort-points">
        <article><BadgeCheck /><span>{t("product.featureVision")}</span></article>
        <article><Wrench /><span>{t("product.featureService")}</span></article>
        <article><ShieldCheck /><span>{t("product.featureDrive")}</span></article>
      </div>
    </section>

    <section className="product-specs-v3 section-shell">
      <div className="specs-feed-card">
        <div className="specs-heading"><div><span className="section-label">{t("product.specLabel")}</span><h2>{t("product.specTitle")}</h2></div><p>{t("product.specNote")}</p></div>
        <div className={`specs-grid-v3 ${specsOpen ? "expanded" : ""}`}>{visibleSpecs.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        <div className="specs-footer">
          {specs.length > 8 ? <button type="button" className={`specs-toggle ${specsOpen ? "open" : ""}`} onClick={() => setSpecsOpen((value) => !value)} aria-expanded={specsOpen}>{specsOpen ? t("product.hide") : t("product.showMore")}<ChevronDown size={18} /></button> : null}
          {tractor.sourceUrl ? <a className="source-link-v3" href={tractor.sourceUrl} target="_blank" rel="noreferrer">{t("product.source")}<ArrowUpRight size={17} /></a> : null}
        </div>
      </div>
    </section>

    <section className="product-request-v3" id="request"><div className="section-shell product-request-inner"><div><span className="section-label light">{t("product.requestLabel")}</span><h2>{t("product.requestTitle", { model: tractor.model })}</h2><p>{t("product.requestText")}</p></div><LeadForm tractorSlug={tractor.slug} tractorModel={tractor.model} /></div></section>

    <section className="related-v3 section-shell"><div className="editorial-heading"><div><span className="section-label">{t("product.relatedLabel")}</span><h2>{t("product.relatedTitle")}</h2></div><Link className="text-link" href="/catalog">{t("product.allCatalog")}<ArrowUpRight size={17} /></Link></div><div className="catalog-grid related-grid">{related.map((item) => <TractorCard tractor={item} key={item.slug} />)}</div></section>
  </main>;
}
