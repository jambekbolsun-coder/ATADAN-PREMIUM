import Image from "next/image";
import { Link } from "../components/SiteLink";
import { Armchair, ArrowUpRight, BadgeCheck, Check, Eye, Handshake, HeartHandshake, SlidersHorizontal, Sprout, Wind } from "lucide-react";
import { ScrollReveal } from "../components/ScrollReveal";
import { Trans } from "../components/I18n";
import { PageHero } from "../components/PageHero";
import { FounderLetter } from "../components/FounderLetter";
import { OfficeMap } from "../components/OfficeMap";
import { getRequestLocale } from "../lib/locale-server";
import { pageMetadata } from "../lib/seo";
import { copy } from "../data/site-copy";

export async function generateMetadata(){return pageMetadata("about","/about",await getRequestLocale())}

export default async function AboutPage() {
  const locale = await getRequestLocale();
  const t = (key: string) => copy[locale]?.[key] ?? copy.ru[key] ?? key;
  return <main className="about-page-v2">
    <PageHero image="/images/banners/about.webp" kickerId="about.kicker" titleId="about.title" subtitleId="about.subtitle" />

    <section className="section-shell about-story">
      <div><span className="section-label"><Trans id="about.work" /></span><h2><Trans id="about.storyTitle" /></h2><p><Trans id="about.story1" /></p><p><Trans id="about.story2" /></p><Link className="dark-btn" href="/catalog"><Trans id="about.catalog" /> <ArrowUpRight size={18} /></Link></div>
      <div className="about-image about-image-photo"><Image src="/images/about/changfa-field-4k.webp" alt={t("ui.about.photoAlt")} fill sizes="(max-width: 820px) 100vw, 52vw" /></div>
    </section>

    <section className="about-comfort">
      <div className="section-shell">
        <div className="about-comfort-heading"><span className="section-label light"><Trans id="about.comfortLabel" /></span><h2><Trans id="about.comfortTitle" /></h2><p><Trans id="about.comfortIntro" /></p></div>
        <ScrollReveal className="comfort-explainer-grid cx-v5">
          {([[Armchair,"Seat",1],[Eye,"View",2],[SlidersHorizontal,"Control",3],[Wind,"Climate",4]] as const).map(([Icon,key,n])=>(
            <article key={key} data-reveal><div className="cx-top"><i><Icon aria-hidden="true" /></i><small>{String(n).padStart(2,"0")}</small></div><h3><Trans id={`about.comfort${key}`} /></h3><p><Trans id={`about.comfort${key}Text`} /></p><span className="cx-tag"><Check size={15} aria-hidden="true" /><Trans id={`ui.about.comfortTag${n}`} /></span></article>
          ))}
        </ScrollReveal>
        <div className="about-comfort-foot"><p className="about-comfort-note"><BadgeCheck size={18} aria-hidden="true" /><Trans id="about.comfortNote" /></p><Link className="cx-cta" href="/catalog"><Trans id="ui.about.comfortCta" /><ArrowUpRight size={17} aria-hidden="true" /></Link></div>
      </div>
    </section>

    <section className="founder-message">
      <div className="section-shell founder-message-layout">
        <aside className="founder-profile">
          <div className="founder-portrait"><Image src="/images/about/founder-portrait-4k.webp" alt={`${t("about.founderName")}: ATADAN`} fill sizes="(max-width: 820px) 100vw, 38vw" /></div>
          <div className="founder-identity"><span><Trans id="about.founderRole" /></span><h3><Trans id="about.founderName" /></h3><p>{t("ui.about.founderTag")}</p></div>
        </aside>
        <FounderLetter />
      </div>
      <div className="section-shell founder-impact">
        <span><strong>15+</strong><Trans id="about.founderExperience" /></span>
        <span><strong>2024</strong><Trans id="about.founderDealer" /></span>
        <span><strong>6</strong><Trans id="about.companyYears" /></span>
      </div>
    </section>

    <section className="section-shell values-v5" aria-labelledby="values-title">
      <div className="values-v5-head"><span className="section-label"><Trans id="ui.about.valuesLabel" /></span><h2 id="values-title"><Trans id="ui.about.valuesTitle" /></h2></div>
      <ScrollReveal className="values-v5-grid">
        {([[BadgeCheck,"original",1],[Handshake,"clear",2],[HeartHandshake,"responsibility",3],[Sprout,"benefit",4]] as const).map(([Icon,key,n])=>(
          <article key={key} data-reveal><div className="values-v5-top"><i><Icon aria-hidden="true" /></i><small>{String(n).padStart(2,"0")}</small></div><h3><Trans id={`about.${key}`} /></h3><p><Trans id={`about.${key}Text`} /></p><ul><li><Check size={15} aria-hidden="true" /><Trans id={`ui.about.v${n}a`} /></li><li><Check size={15} aria-hidden="true" /><Trans id={`ui.about.v${n}b`} /></li></ul></article>
        ))}
      </ScrollReveal>
    </section>
    <OfficeMap />
  </main>;
}
