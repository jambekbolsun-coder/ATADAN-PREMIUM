import type { Locale } from "../types";
import { copy } from "../data/site-copy";
import { defaultSettings, type SiteSettings } from "./site-settings-types";

const text = (locale: Locale, key: string) => copy[locale]?.[key] ?? copy.ru[key] ?? key;

export function formatPrice(price: number | null, locale: Locale = "ru") {
  return price ? `${new Intl.NumberFormat("ru-RU").format(price)} ${text(locale, "ui.currency.som")}` : text(locale, "product.priceOnRequest");
}

export function formatApproximateUsdPrice(price: number | undefined, locale: Locale = "ru") {
  return price && price > 0
    ? `≈ $${new Intl.NumberFormat("ru-RU").format(price)}`
    : text(locale, "product.priceOnRequest");
}

/** Адрес офиса на языке страницы: перевод из настроек сайта, иначе стандартный перевод, если адрес не меняли в админке. */
export function localizedAddress(settings: Pick<SiteSettings, "address" | "translations">, locale: Locale) {
  if (locale === "ru") return settings.address;
  const override = settings.translations[locale]?.["ui.footer.address"];
  if (override) return override;
  return settings.address === defaultSettings.address ? text(locale, "ui.footer.address") : settings.address;
}
