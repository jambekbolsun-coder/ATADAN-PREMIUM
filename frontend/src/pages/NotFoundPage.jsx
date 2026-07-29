import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
export default function NotFoundPage(){return <section className="not-found"><div className="container"><span>404</span><h1>Страница не найдена</h1><p>Возможно, адрес изменился или в ссылке есть ошибка.</p><Link className="btn btn-gold" to="/"><ArrowLeft/>На главную</Link></div></section>}
