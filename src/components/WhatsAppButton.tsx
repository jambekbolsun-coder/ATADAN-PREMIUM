import { ArrowUpRight, MessageCircle } from 'lucide-react'
import { trackEvent } from '../lib/analytics'
import type { Locale } from '../lib/types'
const labels = { ru: 'Получить консультацию', kg: 'Консультация алуу', en: 'Get consultation' }
export function buildWhatsAppUrl(phone: string, message: string) { return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}` }
export function WhatsAppButton({ phone = '996706131404', message, locale, tractorId, location = 'generic', className = '' }: { phone?: string; message: string; locale: Locale; tractorId?: string; location?: string; className?: string }) { return <a href={buildWhatsAppUrl(phone, message)} target="_blank" rel="noreferrer" onClick={() => trackEvent('whatsapp_click', { tractorId, locale, metadata: { button_location: location } })} className={`action-button action-button--primary ${className}`}><MessageCircle size={17}/>{labels[locale]}<span className="action-button__icon"><ArrowUpRight size={14}/></span></a> }
