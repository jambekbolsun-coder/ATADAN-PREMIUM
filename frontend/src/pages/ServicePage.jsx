import { CalendarCheck, Stethoscope, Wrench, Truck, ClipboardList, PhoneCall } from 'lucide-react'
import PageHero from '../components/PageHero'
import LeadForm from '../components/LeadForm'
const services=[
 [CalendarCheck,'Плановое обслуживание','Замена расходников и проверка узлов по регламенту.'],
 [Stethoscope,'Диагностика','Поиск причины неисправности до замены деталей.'],
 [Wrench,'Ремонт','Согласование работ, деталей и сроков после диагностики.'],
 [Truck,'Заявка на выезд','В коммерческом предложении указаны выездные бригады по КР. Географию и сроки нужно подтвердить.'],
 [ClipboardList,'Подготовка к сезону','Проверка жидкостей, фильтров, ремней, электрики, шин и креплений.'],
 [PhoneCall,'Удалённая консультация','Сбор симптомов, фото, видео и кодов ошибок до выезда специалиста.']
]
export default function ServicePage(){return <><PageHero eyebrow="Сервис" title="Поддержка техники до, во время и после сезона" lead="Принимаем заявки на обслуживание, диагностику, ремонт и подбор сервисных запчастей."/><section className="section"><div className="container service-grid">{services.map(([Icon,title,text])=><article key={title}><Icon/><h2>{title}</h2><p>{text}</p></article>)}</div></section><section className="section section-tinted"><div className="container process-grid"><div><span className="eyebrow">Заявка</span><h2>Как ускорить диагностику</h2></div>{[['01','Модель и серийный номер','Укажите точную модель и сфотографируйте шильдик.'],['02','Описание симптома','Когда появилась проблема, при какой нагрузке и что изменилось.'],['03','Фото и видео','Общий вид, место утечки, звук, дым, индикаторы или код ошибки.'],['04','Местоположение','Район, село и возможность подъезда к технике.']].map(x=><div className="process-card" key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></div>)}</div></section><section className="final-cta"><div className="container final-grid"><div><span className="eyebrow light">Сервисная заявка</span><h2>Опишите проблему</h2><p>Менеджер уточнит данные и передаст обращение специалисту.</p></div><LeadForm source="service" compact/></div></section></>}
