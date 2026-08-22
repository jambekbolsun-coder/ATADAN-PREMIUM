"use client";

import Image from "next/image";
import { ArrowDown, ArrowUpRight, BadgeCheck, Banknote, Camera as Instagram, Headphones, Pause, Play, ShieldCheck, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import type { Tractor } from "../types";
import { Link } from "./SiteLink";
import { LeadForm } from "./LeadForm";
import { MotionReveal } from "./MotionReveal";
import { TractorCard } from "./TractorCard";
import { useI18n } from "./I18n";

const heroSlides = [
  { image: "/images/hero/atadan-field-wide.png", mobile: "/images/hero/atadan-field-mobile.png", key: "slide1", position: "center" },
  { image: "/images/hero/changfa-highway-4k.webp", key: "slide2", position: "center" },
  { image: "/images/hero/changfa-lineup-4k.webp", key: "slide3", position: "center" },
] as const;

export function HomeContent({ tractors }: { tractors: Tractor[] }) {
  const { t } = useI18n();
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const featured = [50, 90, 140, 240].map((hp) => tractors.find((tractor) => tractor.hp === hp)).filter((tractor): tractor is Tractor => Boolean(tractor));
  useEffect(() => {
    if (paused || interacting || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % heroSlides.length), 3000);
    return () => window.clearInterval(timer);
  }, [interacting, paused]);

  const slide = heroSlides[activeSlide];
  return <main className="home-v3">
    <MotionReveal className="home-hero-v3">
      <section className="hero-stage hero-carousel" aria-roledescription="carousel" aria-label="Changfa ATADAN" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteracting(false); }}>
        <div className="hero-media hero-slides" aria-hidden="true">
          {heroSlides.map((item, index) => <div className={`hero-slide ${activeSlide === index ? "active" : ""}`} key={item.key}>
            <Image className={item.mobile ? "hero-wide-image" : ""} src={item.image} alt="" fill priority={index === 0} sizes="100vw" style={{ objectPosition: item.position }} />
            {item.mobile ? <Image className="hero-mobile-image" src={item.mobile} alt="" fill priority sizes="100vw" /> : null}
          </div>)}
        </div>
        <div className="hero-shade" />
        <div className="hero-content-v3 section-shell">
          <div className="hero-copy-v3" key={slide.key}>
            <span className="hero-kicker hero-copy-enter" data-reveal><i />{t(`home.${slide.key}.kicker`)}</span>
            <h1 className="hero-copy-enter" data-reveal>{t(`home.${slide.key}.title`)}</h1>
            <p className="hero-copy-enter" data-reveal>{t(`home.${slide.key}.text`)}</p>
            <div className="hero-actions-v3" data-reveal>
              <Link className="hero-primary" href="/catalog">{t("home.catalogCta")}<ArrowUpRight size={19} /></Link>
              <a className="hero-secondary" href="https://wa.me/996706131404" target="_blank" rel="noreferrer">{t("home.consultCta")}</a>
            </div>
            <div className="hero-proof" data-reveal>
              <span><strong>6</strong>{t("home.marketYears")}</span>
              <span><strong>{tractors.length}</strong>{t("home.models")}</span>
              <span><strong>50–240</strong>{t("home.powerRange")}</span>
            </div>
          </div>
        </div>
        <div className="hero-carousel-controls">
          <div className="hero-dots">{heroSlides.map((item, index) => <button type="button" className={activeSlide === index ? "active" : ""} aria-label={t("home.carouselSlide", { current: index + 1 })} aria-current={activeSlide === index ? "true" : undefined} onClick={() => setActiveSlide(index)} key={item.key}><span /></button>)}</div>
          <button type="button" className="hero-pause" aria-label={paused ? t("home.carouselPlay") : t("home.carouselPause")} aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}</button>
        </div>
        <a className="hero-scroll" href="#lineup"><ArrowDown size={17} />{t("home.scroll")}</a>
      </section>
    </MotionReveal>

    <section className="catalog-preview section-shell" id="lineup">
      <div className="editorial-heading">
        <div><span className="section-label">{t("home.catalogLabel")}</span><h2>{t("home.catalogTitle")}</h2></div>
        <div><p>{t("home.catalogText")}</p><Link className="text-link" href="/catalog">{t("home.allModels")}<ArrowUpRight size={18} /></Link></div>
      </div>
      <div className="featured-grid-v3">{featured.map((tractor, index) => <TractorCard tractor={tractor} featured={index === 0} key={tractor.slug} />)}</div>
    </section>

    <section className="support-story section-shell">
      <div className="support-photo">
        <Image src="/images/hero/atadan-field-original.png" alt="Трактор Changfa в поле" fill sizes="(max-width: 820px) 100vw, 50vw" />
        <div className="support-photo-caption"><strong>ATADAN</strong><span>Changfa · Kyrgyzstan</span></div>
      </div>
      <div className="support-copy">
        <span className="section-label">{t("home.supportLabel")}</span>
        <h2>{t("home.supportTitle")}</h2>
        <p>{t("home.supportText")}</p>
        <div className="support-list">
          <article><BadgeCheck /><div><strong>{t("home.official")}</strong><span>{t("home.officialText")}</span></div></article>
          <article><Wrench /><div><strong>{t("home.service")}</strong><span>{t("home.serviceText")}</span></div></article>
          <article><Banknote /><div><strong>{t("home.finance")}</strong><span>{t("home.financeText")}</span></div></article>
          <article><Headphones /><div><strong>{t("home.consult")}</strong><span>{t("home.consultText")}</span></div></article>
        </div>
        <div className="support-actions"><Link className="dark-btn" href="/about">{t("home.aboutCta")}<ArrowUpRight size={18} /></Link><a className="instagram-link" href="https://www.instagram.com/atadan_kg" target="_blank" rel="noreferrer"><Instagram size={18} />@atadan_kg</a></div>
      </div>
    </section>

    <section className="power-showcase">
      <div className="section-shell">
        <span className="section-label light">{t("home.lineup")}</span>
        <h2>{t("home.lineupTitle")}</h2>
        <div className="power-links">{[50, 80, 100, 140, 180, 240].map((power) => <Link href={`/catalog?power=${power}`} key={power}><span>{power}</span><small>{t("common.hp")}</small><ArrowUpRight size={18} /></Link>)}</div>
      </div>
    </section>

    <section className="home-request-v3 section-shell">
      <div><span className="section-label">{t("home.requestLabel")}</span><h2>{t("home.requestTitle")}</h2><p>{t("home.requestText")}</p><div className="privacy-note"><ShieldCheck size={19} /><span>ATADAN · +996 706 131 404</span></div></div>
      <LeadForm />
    </section>
  </main>;
}
