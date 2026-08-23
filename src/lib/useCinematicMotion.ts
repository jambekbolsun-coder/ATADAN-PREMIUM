import { useEffect, type RefObject } from 'react'
import { animate, stagger } from 'animejs'

export function useCinematicMotion(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.classList.add('motion-ready')
    const intro = Array.from(root.querySelectorAll<HTMLElement>('[data-intro]'))
    if (intro.length) animate(intro, { opacity: [0, 1], translateY: [34, 0], duration: 950, delay: stagger(100, { start: 120 }), ease: 'out(4)' })
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      const target = entry.target as HTMLElement
      observer.unobserve(target)
      animate(target, { opacity: [0, 1], translateY: [28, 0], duration: 820, ease: 'out(4)' })
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [rootRef])
}
