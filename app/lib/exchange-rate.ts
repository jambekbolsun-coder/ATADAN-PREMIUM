export type UsdKgsRate = {
  value: number;
  date: string;
};

const DAILY_RATE_URL = "https://www.nbkr.kg/XML/daily.xml";

export function bishkekCalendarDate(value: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Bishkek",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")}.${part("month")}.${part("year")}`;
}

export async function getUsdKgsRate(): Promise<UsdKgsRate | null> {
  try {
    const response = await fetch(DAILY_RATE_URL, {
      next: { revalidate: 6 * 60 * 60 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const xml = await response.text();
    const date = xml.match(/<CurrencyRates\b[^>]*\bDate="(\d{2}\.\d{2}\.\d{4})"/i)?.[1];
    const usd = xml.match(/<Currency\b[^>]*\bISOCode="USD"[^>]*>([\s\S]*?)<\/Currency>/i)?.[1];
    const nominal = Number(usd?.match(/<Nominal>([^<]+)<\/Nominal>/i)?.[1]?.replace(",", "."));
    const amount = Number(usd?.match(/<Value>([^<]+)<\/Value>/i)?.[1]?.replace(",", "."));
    const value = amount / nominal;
    if (!Number.isFinite(value) || value < 10 || value > 500) return null;
    // Prefer the official NBKR date. If a valid feed omits it, use the
    // retrieval calendar date in Bishkek rather than UTC.
    return { value, date: date ?? bishkekCalendarDate() };
  } catch {
    return null;
  }
}

export function approximateSomPrice(usd: number | undefined, rate: UsdKgsRate | null) {
  return usd && rate ? Math.round(usd * rate.value) : null;
}
