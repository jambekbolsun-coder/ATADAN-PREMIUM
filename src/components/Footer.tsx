import { Instagram, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Wordmark } from './Wordmark'
import { buildWhatsAppUrl } from './WhatsAppButton'
import { copy } from '../lib/i18n'
import type { Locale } from '../lib/types'

export function Footer({ locale, phone, instagram }: { locale: Locale; phone: string; instagram?: string }) {
  const t = copy(locale)
  return <footer className="bg-[#0f160c] text-white"><div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto] lg:px-12"><div><Wordmark inverse /><p className="mt-5 max-w-xl text-sm leading-6 text-white/55">{t.companySub}</p></div><div className="flex flex-wrap items-start gap-3"><a className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold hover:bg-white/5" href={buildWhatsAppUrl(phone, 'Здравствуйте! Хочу получить консультацию по тракторам CHANGFA.')} target="_blank" rel="noreferrer"><MessageCircle size={17}/> WhatsApp</a>{instagram && <a className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold hover:bg-white/5" href={instagram} target="_blank" rel="noreferrer"><Instagram size={17}/> Instagram</a>}</div></div><div className="border-t border-white/10"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-white/40 sm:px-8 lg:px-12"><span>© {new Date().getFullYear()} ATADAN</span><Link to="/admin" className="hover:text-white">Admin</Link></div></div></footer>
}
