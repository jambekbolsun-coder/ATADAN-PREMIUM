import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PageHero from '../components/PageHero'
import { series } from '../data/series'
export default function SeriesPage(){return <><PageHero eyebrow="Линейка CHANGFA" title="Серии тракторов" lead="От компактных моделей для небольших хозяйств до тяжёлых машин для крупных площадей."/><section className="section"><div className="container"><div className="series-grid">{series.map((s,i)=><Link className="series-card" to={`/series/${s.slug}`} key={s.id}><div className="series-number">{String(i+1).padStart(2,'0')}</div><span>{s.id} SERIES</span><h2>{s.power}</h2><p>{s.description}</p><div>Открыть серию <ArrowRight/></div></Link>)}</div><div className="source-note">Серии A, B, CB, C, DM, E, F, GB, G, H, J и L указаны в заводском каталоге CHANGFA. Диапазоны для серий без коммерческих моделей носят справочный характер и требуют подтверждения.</div></div></section></>}
