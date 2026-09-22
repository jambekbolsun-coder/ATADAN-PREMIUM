export type UsdKgsRate = {
  value: number;
  date: string;
};

const DAILY_RATE_URL = "https://www.nbkr.kg/XML/daily.xml";

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
    if (!date || !Number.isFinite(value) || value < 10 || value > 500) return null;
    return { value, date };
  } catch {
    return null;
  }
}

export function approximateSomPrice(usd: number | undefined, rate: UsdKgsRate | null) {
  return usd && rate ? Math.round(usd * rate.value) : null;
}
