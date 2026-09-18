import { HttpError } from "./security";

export const leadSources = ["instagram", "whatsapp", "website", "advertising", "organic", "referral", "phone", "leasing-calculator", "other"] as const;

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) throw new HttpError(400, "Проверьте номер телефона");
  if (digits.startsWith("0") && digits.length === 10) return `996${digits.slice(1)}`;
  return digits;
}

export function normalizeVin(value: unknown) {
  if (typeof value !== "string") throw new HttpError(400, "Укажите VIN");
  const vin = value.trim().toUpperCase().replace(/[\s-]+/g, "");
  if (!/^[A-HJ-NPR-Z0-9]{6,32}$/.test(vin)) throw new HttpError(400, "VIN должен содержать 6–32 латинских символа без I, O и Q");
  return vin;
}

export function somToMinor(value: unknown, label = "Сумма") {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) throw new HttpError(400, `${label}: проверьте значение`);
  return Math.round(amount * 100);
}

export function isoDate(value: unknown, label = "Дата") {
  if (typeof value !== "string" || !value) throw new HttpError(400, `${label}: укажите значение`);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new HttpError(400, `${label}: некорректное значение`);
  return date.toISOString();
}

export const inventoryStatusMap: Record<string, string> = {
  "Заказан": "ordered", "Производство": "production", "В пути": "transit", "Таможня": "customs",
  "На складе": "stock", "Забронирован": "reserved", "Продан": "sold", "Выдан": "delivered",
};

export function structuredLossReason(code: unknown, detail: unknown) {
  const allowed = new Set(["price", "financing", "competitor", "timing", "no_contact", "model", "duplicate", "other"]);
  const reasonCode = typeof code === "string" ? code.trim() : "";
  const reasonDetail = typeof detail === "string" ? detail.trim() : "";
  if (!allowed.has(reasonCode) || reasonDetail.length < 3 || reasonDetail.length > 1000) {
    throw new HttpError(400, "Для отказа выберите причину и добавьте пояснение");
  }
  return { reasonCode, reasonDetail };
}

