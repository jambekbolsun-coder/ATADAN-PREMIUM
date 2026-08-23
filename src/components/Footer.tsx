import { Instagram, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Wordmark } from './Wordmark'
import { buildWhatsAppUrl } from './WhatsAppButton'
import { copy } from '../lib/i18n'
import type { Locale } from '../lib/types'
export function Footer({ locale, phone, instagram }: { locale: Locale; phone: string; instagram?: string }) { const t = copy(locale); return <footer className="site-footer"><div className="site-footer__inner"><div><Wordmark inverse/><p>{t.companySub}</p></div><nav className="site-footer__nav"><Link to={`/${locale}`}>{t.home}</Link><Link to={`/${locale}/tractors`}>{t.tractors}</Link><Link to={`/${locale}#about`}>{t.about}</Link><Link to={`/${locale}#contacts`}>{t.contacts}</Link></nav><div className="site-footer__contact"><a href={buildWhatsAppUrl(phone, 'Здравствуйте! Хочу получить консультацию по тракторам CHANGFA.')} target="_blank" rel="noreferrer"><MessageCircle size={16}/>WhatsApp</a>{instagram && <a href={instagram} target="_blank" rel="noreferrer"><Instagram size={16}/>Instagram</a>}</div></div><div className="site-footer__bottom"><span>© {new Date().getFullYear()} ATADAN</span><Link to="/admin">Admin</Link></div></footer> }
