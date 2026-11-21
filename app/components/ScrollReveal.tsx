"use client";

import { animate, stagger } from "animejs";
import { useEffect, useRef } from "react";

/**
 * Плавно показывает элементы с атрибутом data-reveal, когда до блока доходит прокрутка.
 * Элементы, которые уже видны при загрузке, не прячутся. Если в системе отключены анимации, ничего не двигается.
 * Пока блок в зоне видимости, корню ставится класс is-inview (для линий прогресса в CSS).
 */
export function ScrollReveal({ children, className = "", as: Tag = "div", ...rest }: { children: React.ReactNode; className?: string; as?: "div" | "section" } & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) { root.classList.add("is-inview"); return; }
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const hidden = targets.filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    hidden.forEach((el) => { el.style.opacity = "0"; });
    let animation: ReturnType<typeof animate> | null = null;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      root.classList.add("is-inview");
      if (hidden.length) animation = animate(hidden, { opacity: [0, 1], y: [22, 0], duration: 560, delay: stagger(90), ease: "outCubic" });
    }, { rootMargin: "0px 0px -12% 0px" });
    observer.observe(root);
    return () => { observer.disconnect(); animation?.cancel(); hidden.forEach((el) => { el.style.opacity = ""; el.style.transform = ""; }); };
  }, []);
  return <Tag ref={ref as React.Ref<HTMLDivElement>} className={className} {...rest}>{children}</Tag>;
}
