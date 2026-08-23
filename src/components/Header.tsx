import { useEffect, useState } from 'react'
import { ArrowUpRight, Menu, MessageCircle, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Wordmark } from './Wordmark'
import { buildWhatsAppUrl } from './WhatsAppButton'
import { copy, localeFromPath, locales } from '../lib/i18n'
import { trackEvent } from '../lib/analytics'
import type { Locale } from '../lib/types'

export function Header({ phone = '996706131404' }: { phone?: string }) {
  const location = useLocation(); const navigate = useNavigate(); const locale = localeFromPath(location.pathname); const t = copy(locale)
  const [open, setOpen] = useState(false); const [scrolled, setScrolled] = useState(false)
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 28); onScroll(); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll) }, [])
  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [open])
  const changeLocale = (next: Locale) => { const parts = location.pathname.split('/').filter(Boolean); if (parts[0] === 'ru' || parts[0] === 'kg' || parts[0] === 'en') parts[0] = next; else parts.unshift(next); trackEvent('language_change', { locale: next, metadata: { from: locale, to: next } }); navigate('/' + parts.join('/') + location.search) }
  const nav = [{ to: `/${locale}`, label: t.home }, { to: `/${locale}/tractors`, label: t.tractors }, { to: `/${locale}#about`, label: t.about }, { to: `/${locale}#contacts`, label: t.contacts }]
  const whatsapp = buildWhatsAppUrl(phone, 'Здравствуйте! Хочу получить консультацию по тракторам CHANGFA.')
  return <><header className={`site-header ${scrolled || open ? 'is-solid' : ''}`}><div className="site-header__inner"><Link to={`/${locale}`} aria-label="ATADAN home"><Wordmark inverse/></Link><nav className="site-header__nav" aria-label="Main navigation">{nav.map((item, index) => <Link key={item.label} to={item.to}><span>{String(index + 1).padStart(2, '0')}.</span>{item.label}</Link>)}</nav><div className="site-header__actions"><div className="locale-switch">{locales.map((language) => <button key={language} onClick={() => changeLocale(language)} className={language === locale ? 'active' : ''}>{language}</button>)}</div><a href={whatsapp} target="_blank" rel="noreferrer" onClick={() => trackEvent('whatsapp_click', { locale, metadata: { button_location: 'header' } })} className="header-whatsapp"><MessageCircle size={16}/>WhatsApp</a><button className="menu-toggle" onClick={() => setOpen(true)} aria-label={t.menu}><Menu size={19}/></button></div></div></header>{open && <><button className="mobile-panel__backdrop" onClick={() => setOpen(false)} aria-label={t.close}/><aside className="mobile-panel"><div className="mobile-panel__top"><Wordmark inverse/><button className="mobile-panel__close" onClick={() => setOpen(false)} aria-label={t.close}><X/></button></div><nav>{nav.map((item, index) => <Link key={item.label} to={item.to}><span>{item.label}</span><small>{String(index + 1).padStart(2, '0')}</small></Link>)}</nav><div className="mobile-panel__footer"><div className="locale-switch">{locales.map((language) => <button key={language} onClick={() => changeLocale(language)} className={language === locale ? 'active' : ''}>{language}</button>)}</div><a className="action-button action-button--primary" href={whatsapp} target="_blank" rel="noreferrer">WhatsApp <ArrowUpRight size={16}/></a></div></aside></>}</>
}
