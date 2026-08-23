import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "../components/SiteLink";
import { Armchair, ArrowUpRight, BadgeCheck, Eye, Handshake, HeartHandshake, Quote, SlidersHorizontal, Sprout, Wind } from "lucide-react";
import { Trans } from "../components/I18n";
import { PageHero } from "../components/PageHero";

export const metadata: Metadata = { title: "О компании ATADAN Changfa", description: "ATADAN — официальный дистрибьютор тракторов Changfa в Кыргызстане, 6 лет на рынке." };

export default function AboutPage() {
  return <main className="about-page-v2">
    <PageHero image="/images/banners/about.webp" kickerId="about.kicker" titleId="about.title" subtitleId="about.subtitle" />

    <section className="section-shell about-story">
      <div><span className="section-label"><Trans id="about.work" /></span><h2><Trans id="about.storyTitle" /></h2><p><Trans id="about.story1" /></p><p><Trans id="about.story2" /></p><Link className="dark-btn" href="/catalog"><Trans id="about.catalog" /> <ArrowUpRight size={18} /></Link></div>
      <div className="about-image about-image-photo"><Image src="/images/about/changfa-field-4k.webp" alt="Трактор Changfa в поле у гор" fill sizes="(max-width: 820px) 100vw, 52vw" /></div>
    </section>

    <section className="about-comfort">
      <div className="section-shell">
        <div className="about-comfort-heading"><span className="section-label light"><Trans id="about.comfortLabel" /></span><h2><Trans id="about.comfortTitle" /></h2><p><Trans id="about.comfortIntro" /></p></div>
        <div className="comfort-explainer-grid">
          <article><i><Armchair aria-hidden="true" /></i><h3><Trans id="about.comfortSeat" /></h3><p><Trans id="about.comfortSeatText" /></p></article>
          <article><i><Eye aria-hidden="true" /></i><h3><Trans id="about.comfortView" /></h3><p><Trans id="about.comfortViewText" /></p></article>
          <article><i><SlidersHorizontal aria-hidden="true" /></i><h3><Trans id="about.comfortControl" /></h3><p><Trans id="about.comfortControlText" /></p></article>
          <article><i><Wind aria-hidden="true" /></i><h3><Trans id="about.comfortClimate" /></h3><p><Trans id="about.comfortClimateText" /></p></article>
        </div>
        <p className="about-comfort-note"><BadgeCheck size={18} aria-hidden="true" /><Trans id="about.comfortNote" /></p>
      </div>
    </section>

    <section className="founder-message">
      <div className="section-shell founder-message-layout">
        <aside className="founder-profile">
          <div className="founder-portrait"><Image src="/images/about/founder-portrait-4k.webp" alt="Islam Mirbek uulu — ATADAN" fill sizes="(max-width: 820px) 100vw, 38vw" /></div>
          <div className="founder-identity"><span><Trans id="about.founderRole" /></span><h3><Trans id="about.founderName" /></h3><p>ATADAN · CHANGFA · Кыргызстан</p></div>
        </aside>
        <article className="founder-letter">
          <header><span className="section-label"><Trans id="about.founderLabel" /></span><h2><Trans id="about.founderTitle" /></h2></header>
          <div className="founder-opening"><Quote size={30} aria-hidden="true" /><p><Trans id="about.founderP1" /></p></div>
          <div className="founder-letter-copy">
            <p><Trans id="about.founderP2" /></p>
            <p><Trans id="about.founderP3" /></p>
            <p><Trans id="about.founderP4" /></p>
            <p><Trans id="about.founderP5" /></p>
            <p><Trans id="about.founderP6" /></p>
            <p><Trans id="about.founderP7" /></p>
            <p><Trans id="about.founderP8" /></p>
            <p className="founder-conclusion"><Trans id="about.founderP9" /></p>
          </div>
          <footer><span><Trans id="about.founderSignoff" /></span><strong><Trans id="about.founderName" /></strong><small><Trans id="about.founderRole" /></small></footer>
        </article>
      </div>
      <div className="section-shell founder-impact">
        <span><strong>15+</strong><Trans id="about.founderExperience" /></span>
        <span><strong>2024</strong><Trans id="about.founderDealer" /></span>
        <span><strong>6</strong><Trans id="about.companyYears" /></span>
      </div>
    </section>

    <section className="section-shell values-grid"><article><BadgeCheck /><h3><Trans id="about.original" /></h3><p><Trans id="about.originalText" /></p></article><article><Handshake /><h3><Trans id="about.clear" /></h3><p><Trans id="about.clearText" /></p></article><article><HeartHandshake /><h3><Trans id="about.responsibility" /></h3><p><Trans id="about.responsibilityText" /></p></article><article><Sprout /><h3><Trans id="about.benefit" /></h3><p><Trans id="about.benefitText" /></p></article></section>
  </main>;
}
