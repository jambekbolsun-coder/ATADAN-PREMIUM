import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PageHero from '../components/PageHero'
import TractorCard from '../components/TractorCard'
import { tractors, powerBands, localize } from '../data/tractors'
import { jobOptions } from '../data/content'
import { langCode } from '../utils/helpers'

export default function CatalogPage(){
 const {t,i18n}=useTranslation(); const lang=langCode(i18n); const [params,setParams]=useSearchParams(); const [mobile,setMobile]=useState(false)
 const query=params.get('q')||'', power=params.get('power')||'', series=params.get('series')||'', job=params.get('job')||'', creeper=params.get('creeper')||'', sort=params.get('sort')||'power-asc'
 const update=(key,val)=>{const p=new URLSearchParams(params); val?p.set(key,val):p.delete(key);setParams(p)}
 const clear=()=>setParams({})
 const filtered=useMemo(()=>{
  let list=tractors.filter(x=>!query||x.model.toLowerCase().includes(query.toLowerCase()))
  if(power){const b=powerBands.find(x=>x.id===power); if(b)list=list.filter(x=>x.power>=b.min&&x.power<=b.max)}
  if(series)list=list.filter(x=>x.series===series)
  if(job)list=list.filter(x=>x.jobs.includes(job))
  if(creeper==='yes')list=list.filter(x=>x.creeper===true)
  if(creeper==='no')list=list.filter(x=>x.creeper===false)
  list=[...list].sort((a,b)=>sort==='power-desc'?b.power-a.power:sort==='mass-asc'?a.mass-b.mass:sort==='mass-desc'?b.mass-a.mass:a.power-b.power)
  return list
 },[query,power,series,job,creeper,sort])
 const FilterContent=()=> <>
  <div className="filter-title"><strong>Фильтры</strong><button onClick={clear}>{t('actions.reset')}</button></div>
  <label className="filter-field"><span>{t('catalog.search')}</span><div className="search-input"><Search size={17}/><input value={query} onChange={e=>update('q',e.target.value)} placeholder="CFF1204"/></div></label>
  <label className="filter-field"><span>{t('catalog.power')}</span><select value={power} onChange={e=>update('power',e.target.value)}><option value="">{t('catalog.all')}</option>{powerBands.map(b=><option value={b.id} key={b.id}>{localize(b.label,lang)}</option>)}</select></label>
  <label className="filter-field"><span>{t('catalog.series')}</span><select value={series} onChange={e=>update('series',e.target.value)}><option value="">{t('catalog.all')}</option>{[...new Set(tractors.map(x=>x.series))].map(s=><option value={s} key={s}>{s} Series</option>)}</select></label>
  <label className="filter-field"><span>{t('catalog.job')}</span><select value={job} onChange={e=>update('job',e.target.value)}><option value="">{t('catalog.all')}</option>{jobOptions.map(j=><option value={j.id} key={j.id}>{localize(j.label,lang)}</option>)}</select></label>
  <label className="filter-field"><span>{t('catalog.creeper')}</span><select value={creeper} onChange={e=>update('creeper',e.target.value)}><option value="">{t('catalog.any')}</option><option value="yes">{t('catalog.yes')}</option><option value="no">Нет</option></select></label>
 </>
 return <>
  <PageHero eyebrow="Каталог" title={t('catalog.title')} lead={t('catalog.lead')}/>
  <section className="catalog-section"><div className="container catalog-layout">
   <aside className="filters desktop-filters"><FilterContent/></aside>
   <div className="catalog-main"><div className="catalog-toolbar"><button className="mobile-filter-btn" onClick={()=>setMobile(true)}><SlidersHorizontal/>Фильтры</button><strong>{filtered.length} {t('catalog.found')}</strong><label>{t('catalog.sort')}<select value={sort} onChange={e=>update('sort',e.target.value)}><option value="power-asc">Мощность: по возрастанию</option><option value="power-desc">Мощность: по убыванию</option><option value="mass-asc">Масса: по возрастанию</option><option value="mass-desc">Масса: по убыванию</option></select></label></div>
   {filtered.length?<div className="cards-grid catalog-cards">{filtered.map(x=><TractorCard key={x.slug} tractor={x}/>)}</div>:<div className="empty-state"><div>🚜</div><h3>{t('catalog.empty')}</h3><button className="btn btn-dark" onClick={clear}>{t('actions.reset')}</button></div>}</div>
  </div></section>
  {mobile&&<div className="mobile-filter-overlay"><div className="mobile-filter-sheet"><button className="sheet-close" onClick={()=>setMobile(false)}><X/></button><FilterContent/><button className="btn btn-gold full" onClick={()=>setMobile(false)}>Показать {filtered.length}</button></div></div>}
 </>
}
