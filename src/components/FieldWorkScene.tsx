import { useEffect, useRef } from 'react'

export function FieldWorkScene({ title, text }: { title: string; text: string }) {
  const rootRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const root = rootRef.current
    const image = imageRef.current
    if (!root || !image) return
    let scheduled = false
    const update = () => {
      scheduled = false
      const rect = root.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) return
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height)
      image.style.transform = `translate3d(0, ${(progress - 0.5) * 7}%, 0) scale(1.08)`
    }
    const onScroll = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update) } }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return <section ref={rootRef} className="field-work-scene">
    <img ref={imageRef} src="/media/tractor-field-drone.webp" alt="CHANGFA tractor working in a field" className="field-work-scene__image" loading="lazy"/>
    <div className="field-work-scene__shade"/>
    <div className="field-work-scene__content" data-reveal><div><p className="section-eyebrow">ATADAN × CHANGFA</p><h2>{title}</h2><p>{text}</p></div></div>
    <div className="field-work-scene__marker" aria-hidden="true"><span>ATADAN<br/>CHANGFA</span></div>
  </section>
}
