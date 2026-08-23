import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, MapPin, ShieldCheck } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { copy, localize } from '../lib/i18n'
import { useCinematicMotion } from '../lib/useCinematicMotion'
import type { Locale, SiteContentRow, Tractor } from '../lib/types'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { TractorCard } from '../components/TractorCard'
import { EmptyState } from '../components/EmptyState'
import { WhatsAppButton } from '../components/WhatsAppButton'
import { TractorScrollExperience } from '../components/TractorScrollExperience'
import { FieldWorkScene } from '../components/FieldWorkScene'

function asMap(rows: SiteContentRow[]) { return Object.fromEntries(rows.map((row) => [row.key, row.value])) as Record<string, any> }

export function HomePage({ locale }: { locale: Locale }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const t = copy(locale)
  const location = useLocation()
  const [tractors, setTractors] = useState<Tractor[]>([])
  const [content, setContent] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  useCinematicMotion(rootRef)

  useEffect(() => { Promise.all([supabase.from('atadan_site_content').select('key,value'), supabase.from('atadan_tractors').select('*, translations:atadan_tractor_translations(*), media:atadan_tractor_media(*)').eq('published', true).eq('featured', true).order('featured_order', { ascending: true }).limit(2)]).then(([contentResult, productsResult]) => { if (contentResult.data) setContent(asMap(contentResult.data as SiteContentRow[])); if (productsResult.data) setTractors(productsResult.data as unknown as Tractor[]); setLoading(false) }) }, [])
  useEffect(() => { if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' }), 100) }, [location.hash])

  const hero = content.hero || {}; const company = content.company || {}; const founder = content.founder || {}; const contacts = content.contacts || {}
  const phone = contacts.whatsapp || '996706131404'
  const heroTitle = localize(hero.title, locale, locale === 'kg' ? 'CHANGFA Кыргызстанда' : locale === 'en' ? 'CHANGFA in Kyrgyzstan' : 'CHANGFA в Кыргызстане')
  const heroSub = localize(hero.subtitle, locale, t.companySub); const eyebrow = localize(hero.eyebrow, locale, t.official)
  const heroUrl = hero.background_url || '/media/tractor-sequence/tractor-04.webp'
  const waMessage = locale === 'kg' ? 'Саламатсызбы! CHANGFA тракторлору боюнча консультация алгым келет.' : locale === 'en' ? 'Hello! I would like a consultation about CHANGFA tractors.' : 'Здравствуйте! Хочу получить консультацию по тракторам CHANGFA.'

  return <div ref={rootRef} className="home-page">
    <Header phone={phone}/>
    <main>
      <section className="home-hero">
        <img src={heroUrl} alt="CHANGFA tractor" className="home-hero__image" fetchPriority="high"/>
        <div className="home-hero__shade"/><div className="home-hero__grid"/>
        <div className="home-hero__inner"><div className="home-hero__copy"><p className="home-hero__eyebrow" data-intro>{eyebrow}</p><h1 data-intro>{heroTitle}</h1><p data-intro>{heroSub}</p><div className="home-hero__actions" data-intro><Link to={`/${locale}/tractors`} className="action-button action-button--primary">{t.catalog}<span className="action-button__icon"><ArrowUpRight size={14}/></span></Link><WhatsAppButton phone={phone} message={waMessage} locale={locale} location="hero" className="action-button--ghost"/></div></div><div className="home-hero__spec"><strong>50—240</strong><span>{t.hp}</span></div></div>
        <div className="home-hero__bottom"><span><ArrowDown size={13}/> Scroll</span><span>ATADAN × CHANGFA</span></div>
      </section>

      <section className="trust-strip" data-reveal>
        <div><span>01</span><strong><ShieldCheck size={17}/>{t.official}</strong></div>
        <div><span>02</span><strong>CHANGFA</strong></div>
        <div><span>03</span><strong>{company.years || '6+'} {t.yearsMarket}</strong></div>
        <div><span>04</span><strong><MapPin size={17}/>{t.kyrgyzstan}</strong></div>
      </section>

      <section className="featured-section">
        <div className="section-heading" data-reveal><div><p className="section-eyebrow">CHANGFA</p><h2>{t.featuredTitle}</h2><p>{t.featuredText}</p></div><Link to={`/${locale}/tractors`} className="section-heading__link">{t.allTractors} <ArrowUpRight size={15}/></Link></div>
        {loading
          ? <div className="featured-grid"><div className="catalog-skeleton"/><div className="catalog-skeleton"/></div>
          : tractors.length
            ? <div className="featured-grid">{tractors.map((tractor, index) => <TractorCard key={tractor.id} tractor={tractor} locale={locale} index={index}/>)}</div>
            : <EmptyState title={t.empty} text={t.emptyHint}/>}
      </section>

      <TractorScrollExperience title={t.comfortTitle} text={t.comfortText}/>
      <FieldWorkScene title={heroTitle} text={heroSub}/>

      <section id="about" className="about-section"><div className="about-section__intro" data-reveal><p className="section-eyebrow">ATADAN</p><h2>{localize(company.title, locale, 'ATADAN')}</h2></div><div className="about-section__body" data-reveal><p>{localize(company.text, locale, t.companySub)}</p><div className="about-section__facts"><div><strong>{company.years || '6+'}</strong><span>{t.yearsMarket}</span></div><div><strong>CHANGFA</strong><span>{t.official}</span></div></div></div></section>

      {founder.enabled && <section className="founder-section"><div className="founder-section__media">{founder.photo_url ? <img src={founder.photo_url} alt={founder.name || t.founder} loading="lazy"/> : <img src="/media/tractor-sequence/tractor-07.webp" alt=""/>}</div><div className="founder-section__content" data-reveal><p className="section-eyebrow">{t.founder}</p><h2>{founder.name}</h2><blockquote>{localize(founder.quote, locale)}</blockquote><div className="founder-section__meta"><strong>{founder.name}</strong><span>{localize(founder.role, locale)}</span></div></div></section>}

      <section id="contacts" className="contact-section"><div className="contact-section__copy" data-reveal><p className="section-eyebrow">ATADAN × CHANGFA</p><h2>{t.consult}</h2><p>{t.companySub}</p></div><div className="contact-section__actions" data-reveal><WhatsAppButton phone={phone} message={waMessage} locale={locale} location="contacts"/>{localize(contacts.address, locale) && <span>{t.address}: {localize(contacts.address, locale)}</span>}{localize(contacts.schedule, locale) && <span>{t.schedule}: {localize(contacts.schedule, locale)}</span>}</div></section>
    </main>
    <Footer locale={locale} phone={phone} instagram={contacts.instagram}/>
  </div>
}
