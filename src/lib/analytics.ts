import { supabase } from './supabase'
import type { Locale } from './types'

const SESSION_KEY = 'atadan_session_id'

function sessionId() {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

function deviceType() {
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1100) return 'tablet'
  return 'desktop'
}

function utm() {
  const p = new URLSearchParams(window.location.search)
  return {
    p_utm_source: p.get('utm_source'), p_utm_medium: p.get('utm_medium'), p_utm_campaign: p.get('utm_campaign'),
    p_utm_content: p.get('utm_content'), p_utm_term: p.get('utm_term')
  }
}

export async function trackEvent(eventName: string, options: { tractorId?: string | null; locale?: Locale; metadata?: Record<string, unknown> } = {}) {
  try {
    const payload = {
      p_session_id: sessionId(), p_event_name: eventName, p_tractor_id: options.tractorId || null,
      p_page: window.location.pathname + window.location.search, p_locale: options.locale || 'ru',
      p_device_type: deviceType(), p_referrer: document.referrer || null, p_metadata: options.metadata || {}, ...utm()
    }
    const { error } = await supabase.rpc('atadan_track_event', payload)
    if (error && import.meta.env.DEV) console.warn('Analytics:', error.message)
  } catch (error) {
    if (import.meta.env.DEV) console.warn('Analytics unavailable', error)
  }
}
