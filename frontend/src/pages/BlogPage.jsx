import { Link } from 'react-router-dom'
import { ArrowRight, Clock3 } from 'lucide-react'
import PageHero from '../components/PageHero'
import { blogPosts } from '../data/blog'
export default function BlogPage(){return <><PageHero eyebrow="База знаний" title="Тракторы без сложных слов" lead="Короткие материалы о мощности, ВОМ, ходоуменьшителе, лизинге и подборе оборудования."/><section className="section"><div className="container blog-grid">{blogPosts.map((p,i)=><article className={i===0?'featured-post':''} key={p.slug}><div className="post-index">{String(i+1).padStart(2,'0')}</div><span className="post-meta"><Clock3/> {p.readTime} мин</span><h2>{p.title}</h2><p>{p.excerpt}</p><Link to={`/blog/${p.slug}`}>Читать статью <ArrowRight/></Link></article>)}</div></section></>}
