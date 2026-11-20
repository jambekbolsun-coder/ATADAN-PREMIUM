"use client";

import { animate, stagger } from "animejs";
import { ArrowRight, Check, Headphones, MessageCircle, Package, Stethoscope, Wrench } from "lucide-react";
import { useEffect, useRef } from "react";
import { useI18n } from "./I18n";
import { useSiteSettings } from "./SiteSettings";
import { Link } from "./SiteLink";

const BLOCKS = [
  { id: "to", Icon: Wrench, message: "Здравствуйте! Хочу записаться на ТО трактора Changfa. Модель: " },
  { id: "diag", Icon: Stethoscope, message: "Здравствуйте! Нужна диагностика трактора Changfa. Модель и что случилось: " },
  { id: "parts", Icon: Package, href: "/parts" },
  { id: "master", Icon: Headphones, message: "Здравствуйте! Нужен совет мастера по трактору Changfa. Модель: " },
] as const;

/** Четыре блока сервиса и шаги «Как это работает». Блоки появляются по очереди, когда до них доходит прокрутка. */
export function ServiceBlocks() {
  const { t } = useI18n();
  const settings = useSiteSettings();
  const ref = useRef<HTMLDivElement>(null);
  const phone = settings.phone.replace(/\D/g, "");

  useEffect(() => {
    const root = ref.current;
    if (!root || matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const hidden = targets.filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    if (!hidden.length) return;
    hidden.forEach((el) => { el.style.opacity = "0"; });
    let animation: ReturnType<typeof animate> | null = null;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      animation = animate(hidden, { opacity: [0, 1], y: [22, 0], duration: 560, delay: stagger(90), ease: "outCubic" });
    }, { rootMargin: "0px 0px -10% 0px" });
    observer.observe(root);
    return () => { observer.disconnect(); animation?.cancel(); hidden.forEach((el) => { el.style.opacity = ""; el.style.transform = ""; }); };
  }, []);

  return (
    <div ref={ref} className="service-v4 section-shell">
      <div className="service-v4-grid">
        {BLOCKS.map((block, index) => {
          const items = [1, 2, 3].map((n) => t(`ui.svc.${block.id}.li${n}`));
          const cta = t(`ui.svc.${block.id}.cta`);
          return (
            <article className="service-card-v4" key={block.id} data-reveal>
              <div className="service-card-top">
                <span className="service-card-icon"><block.Icon size={24} aria-hidden /></span>
                <small>{String(index + 1).padStart(2, "0")}</small>
              </div>
              <h2>{t(`ui.svc.${block.id}.title`)}</h2>
              <p>{t(`ui.svc.${block.id}.text`)}</p>
              <ul>{items.map((item) => <li key={item}><Check size={16} aria-hidden />{item}</li>)}</ul>
              {"href" in block ? (
                <Link className="service-card-cta" href={block.href}>{cta}<ArrowRight size={17} aria-hidden /></Link>
              ) : (
                <a className="service-card-cta" href={`https://wa.me/${phone}?text=${encodeURIComponent(block.message)}`} target="_blank" rel="noopener noreferrer">{cta}<ArrowRight size={17} aria-hidden /></a>
              )}
            </article>
          );
        })}
      </div>
      <section className="service-steps-v4" aria-labelledby="service-steps-title" data-reveal>
        <h2 id="service-steps-title">{t("ui.svc.steps.title")}</h2>
        <ol>
          {[1, 2, 3].map((n) => (
            <li key={n}>
              <span>{n}</span>
              <div><strong>{t(`ui.svc.steps.s${n}`)}</strong><p>{t(`ui.svc.steps.s${n}t`)}</p></div>
            </li>
          ))}
        </ol>
        <a className="primary-btn" href={`https://wa.me/${phone}?text=${encodeURIComponent("Здравствуйте! Вопрос по сервису трактора Changfa. Модель: ")}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={19} aria-hidden />{t("ui.svc.steps.cta")}</a>
      </section>
    </div>
  );
}
