import { MessageCircle } from 'lucide-react'
import { trackEvent } from '../lib/analytics'
import type { Locale } from '../lib/types'

const labels = { ru: 'Получить консультацию', kg: 'Консультация алуу', en: 'Get consultation' }
export function buildWhatsAppUrl(phone: string, message: string) { return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}` }
export function WhatsAppButton({ phone = '996706131404', message, locale, tractorId, location = 'generic', className = '' }: { phone?: string; message: string; locale: Locale; tractorId?: string; location?: string; className?: string }) {
  const href = buildWhatsAppUrl(phone, message)
  return <a href={href} target="_blank" rel="noreferrer" onClick={() => trackEvent('whatsapp_click', { tractorId, locale, metadata: { button_location: location } })} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-atadan-500 px-6 py-3 text-sm font-bold text-[#102006] transition hover:bg-atadan-400 focus:outline-none focus:ring-4 focus:ring-atadan-200 ${className}`}><MessageCircle size={18} aria-hidden="true" /> {labels[locale]}</a>
}
