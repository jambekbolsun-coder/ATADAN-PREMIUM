/** Форматирование для админки: деньги в тыйынах/центах (minor units), даты, проценты. Локаль ru-KG. */

export type Currency = "KGS" | "USD" | "CNY";

const SYMBOL: Record<Currency, string> = { KGS: "с", USD: "$", CNY: "¥" };

const intl = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const intl2 = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** 123456700 (тыйын) → «1 234 567 с»; USD → «$12 345». */
export function money(minor: number | null | undefined, currency: Currency = "KGS") {
  const value = Math.round(Number(minor ?? 0)) / 100;
  const text = intl.format(value);
  return currency === "KGS" ? `${text} ${SYMBOL.KGS}` : `${SYMBOL[currency]}${text}`;
}

/** Крупные суммы на телефоне: 18 450 000 → «18,45 млн». */
export function moneyShort(minor: number | null | undefined) {
  const value = Math.round(Number(minor ?? 0)) / 100;
  if (Math.abs(value) >= 1_000_000) return `${intl2.format(Math.round(value / 10_000) / 100)} млн`;
  if (Math.abs(value) >= 10_000) return `${intl2.format(Math.round(value / 100) / 10)} тыс`;
  return intl.format(value);
}

export function count(value: number | null | undefined) {
  return intl.format(Number(value ?? 0));
}

export function percent(part: number, whole: number, digits = 1) {
  if (!whole) return "0%";
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits }).format((part / whole) * 100)}%`;
}

const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Bishkek" });
const dateTimeFmt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bishkek" });
const monthFmt = new Intl.DateTimeFormat("ru-RU", { month: "short", timeZone: "Asia/Bishkek" });
const monthLongFmt = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "Asia/Bishkek" });

export function date(value: string | Date | null | undefined) {
  if (!value) return "не указано";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "не указано" : dateFmt.format(d);
}

export function dateTime(value: string | Date | null | undefined) {
  if (!value) return "не указано";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "не указано" : dateTimeFmt.format(d);
}

export function monthShort(value: Date) {
  return monthFmt.format(value).replace(".", "");
}

export function monthLong(value: Date) {
  return monthLongFmt.format(value);
}

/** «5 минут назад», «2 ч назад», «вчера», «3 дн назад». */
export function ago(value: string | Date | null | undefined, now = Date.now()) {
  if (!value) return "";
  const diff = Math.max(0, now - new Date(value).getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? "вчера" : `${days} дн назад`;
}

export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

export function initials(name: string | null | undefined) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "A";
}
