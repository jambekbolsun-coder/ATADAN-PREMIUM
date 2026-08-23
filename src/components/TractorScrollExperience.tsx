import { useEffect, useRef, useState } from 'react'

const frames = [1, 2, 3, 6, 8, 9].map((number) => `/media/tractor-sequence/tractor-${String(number).padStart(2, '0')}.webp`)

export function TractorScrollExperience({ title, text }: { title: string; text: string }) {
  const rootRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let scheduled = false
    const update = () => {
      scheduled = false
      const rect = root.getBoundingClientRect()
      const distance = Math.max(1, root.offsetHeight - window.innerHeight)
      const progress = Math.min(1, Math.max(0, -rect.top / distance))
      setActive(Math.min(frames.length - 1, Math.floor(progress * frames.length)))
    }
    const onScroll = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update) } }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [])
  return <section ref={rootRef} className="tractor-scroll" aria-label={title}>
    <div className="tractor-scroll__sticky">
      <div className="tractor-scroll__copy"><p className="section-eyebrow">CHANGFA EXPERIENCE</p><h2>{title}</h2><p>{text}</p></div>
      <div className="tractor-scroll__stage">
        {frames.map((src, index) => <img key={src} src={src} alt="" aria-hidden="true" className={`tractor-scroll__frame ${index === active ? 'is-active' : ''}`} loading={index < 2 ? 'eager' : 'lazy'}/>)}
        <div className="tractor-scroll__index">{String(active + 1).padStart(2, '0')} / {String(frames.length).padStart(2, '0')}</div>
        <div className="tractor-scroll__rail" aria-hidden="true">{frames.map((_, index) => <span key={index} className={index <= active ? 'is-active' : ''}/>)}</div>
      </div>
    </div>
  </section>
}
