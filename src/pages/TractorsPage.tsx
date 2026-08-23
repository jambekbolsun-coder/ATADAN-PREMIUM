import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { copy } from '../lib/i18n'
import { useCinematicMotion } from '../lib/useCinematicMotion'
import type { Locale, Tractor } from '../lib/types'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { TractorCard } from '../components/TractorCard'
import { EmptyState } from '../components/EmptyState'

export function TractorsPage({ locale }: { locale: Locale }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const t = copy(locale)
  const [items, setItems] = useState<Tractor[]>([]); const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(''); const [range, setRange] = useState('all'); const [status, setStatus] = useState('all')
  const [phone, setPhone] = useState('996706131404'); const [instagram, setInstagram] = useState('https://www.instagram.com/atadan_kg')
  useCinematicMotion(rootRef)
  useEffect(() => { Promise.all([supabase.from('atadan_tractors').select('*, translations:atadan_tractor_translations(*), media:atadan_tractor_media(*)').eq('published', true).order('horsepower', { ascending: true }), supabase.from('atadan_site_content').select('value').eq('key', 'contacts').maybeSingle()]).then(([productsResult, contactsResult]) => { if (productsResult.data) setItems(productsResult.data as unknown as Tractor[]); if (contactsResult.data?.value) { const value = contactsResult.data.value as any; setPhone(value.whatsapp || '996706131404'); setInstagram(value.instagram || 'https://www.instagram.com/atadan_kg') } setLoading(false) }) }, [])
  const filtered = useMemo(() => items.filter((tractor) => { const query = search.trim().toLowerCase(); if (query && !tractor.model.toLowerCase().includes(query)) return false; if (status !== 'all' && tractor.availability !== status) return false; const hp = tractor.horsepower || 0; if (range === '50-90' && !(hp >= 50 && hp < 90)) return false; if (range === '90-150' && !(hp >= 90 && hp < 150)) return false; if (range === '150-200' && !(hp >= 150 && hp < 200)) return false; if (range === '200+' && hp < 200) return false; return true }), [items, search, range, status])
  return <div ref={rootRef} className="catalog-page"><Header phone={phone}/><main>
    <section className="catalog-hero"><div className="catalog-hero__inner"><p className="catalog-hero__eyebrow" data-intro>CHANGFA</p><h1 data-intro>{t.allTractors}</h1><div className="catalog-hero__footer" data-intro><p>{t.featuredText}</p><span className="catalog-hero__count">{String(filtered.length).padStart(2, '0')}</span></div></div></section>
    <section className="catalog-body"><div className="catalog-toolbar" data-reveal><label className="catalog-search"><Search size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search}/></label><label className="select-shell"><select value={range} onChange={(event) => setRange(event.target.value)}><option value="all">{t.powerFilter}: all</option><option value="50-90">50–89 {t.hp}</option><option value="90-150">90–149 {t.hp}</option><option value="150-200">150–199 {t.hp}</option><option value="200+">200+ {t.hp}</option></select><ChevronDown size={17}/></label><label className="select-shell"><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">{t.status}: all</option><option value="in_stock">{t.inStock}</option><option value="in_transit">{t.inTransit}</option><option value="on_order">{t.onOrder}</option></select><ChevronDown size={17}/></label><button className="catalog-reset" onClick={() => { setSearch(''); setRange('all'); setStatus('all') }}><SlidersHorizontal size={17}/>{t.reset}</button></div>
      {loading
        ? <div className="catalog-grid"><div className="catalog-skeleton"/><div className="catalog-skeleton"/></div>
        : filtered.length
          ? <div className="catalog-grid">{filtered.map((tractor, index) => <TractorCard key={tractor.id} tractor={tractor} locale={locale} index={index}/>)}</div>
          : <EmptyState title={t.empty} text={t.emptyHint}/>}
    </section>
  </main><Footer locale={locale} phone={phone} instagram={instagram}/></div>
}
