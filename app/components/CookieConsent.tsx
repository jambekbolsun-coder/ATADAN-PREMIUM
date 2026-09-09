"use client";

import { Check, Cookie, Settings2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "./SiteLink";
import { useI18n } from "./I18n";

export const PRIVACY_CHOICE_KEY = "atadan_privacy_choice";
export const PRIVACY_CHOICE_EVENT = "atadan:privacy-choice";
export const OPEN_PRIVACY_SETTINGS_EVENT = "atadan:open-privacy-settings";

type Choice = "analytics" | "necessary";

const copy = {
  ru: {
    eyebrow: "Ваш выбор",
    title: "Cookie и приватность",
    text: "Необходимое хранилище поддерживает язык и работу сайта. Статистику посещений каталога включим только с вашего разрешения.",
    details: "Аналитика сохраняет только посещённый путь, модель трактора и случайный идентификатор — без имени и телефона. WhatsApp, Instagram и карта открываются только по вашему действию.",
    accept: "Разрешить аналитику",
    necessary: "Только необходимые",
    settings: "Подробнее",
    close: "Закрыть настройки cookie",
    policy: "Политика cookie",
  },
  ky: {
    eyebrow: "Сиздин тандооңуз",
    title: "Cookie жана купуялык",
    text: "Керектүү сактагыч тилди жана сайттын ишин камсыздайт. Каталогдун статистикасы сиз уруксат бергенде гана иштейт.",
    details: "Аналитика барактын жолун, трактор моделин жана кокустук идентификаторду гана сактайт — аты-жөнү жана телефону жок. WhatsApp, Instagram жана карта сиз басканда гана ачылат.",
    accept: "Аналитикага уруксат берүү",
    necessary: "Керектүүлөр гана",
    settings: "Толугураак",
    close: "Cookie жөндөөлөрүн жабуу",
    policy: "Cookie саясаты",
  },
  en: {
    eyebrow: "Your choice",
    title: "Cookies and privacy",
    text: "Essential storage keeps language preferences and the website working. Catalogue visit statistics start only with your permission.",
    details: "Analytics stores only the visited path, tractor model and a random identifier — never your name or phone. WhatsApp, Instagram and the map open only when you choose them.",
    accept: "Allow analytics",
    necessary: "Essential only",
    settings: "Learn more",
    close: "Close cookie settings",
    policy: "Cookie policy",
  },
} as const;

export function CookieConsent() {
  const { locale } = useI18n();
  const labels = copy[locale];
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const timer=window.setTimeout(()=>setOpen(!window.localStorage.getItem(PRIVACY_CHOICE_KEY)),0);
    const show = () => setOpen(true);
    window.addEventListener(OPEN_PRIVACY_SETTINGS_EVENT, show);
    return () => { window.clearTimeout(timer); window.removeEventListener(OPEN_PRIVACY_SETTINGS_EVENT, show); };
  }, []);

  function choose(choice: Choice) {
    window.localStorage.setItem(PRIVACY_CHOICE_KEY, choice);
    if (choice === "necessary") window.localStorage.removeItem("atadan_visitor");
    window.dispatchEvent(new CustomEvent(PRIVACY_CHOICE_EVENT, { detail: choice }));
    setOpen(false);
  }

  if (!open) return null;
  return (
    <section className="cookie-consent" aria-labelledby="cookie-title" aria-live="polite">
      <div className="cookie-icon" aria-hidden="true"><Cookie /></div>
      <div className="cookie-copy">
        <span>{labels.eyebrow}</span>
        <h2 id="cookie-title">{labels.title}</h2>
        <p>{labels.text}</p>
        {expanded ? <p className="cookie-details" id="cookie-details">{labels.details} <Link href="/cookies">{labels.policy}</Link>.</p> : null}
      </div>
      <div className="cookie-actions">
        <button className="cookie-accept" type="button" onClick={() => choose("analytics")}><Check aria-hidden="true" />{labels.accept}</button>
        <button type="button" onClick={() => choose("necessary")}><X aria-hidden="true" />{labels.necessary}</button>
        <button type="button" aria-expanded={expanded} aria-controls="cookie-details" onClick={() => setExpanded(value => !value)}><Settings2 aria-hidden="true" />{labels.settings}</button>
      </div>
      <button className="cookie-close" type="button" onClick={() => choose("necessary")} aria-label={labels.close}><X aria-hidden="true" /></button>
    </section>
  );
}
