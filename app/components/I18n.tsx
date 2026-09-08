"use client";

import { ChevronDown } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export type Locale = "ru" | "ky" | "en";

import { copy } from "../data/site-copy";
import { useSiteSettings } from "./SiteSettings";

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (id: string, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

const localeListeners = new Set<() => void>();

function localeFromStorage(): Locale {
  if (typeof window === "undefined") return "ru";
  const saved = window.localStorage.getItem("atadan-locale");
  return saved === "ru" || saved === "ky" || saved === "en" ? saved : "ru";
}

function subscribeLocale(listener: () => void) {
  localeListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === "atadan-locale") listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    localeListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function saveLocale(locale: Locale) {
  window.localStorage.setItem("atadan-locale", locale);
  localeListeners.forEach((listener) => listener());
}

function interpolate(value: string, values?: Record<string, string | number>) {
  if (!values) return value;
  return value.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore<Locale>(subscribeLocale, localeFromStorage, () => "ru");
  const settings = useSiteSettings();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale: saveLocale,
    t(id, values) {
      return interpolate(settings.translations[locale]?.[id] ?? copy[locale][id] ?? copy.ru[id] ?? id, values);
    },
  }), [locale, settings.translations]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

export function Trans({ id, values }: { id: string; values?: Record<string, string | number> }) {
  const { t } = useI18n();
  return <>{t(id, values)}</>;
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();
  const names: Record<Locale, string> = { ru: "Русский", ky: "Кыргызча", en: "English" };
  return <details className={`language-switcher language-select ${compact ? "compact" : ""}`}>
    <summary aria-label={`Язык: ${names[locale]}`}><FlagIcon locale={locale} /><span>{names[locale]}</span><ChevronDown className="language-chevron" size={15} aria-hidden="true" /></summary>
    <div className="language-options" aria-label="Language / Язык / Тил">
      {(["ru", "ky", "en"] as Locale[]).map((item) => <button type="button" className={locale === item ? "active" : ""} aria-pressed={locale === item} onClick={(event) => { setLocale(item); event.currentTarget.closest("details")?.removeAttribute("open"); }} key={item}><FlagIcon locale={item} /><span>{names[item]}</span>{locale === item ? <i aria-hidden="true" /> : null}</button>)}
    </div>
  </details>;
}

function FlagIcon({ locale }: { locale: Locale }) {
  if (locale === "ru") return <svg className="language-flag" viewBox="0 0 24 16" aria-hidden="true"><path fill="#fff" d="M0 0h24v5.34H0z"/><path fill="#1769c2" d="M0 5.33h24v5.34H0z"/><path fill="#e33b3b" d="M0 10.66h24V16H0z"/></svg>;
  if (locale === "ky") return <svg className="language-flag" viewBox="0 0 24 16" aria-hidden="true"><path fill="#e43a35" d="M0 0h24v16H0z"/><circle cx="12" cy="8" r="4.4" fill="#ffdb3b"/><circle cx="12" cy="8" r="2.25" fill="#e43a35"/><path d="M12 2v2M12 12v2M6 8h2M16 8h2M7.75 3.75l1.4 1.4M14.85 10.85l1.4 1.4M16.25 3.75l-1.4 1.4M9.15 10.85l-1.4 1.4" stroke="#ffdb3b" strokeWidth="1.1"/></svg>;
  return <svg className="language-flag" viewBox="0 0 24 16" aria-hidden="true"><path fill="#18377f" d="M0 0h24v16H0z"/><path d="M0 0l24 16M24 0L0 16" stroke="#fff" strokeWidth="3.4"/><path d="M0 0l24 16M24 0L0 16" stroke="#d83543" strokeWidth="1.5"/><path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5"/><path d="M12 0v16M0 8h24" stroke="#d83543" strokeWidth="2.6"/></svg>;
}
