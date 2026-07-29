import { Link } from 'react-router-dom'
import { Heart, GitCompareArrows, MessageCircle, Gauge, Weight, Route } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../context/useAppStore'
import { localize, formatPrice } from '../data/tractors'
import { langCode, whatsappUrl } from '../utils/helpers'
export default function TractorCard({tractor}){
 const {t,i18n}=useTranslation(); const lang=langCode(i18n); const compare=useAppStore(s=>s.compare); const favorites=useAppStore(s=>s.favorites); const toggleCompare=useAppStore(s=>s.toggleCompare); const toggleFavorite=useAppStore(s=>s.toggleFavorite)
 const isCompare=compare.includes(tractor.slug), isFav=favorites.includes(tractor.slug)
 return <article className="tractor-card">
  <div className="card-media"><img src={tractor.thumb} alt={`${tractor.model} — ${localize(tractor.tagline,lang)}`} loading="lazy" width={tractor.thumbWidth} height={tractor.thumbHeight}/><div className="card-badges"><span>{tractor.power} {t('common.hp')}</span><span>4×4</span></div><button className={`icon-btn favorite ${isFav?'active':''}`} onClick={()=>toggleFavorite(tractor.slug)} aria-label={t('actions.favorite')}><Heart fill={isFav?'currentColor':'none'}/></button></div>
  <div className="card-body"><div className="card-kicker">CHANGFA · {tractor.series} SERIES</div><h3><Link to={`/tractors/${tractor.slug}`}>{tractor.model}</Link></h3><p>{localize(tractor.tagline,lang)}</p><div className="mini-specs"><span><Gauge/> {tractor.gears}</span><span><Weight/> {tractor.mass} кг</span><span><Route/> {tractor.wheelbase ? `${tractor.wheelbase} мм` : t('common.notConfirmed')}</span></div><div className="card-price">{tractor.price ? formatPrice(tractor.price) : t('catalog.priceRequest')}</div><div className="card-actions"><Link className="btn btn-dark" to={`/tractors/${tractor.slug}`}>{t('actions.details')}</Link><button className={`btn btn-ghost ${isCompare?'selected':''}`} onClick={()=>toggleCompare(tractor.slug)}><GitCompareArrows size={17}/>{isCompare?t('actions.removeCompare'):t('actions.compare')}</button></div><a className="card-whatsapp" href={whatsappUrl(`Здравствуйте! Хочу узнать о ${tractor.model}.`)} target="_blank" rel="noreferrer"><MessageCircle size={17}/>{t('actions.whatsapp')}</a></div>
 </article>
}
