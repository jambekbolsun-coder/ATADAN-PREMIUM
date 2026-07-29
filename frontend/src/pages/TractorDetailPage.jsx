import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowRight, Banknote, Check, GitCompareArrows, Heart, MessageCircle, PackageCheck, ShieldCheck, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getTractor, tractors, localize, formatPrice } from '../data/tractors'
import { implements, faq } from '../data/content'
import { langCode, whatsappUrl } from '../utils/helpers'
import { useAppStore } from '../context/useAppStore'
import Breadcrumbs from '../components/Breadcrumbs'
import SpecTable from '../components/SpecTable'
import LeasingCalculator from '../components/LeasingCalculator'
import ColorConfigurator from '../components/ColorConfigurator'
import TractorCard from '../components/TractorCard'
import LeadForm from '../components/LeadForm'
import NotFoundPage from './NotFoundPage'

export default function TractorDetailPage(){
 const {slug}=useParams(); const tractor=getTractor(slug); const {t,i18n}=useTranslation(); const lang=langCode(i18n); const [activeImage,setActiveImage]=useState(0)
 const compare=useAppStore(s=>s.compare), favorites=useAppStore(s=>s.favorites), toggleCompare=useAppStore(s=>s.toggleCompare), toggleFavorite=useAppStore(s=>s.toggleFavorite)
 if(!tractor)return <NotFoundPage/>
 const gallery=tractor.gallery||[tractor.image,'/images/gallery/factory-close.webp','/images/gallery/factory-side.webp']
 const related=tractors.filter(x=>x.slug!==tractor.slug).sort((a,b)=>Math.abs(a.power-tractor.power)-Math.abs(b.power-tractor.power)).slice(0,3)
 return <>
  <Helmet><title>{tractor.model} — характеристики и лизинг | ATADAN</title><meta name="description" content={`${tractor.model}, ${tractor.power} л.с. Характеристики, простые объяснения, лизинг, сервис и запчасти.`}/></Helmet>
  <section className="product-top"><div className="container"><Breadcrumbs items={[{label:'Каталог',to:'/catalog'},{label:tractor.model}]}/><div className="product-grid">
   <div className="product-gallery"><div className="main-image"><img src={gallery[activeImage]} alt={`${tractor.model}, фото ${activeImage+1}`} width="1100" height="850"/></div><div className="thumb-row">{gallery.map((img,i)=><button className={activeImage===i?'active':''} onClick={()=>setActiveImage(i)} key={img}><img src={img} alt="" loading="lazy"/></button>)}</div></div>
   <div className="product-info"><div className="product-series">CHANGFA · {tractor.series} SERIES</div><h1>{tractor.model}</h1><p className="product-tagline">{localize(tractor.tagline,lang)}</p><div className="product-price">{tractor.price?tractor.priceLabel||formatPrice(tractor.price):t('catalog.priceRequest')}</div><div className="availability-row"><span className="status-dot"/> {t('catalog.inStock')} <span>•</span> {tractor.power} {t('common.hp')} <span>•</span> 4×4</div><p>{localize(tractor.description,lang)}</p>
    <div className="key-spec-grid"><div><span>Мощность</span><strong>{tractor.power} л.с.</strong></div><div><span>Передачи</span><strong>{tractor.gears}</strong></div><div><span>Масса</span><strong>≈ {tractor.mass} кг</strong></div><div><span>Ходоуменьшитель</span><strong>{tractor.creeper===true?'Есть':tractor.creeper===false?'Нет':'Уточнить'}</strong></div></div>
    <div className="product-actions"><a className="btn btn-gold" href={whatsappUrl(`Здравствуйте! Интересует ${tractor.model}. Хочу узнать цену, наличие и комплектацию.`)} target="_blank" rel="noreferrer"><MessageCircle/>{t('actions.whatsapp')}</a><button className={`btn btn-ghost ${compare.includes(tractor.slug)?'selected':''}`} onClick={()=>toggleCompare(tractor.slug)}><GitCompareArrows/>{t('actions.compare')}</button><button className={`icon-btn large ${favorites.includes(tractor.slug)?'active':''}`} onClick={()=>toggleFavorite(tractor.slug)}><Heart fill={favorites.includes(tractor.slug)?'currentColor':'none'}/></button></div>
    <div className="product-note">{t('model.configurationNote')}</div>
   </div>
  </div></div></section>

  <section className="section section-tinted"><div className="container two-col"><div><span className="eyebrow">Практика</span><h2>{t('model.recommended')}</h2><p className="large-copy">{localize(tractor.recommendedFor,lang)}</p><div className="work-tags">{tractor.jobs.map(j=><span key={j}><Check/> {j.replaceAll('-',' ')}</span>)}</div></div><div className="confidence-card"><ShieldCheck/><h3>Проверенные и непроверенные данные разделены</h3><p>Цифры из коммерческого предложения и буклета показаны как подтверждённые источником. Параметры, зависящие от комплектации, отмечены отдельно.</p><Link to="/faq">Как мы работаем с характеристиками <ArrowRight/></Link></div></div></section>

  <section className="section"><div className="container"><div className="section-header"><span className="eyebrow">Техническая часть</span><h2>{t('model.specs')}</h2><p>Каждая строка содержит значение и объяснение, зачем оно нужно в реальной работе.</p></div><SpecTable specs={tractor.specs}/><div className="source-note">Источник основных данных: заводской каталог CHANGFA и коммерческие материалы ATADAN. Комплектация может отличаться.</div></div></section>

  <section className="section section-tinted"><div className="container"><div className="section-header"><span className="eyebrow">Внешний вид</span><h2>{t('model.colors')}</h2></div><ColorConfigurator image={tractor.image}/></div></section>

  <section className="section"><div className="container"><div className="section-header"><span className="eyebrow">Финансирование</span><h2>{t('leasing.title')}</h2><p>{t('leasing.lead')}</p></div><LeasingCalculator initialPrice={tractor.price||6850000}/><div className="leasing-facts"><div><Banknote/><strong>От 10%</strong><span>ориентир первоначального взноса</span></div><div><Banknote/><strong>От 6%</strong><span>ориентир годовой ставки в сомах</span></div><div><Banknote/><strong>До 7 лет</strong><span>срок из предоставленного предложения</span></div></div></div></section>

  <section className="split-section dark"><div className="container"><div className="section-header light"><span className="eyebrow light">Поддержка</span><h2>{t('model.service')}</h2><p>Сервис и запчасти снижают риск простоя в сезон.</p></div><div className="support-grid"><Link to="/service"><Wrench/><h3>Сервис</h3><p>Плановое обслуживание, диагностика и заявки на выезд.</p><span>Подробнее <ArrowRight/></span></Link><Link to="/parts"><PackageCheck/><h3>Запчасти</h3><p>Подбор деталей по модели и серийному номеру.</p><span>Подробнее <ArrowRight/></span></Link><Link to="/warranty"><ShieldCheck/><h3>Гарантия</h3><p>{tractor.warranty||'Условия зависят от модели и договора поставки.'}</p><span>Подробнее <ArrowRight/></span></Link></div></div></section>

  <section className="section"><div className="container"><div className="section-header"><span className="eyebrow">Совместимость</span><h2>{t('model.equipment')}</h2><p>Перед покупкой проверяются мощность, ВОМ, категория навески, гидравлика и масса оборудования.</p></div><div className="implement-strip">{implements.slice(0,4).map(i=><Link to="/implements" key={i.slug}><strong>{i.title}</strong><p>{i.text}</p><ArrowRight/></Link>)}</div></div></section>

  <section className="section section-tinted"><div className="container"><div className="section-header"><span className="eyebrow">FAQ</span><h2>Вопросы по модели и покупке</h2></div><div className="faq-list">{faq.slice(0,5).map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>

  <section className="section"><div className="container"><div className="section-header"><span className="eyebrow">Сравните</span><h2>{t('model.related')}</h2></div><div className="cards-grid">{related.map(x=><TractorCard tractor={x} key={x.slug}/>)}</div></div></section>

  <section className="final-cta"><div className="container final-grid"><div><span className="eyebrow light">Коммерческое предложение</span><h2>Получите расчёт по {tractor.model}</h2><p>Менеджер уточнит комплектацию, наличие, цену, условия лизинга и совместимое оборудование.</p></div><LeadForm source={`tractor:${tractor.slug}`} compact/></div></section>
 </>
}
