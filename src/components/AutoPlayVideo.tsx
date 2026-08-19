import { useEffect, useRef } from 'react'
import { trackEvent } from '../lib/analytics'
import type { Locale } from '../lib/types'

export function AutoPlayVideo({ src, poster, tractorId, locale, className = '' }: { src: string; poster?: string; tractorId: string; locale: Locale; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null); const fired = useRef(new Set<string>())
  useEffect(() => {
    const node = ref.current; if (!node) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && entry.intersectionRatio > .45) node.play().catch(() => {}); else node.pause() }, { threshold: [0,.45,.8] })
    observer.observe(node)
    const send = (name: string) => { if (fired.current.has(name)) return; fired.current.add(name); trackEvent(name, { tractorId, locale, metadata: { media_url: src } }) }
    const onPlay = () => send('video_start')
    const onTime = () => { if (!node.duration) return; const p = node.currentTime / node.duration; if (p >= .25) send('video_25'); if (p >= .5) send('video_50'); if (p >= .75) send('video_75') }
    const onEnded = () => send('video_complete')
    node.addEventListener('play', onPlay); node.addEventListener('timeupdate', onTime); node.addEventListener('ended', onEnded)
    return () => { observer.disconnect(); node.removeEventListener('play', onPlay); node.removeEventListener('timeupdate', onTime); node.removeEventListener('ended', onEnded) }
  }, [src, tractorId, locale])
  return <video ref={ref} className={`block h-full w-full object-cover ${className}`} src={src} poster={poster} muted playsInline loop preload="metadata" />
}
