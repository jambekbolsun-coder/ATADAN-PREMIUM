import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Gauge, LandPlot } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { copy, tractorText } from '../lib/i18n'
import { trackEvent } from '../lib/analytics'
import { useCinematicMotion } from '../lib/useCinematicMotion'
import type { InstallmentProgram, Locale, Tractor } from '../lib/types'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { WhatsAppButton } from '../components/WhatsAppButton'
import { StoryRenderer } from '../components/StoryRenderer'
import { InstallmentCalculator } from '../components/InstallmentCalculator'

const statusKey = { in_stock: 'inStock', in_transit: 'inTransit', on_order: 'onOrder', unavailable: 'unavailable' } as const
export function TractorDetailPage({ locale }: { locale: Locale }) {
  const rootRef = useRef<HTMLDivElement>(null); const { slug } = useParams(); const t = copy(locale)
  const [tractor, setTractor] = useState<Tractor | null>(null); const [loading, setLoading] = useState(true); const [active, setActive] = useState(0)
  const [phone, setPhone] = useState('996706131404'); const [instagram, setInstagram] = useState('https://www.instagram.com/atadan_kg'); const engaged = useRef(false)
  useCinematicMotion(rootRef)
  useEffect(() => { if (!slug) return; Promise.all([supabase.from('atadan_tractors').select('*, translations:atadan_tractor_translations(*), media:atadan_tractor_media(*), spec_groups:atadan_spec_groups(*, specs:atadan_specs(*)), story_blocks:atadan_story_blocks(*), installment:atadan_installment_programs(*)').eq('slug', slug).eq('published', true).maybeSingle(), supabase.from('atadan_site_content').select('value').eq('key', 'contacts').maybeSingle()]).then(([productResult, contactsResult]) => { const item = productResult.data as unknown as Tractor | null; setTractor(item); if (item) trackEvent('product_view', { tractorId: item.id, locale }); if (contactsResult.data?.value) { const value = contactsResult.data.value as any; setPhone(value.whatsapp || '996706131404'); setInstagram(value.instagram || 'https://www.instagram.com/atadan_kg') } setLoading(false) }) }, [slug, locale])
  useEffect(() => { if (!tractor) return; const fire = () => { if (engaged.current) return; engaged.current = true; trackEvent('engaged_product_view', { tractorId: tractor.id, locale }) }; const timer = window.setTimeout(fire, 20000); const onScroll = () => { const height = document.documentElement.scrollHeight - innerHeight; if (height > 0 && scrollY / height > .5) fire() }; addEventListener('scroll', onScroll, { passive: true }); return () => { clearTimeout(timer); removeEventListener('scroll', onScroll) } }, [tractor, locale])
  if (loading) return <div className="product-loading">{t.loading}</div>
  if (!tractor) return <div className="product-not-found"><Header/><div><h1>{t.notFound}</h1><Link to={`/${locale}/tractors`}><ArrowLeft size={17}/>{t.back}</Link></div></div>

  const translation = tractorText(tractor.translations, locale)
  const images = (tractor.media || []).filter((media) => media.kind === 'image').sort((a, b) => a.sort_order - b.sort_order)
  const hero = images.find((media) => media.role === 'hero') || images[0]
  const installment = tractor.installment?.find((program) => program.enabled) as InstallmentProgram | undefined
  const stories = (tractor.story_blocks || []).sort((a, b) => a.sort_order - b.sort_order)
  const groups = (tractor.spec_groups || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const displayTitle = translation?.title || tractor.model
  const wa = locale === 'kg' ? `Саламатсызбы! Мени CHANGFA ${tractor.model} трактору кызыктырат. Консультация алгым келет.` : locale === 'en' ? `Hello! I am interested in the CHANGFA ${tractor.model} tractor. I would like a consultation.` : `Здравствуйте! Меня интересует трактор CHANGFA ${tractor.model}. Хочу получить консультацию.`
  const alt = (media: any) => media?.[`alt_${locale}`] || displayTitle
  const currentImage = images[active]?.url || hero?.url || '/media/tractor-sequence/tractor-06.webp'

  return <div ref={rootRef} className="detail-page"><Header phone={phone}/><main>
    <section className="product-stage">
      <div className="product-stage__media"><img src={currentImage} alt={alt(images[active] || hero)}/><Link to={`/${locale}/tractors`} className="product-stage__back"><ArrowLeft size={15}/>{t.allTractors}</Link><div className="product-stage__counter">{String(active + 1).padStart(2, '0')} / {String(Math.max(1, images.length)).padStart(2, '0')}</div>{images.length > 1 && <div className="product-stage__gallery">{images.slice(0, 8).map((media, index) => <button key={media.id} onClick={() => { setActive(index); trackEvent('gallery_interaction', { tractorId: tractor.id, locale, metadata: { image_index: index } }) }} className={`product-stage__thumb ${index === active ? 'is-active' : ''}`}><img src={media.url} alt={alt(media)}/></button>)}</div>}</div>
      <div className="product-stage__content"><p className="product-stage__kicker" data-intro>CHANGFA</p><h1 data-intro>{displayTitle}</h1>{translation?.short_description && <p className="product-stage__summary" data-intro>{translation.short_description}</p>}<div className="product-stage__highlights" data-intro>{tractor.horsepower && <div><Gauge size={19}/><span>{t.power}</span><strong>{tractor.horsepower} {t.hp}</strong></div>}{tractor.recommended_hectares && <div><LandPlot size={19}/><span>{t.hectares}</span><strong>{tractor.recommended_hectares}</strong></div>}</div><div className="product-stage__commerce" data-intro><span className="product-stage__status">{t[statusKey[tractor.availability]]}</span>{tractor.show_price && tractor.price != null ? <strong className="product-stage__price">{new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: 0 }).format(tractor.price)} {tractor.currency}</strong> : <strong className="product-stage__price">{t.askPrice}</strong>}<WhatsAppButton phone={phone} message={wa} locale={locale} tractorId={tractor.id} location="tractor_top"/></div>
      </div>
    </section>
    {stories.map((block) => <StoryRenderer key={block.id || `${block.type}-${block.sort_order}`} block={block} locale={locale} tractorId={tractor.id}/>) }
    {groups.length > 0 && <section className="specs-section"><div className="specs-section__layout"><div className="specs-section__intro" data-reveal><p className="section-eyebrow">CHANGFA {tractor.model}</p><h2>{t.specs}</h2></div><div className="specs-groups">{groups.map((group) => <div key={group.id} className="specs-group" data-reveal><h3>{locale === 'kg' ? (group.title_kg || group.title_ru) : locale === 'en' ? (group.title_en || group.title_ru) : group.title_ru}</h3><dl className="specs-list">{(group.specs || []).sort((a, b) => a.sort_order - b.sort_order).map((spec) => <div key={spec.id} className="specs-list__row"><dt>{locale === 'kg' ? (spec.label_kg || spec.label_ru) : locale === 'en' ? (spec.label_en || spec.label_ru) : spec.label_ru}</dt><dd>{spec.value}</dd></div>)}</dl></div>)}</div></div></section>}
    {installment && tractor.price != null && tractor.show_price && <section className="calculator-section"><div className="calculator-section__header" data-reveal><p className="section-eyebrow">CHANGFA {tractor.model}</p><h2>{t.installment}</h2></div><div className="calculator-wrap" data-reveal><InstallmentCalculator price={tractor.price} currency={tractor.currency} program={installment} locale={locale} tractorId={tractor.id} model={tractor.model} phone={phone}/></div></section>}
    <section className="product-cta" data-reveal><h2>{t.consult}</h2><WhatsAppButton phone={phone} message={wa} locale={locale} tractorId={tractor.id} location="tractor_bottom" className="action-button--dark"/><ArrowUpRight className="product-cta__arrow"/></section>
    <div className="mobile-sticky-action"><WhatsAppButton phone={phone} message={wa} locale={locale} tractorId={tractor.id} location="sticky_mobile"/></div>
  </main><Footer locale={locale} phone={phone} instagram={instagram}/></div>
}
