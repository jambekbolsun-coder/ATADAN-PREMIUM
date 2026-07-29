import PageHero from '../components/PageHero'
import { faq } from '../data/content'
export default function FaqPage(){return <><PageHero eyebrow="Вопросы и ответы" title="Что важно знать до покупки" lead="Цена, лизинг, сервис, цвета, мощность и совместимость оборудования."/><section className="section"><div className="container faq-list large">{faq.map(([q,a],i)=><details key={q} open={i===0}><summary><span>{String(i+1).padStart(2,'0')}</span>{q}</summary><p>{a}</p></details>)}</div></section></>}
