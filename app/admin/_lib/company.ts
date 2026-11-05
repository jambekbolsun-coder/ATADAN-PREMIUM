/**
 * Компания (Настройки → Реквизиты, кассы и курсы): реквизиты для договоров и счетов
 * (site_settings 'company') и правила продаж (site_settings 'sales_policy'), которые читают
 * salesPolicy() в sales.ts и penaltyPolicy() в money.ts.
 */
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { HttpError } from "../../lib/security";
import { audit, isBoss, num, query, text } from "./db-kit";
import { salesPolicy } from "./sales";
import { penaltyPolicy } from "./money";

export type Company = { legalName: string; inn: string; okpo: string; address: string; director: string; phone: string; email: string; bankName: string; bik: string; account: string; accountUsd: string; contractNote: string };
const EMPTY: Company = { legalName: "", inn: "", okpo: "", address: "", director: "", phone: "", email: "", bankName: "", bik: "", account: "", accountUsd: "", contractNote: "" };

export async function getCompany(): Promise<{ company: Company; version: number }> {
  const row = await getRawDb().prepare("SELECT value, version FROM site_settings WHERE key='company'").first<{ value: string; version: number }>();
  try { return { company: { ...EMPTY, ...(row ? JSON.parse(row.value) : {}) }, version: row?.version ?? 0 }; } catch { return { company: EMPTY, version: row?.version ?? 0 }; }
}

export async function getPolicies() {
  const [sales, penalty] = await Promise.all([salesPolicy(), penaltyPolicy()]);
  return { sales, penalty };
}

async function put(q: ReturnType<typeof query>, key: string, value: unknown, version: number) {
  if (version === 0) {
    const rows = await q<{ key: string }>("INSERT INTO site_settings(key,value,version) VALUES(?,?,1) ON CONFLICT(key) DO NOTHING RETURNING key", key, JSON.stringify(value));
    if (!rows.length) throw new HttpError(409, "Настройки уже изменил другой сотрудник. Обновите страницу");
  } else {
    const rows = await q<{ key: string }>("UPDATE site_settings SET value=?, version=version+1 WHERE key=? AND version=? RETURNING key", JSON.stringify(value), key, version);
    if (!rows.length) throw new HttpError(409, "Настройки уже изменил другой сотрудник. Обновите страницу");
  }
}

export async function saveCompany(actor: Actor, input: Company & { version: number }) {
  if (!isBoss(actor)) throw new HttpError(403, "Реквизиты меняют владелец и директор");
  const c: Company = {
    legalName: text(input.legalName, 200), inn: text(input.inn, 20), okpo: text(input.okpo, 20), address: text(input.address, 300), director: text(input.director, 120),
    phone: text(input.phone, 40), email: text(input.email, 160), bankName: text(input.bankName, 160), bik: text(input.bik, 20), account: text(input.account, 40), accountUsd: text(input.accountUsd, 40), contractNote: text(input.contractNote, 2000),
  };
  if (c.inn && !/^\d{10,14}$/.test(c.inn)) throw new HttpError(400, "ИНН: 10-14 цифр");
  if (c.bik && !/^\d{6,9}$/.test(c.bik)) throw new HttpError(400, "БИК: 6-9 цифр");
  if (c.email && !/^\S+@\S+\.\S+$/.test(c.email)) throw new HttpError(400, "Проверьте email");
  await getRawDb().transaction(async (client) => {
    const q = query(client);
    await put(q, "company", c, input.version);
    await audit(q, actor, "company.update", "company", c.legalName || "реквизиты");
  });
}

export async function savePolicy(actor: Actor, input: { reserveDays: string; stateLeasingReserveDays: string; belowCost: string; ratePerDay: string; graceDays: string; maxPercent: string }) {
  if (actor.role !== "owner") throw new HttpError(403, "Правила продаж меняет только владелец");
  const reserveDays = num(input.reserveDays, "Резерв, дней", { min: 1, max: 90, int: true })!;
  const stateLeasingReserveDays = num(input.stateLeasingReserveDays, "Резерв для гослизинга, дней", { min: 1, max: 90, int: true })!;
  const penalty = {
    ratePerDay: num(input.ratePerDay, "Пеня в день, %", { max: 5 })!,
    graceDays: num(input.graceDays, "Дней без пени", { max: 60, int: true })!,
    maxPercent: num(input.maxPercent, "Пеня не больше, %", { max: 100 })!,
  };
  const value = { reserveDays, stateLeasingReserveDays, maxReserveDays: 90, belowCost: input.belowCost === "nobody" ? "nobody" : "owner", penalty };
  await getRawDb().transaction(async (client) => {
    const q = query(client);
    const [row] = await q<{ version: number }>("SELECT version FROM site_settings WHERE key='sales_policy' FOR UPDATE");
    await put(q, "sales_policy", value, row?.version ?? 0);
    await audit(q, actor, "policy.update", "sales_policy", `Резерв ${reserveDays} / ${stateLeasingReserveDays} дн.; пеня ${penalty.ratePerDay}% в день после ${penalty.graceDays} дн., до ${penalty.maxPercent}%`);
  });
}
