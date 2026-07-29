import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { ArrowRight, BadgeCheck, Banknote, Cog, Headphones, MapPin, MessageCircle, PackageCheck, ShieldCheck, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import TractorCard from '../components/TractorCard'
import SectionHeader from '../components/SectionHeader'
import LeadForm from '../components/LeadForm'
import { tractors, localize, powerBands } from '../data/tractors'
import { jobOptions } from '../data/content'
import { langCode, whatsappUrl } from '../utils/helpers'

export default function HomePage(){
 const {t,i18n}=useTranslation(); const lang=langCode(i18n)
 const popular=tractors.filter(x=>['changfa-cff1204','changfa-cfg1604','changfa-cfj220'].includes(x.slug))
 const advantages=[
  [BadgeCheck,'Подбор без угадывания','Сначала выясняем площадь, почву, рельеф и оборудование. Потом предлагаем модель.'],
  [Banknote,'Помощь с лизингом','Объясняем первоначальный взнос, срок, ставку и документы простым языком.'],
  [Wrench,'Сервис после покупки','Принимаем обращения по диагностике, обслуживанию и ремонту техники.'],
  [PackageCheck,'Запчасти по модели','Подбираем детали по модели и серийному номеру, чтобы снизить риск ошибки.']
 ]
 return <>
  <Helmet><title>ATADAN — тракторы CHANGFA в Кыргызстане</title><meta name="description" content="Каталог тракторов CHANGFA, подбор по мощности, лизинг, сервис и запчасти в Кыргызстане."/></Helmet>
  <section className="hero"><div className="hero-noise"/><div className="container hero-grid">
   <motion.div className="hero-copy" initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:.65}}><span className="eyebrow light">{t('home.eyebrow')}</span><h1>{t('home.title')}</h1><p>{t('home.lead')}</p><div className="hero-actions"><Link className="btn btn-gold" to="/tractor-selector">{t('actions.select')}<ArrowRight size={18}/></Link><Link className="btn btn-outline-light" to="/catalog">{t('actions.catalog')}</Link></div><div className="hero-trust"><span><ShieldCheck/>Гарантия и поддержка</span><span><Cog/>Модели 90–240 л.с.</span><span><MapPin/>Бишкек, Шевченко 114</span></div></motion.div>
   <motion.div className="hero-visual" initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} transition={{duration:.8,delay:.1}}><div className="hero-ring"/><img src="/images/tractors/hero-tractor.webp" alt="Трактор CHANGFA от ATADAN" width="999" height="794"/><div className="hero-card"><span>Лизинг</span><strong>от 10%</strong><small>первоначальный взнос*</small></div><div className="hero-card second"><span>Мощность</span><strong>90–240</strong><small>лошадиных сил</small></div></motion.div>
  </div></section>

  <section className="quick-strip"><div className="container quick-grid">{advantages.map(([Icon,title,text])=><div className="quick-item" key={title}><Icon/><div><strong>{title}</strong><span>{text}</span></div></div>)}</div></section>

  <section className="section"><div className="container"><SectionHeader eyebrow="Каталог" title={t('home.popular')} text="Три уровня мощности для разных объёмов работы."/><div className="cards-grid">{popular.map(tn=><TractorCard tractor={tn} key={tn.slug}/>)}</div><div className="section-cta"><Link className="text-link" to="/catalog">Все модели <ArrowRight/></Link></div></div></section>

  <section className="section section-tinted"><div className="container"><SectionHeader eyebrow="Мощность" title={t('home.power')} text="Не выбирайте только по цифре. Учитывайте почву, ширину оборудования и объём работ."/><div className="power-grid">{powerBands.map((b,i)=><Link to={`/catalog?power=${b.id}`} className="power-card" key={b.id}><span>0{i+1}</span><strong>{localize(b.label,lang)}</strong><p>{i<2?'Для небольших и универсальных задач':i<4?'Для больших площадей и тяжёлой пахоты':'Для максимальной производительности'}</p><ArrowRight/></Link>)}</div></div></section>

  <section className="section"><div className="container"><SectionHeader eyebrow="Задача" title={t('home.jobs')} text="Выберите работу — сайт покажет подходящий диапазон мощности и модели."/><div className="job-grid">{jobOptions.slice(0,8).map((job,i)=><Link key={job.id} to={`/tractor-selector?job=${job.id}`} className="job-card"><div className="job-icon">{['🌱','🚜','🌾','🧑‍🌾','🛞','🏗️','⛰️','🗺️'][i]}</div><strong>{localize(job.label,lang)}</strong><span>{job.min}–{job.max} л.с.</span></Link>)}</div></div></section>

  <section className="split-section dark"><div className="container split-grid"><div><span className="eyebrow light">Финансирование</span><h2>{t('home.leasingTitle')}</h2><p>В предоставленных материалах указаны ориентиры: первоначальный взнос от 10%, ставка от 6% и срок до 7 лет. Банк принимает финальное решение после проверки документов.</p><ul className="check-list"><li>Покажем ориентировочный платёж</li><li>Объясним, какие данные подготовить</li><li>Не обещаем одобрение до решения банка</li></ul><Link className="btn btn-gold" to="/leasing">Рассчитать лизинг</Link></div><div className="leasing-showcase"><div><small>Стоимость CFJ220</small><strong>6 850 000 KGS</strong></div><div><small>Первоначальный взнос</small><strong>685 000 KGS</strong></div><div className="featured"><small>Ориентировочно</small><strong>≈ 90 100 KGS / мес.</strong><span>по расчёту из коммерческого предложения</span></div><p>* Без учёта страховки и возможных комиссий.</p></div></div></section>

  <section className="section"><div className="container"><SectionHeader eyebrow="После покупки" title={t('home.serviceTitle')} text="Трактор приносит деньги, когда работает. Поэтому сервис, расходники и понятная связь с поставщиком важны не меньше мощности."/><div className="service-panels"><Link to="/service" className="service-panel"><Wrench/><h3>Сервис</h3><p>Диагностика, плановое обслуживание и заявки на выездную помощь.</p><span>Подробнее <ArrowRight/></span></Link><Link to="/parts" className="service-panel"><PackageCheck/><h3>Запчасти</h3><p>Подбор по модели и серийному номеру, сервисные комплекты и расходники.</p><span>Открыть раздел <ArrowRight/></span></Link><Link to="/warranty" className="service-panel"><ShieldCheck/><h3>Гарантия</h3><p>Условия по CFJ220: 1 год или 1000 моточасов. По другим моделям — уточнение.</p><span>Условия <ArrowRight/></span></Link></div></div></section>

  <section className="section section-tinted"><div className="container"><SectionHeader eyebrow="Понятная техника" title="Как трактор превращает мощность в работу" text="Мы объясняем сложные узлы без лишней терминологии."/><div className="guide-grid"><div className="guide-image"><img src="/images/gallery/factory-close.webp" alt="Кабина и заднее колесо трактора CHANGFA" loading="lazy" width="899" height="601"/></div><div className="guide-list"><Link to="/tractor-parts-guide#engine"><span>01</span><div><strong>Двигатель</strong><p>Создаёт силу для движения и оборудования.</p></div></Link><Link to="/tractor-parts-guide#gearbox"><span>02</span><div><strong>Коробка передач</strong><p>Выбирает: медленно и мощно или быстрее по дороге.</p></div></Link><Link to="/tractor-parts-guide#pto"><span>03</span><div><strong>ВОМ</strong><p>Передаёт вращение навесному оборудованию.</p></div></Link><Link to="/tractor-parts-guide#hydraulics"><span>04</span><div><strong>Гидравлика</strong><p>Поднимает и управляет навесным оборудованием.</p></div></Link></div></div></div></section>

  <section className="section"><div className="container"><SectionHeader eyebrow="Фото" title={t('home.realPhotos')} text="Скриншоты очищены от интерфейса телефона, чёрных полей и системных панелей."/><div className="photo-grid"><img src="/images/gallery/factory-side.webp" alt="Трактор CHANGFA на заводской площадке, вид сбоку" loading="lazy" width="899" height="601"/><img src="/images/gallery/factory-close.webp" alt="Крупный план трактора CHANGFA" loading="lazy" width="899" height="601"/><img src="/images/gallery/cfj220-studio.webp" alt="CHANGFA CFJ220 на белом фоне" loading="lazy" width="899" height="1153"/></div></div></section>

  <section className="final-cta"><div className="container final-grid"><div><span className="eyebrow light">Консультация</span><h2>{t('home.finalTitle')}</h2><p>Напишите площадь хозяйства, район, тип почвы и оборудование. Мы предложим подходящие модели и честно отметим, что нужно уточнить.</p><a className="btn btn-outline-light" href={whatsappUrl()} target="_blank" rel="noreferrer"><MessageCircle/>WhatsApp</a></div><LeadForm source="home-final" compact/></div></section>
 </>
}
