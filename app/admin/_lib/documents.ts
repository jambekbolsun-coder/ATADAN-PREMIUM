/** Документы по продаже: сумма прописью и данные для договора, счёта и акта. */
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { getCompany } from "./company";
import { getSale } from "./sales";
import { salesPolicy } from "./sales";
import { penaltyPolicy } from "./money";

const ONES = [["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"], ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"]];
const TEENS = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
const TENS = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const HUNDREDS = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];
const plural = (n: number, forms: [string, string, string]) => {
  const a = n % 100, b = n % 10;
  return a > 10 && a < 20 ? forms[2] : b === 1 ? forms[0] : b >= 2 && b <= 4 ? forms[1] : forms[2];
};
function triad(n: number, female: boolean) {
  const out: string[] = [];
  out.push(HUNDREDS[Math.floor(n / 100)]);
  const t = n % 100;
  if (t >= 10 && t < 20) out.push(TEENS[t - 10]);
  else { out.push(TENS[Math.floor(t / 10)]); out.push(ONES[female ? 1 : 0][t % 10]); }
  return out.filter(Boolean).join(" ");
}

/** 1 250 000,50 сом → «Один миллион двести пятьдесят тысяч сом 50 тыйын». */
export function amountInWords(minor: number, currency: "KGS" | "USD") {
  const whole = Math.floor(Math.abs(minor) / 100), cents = Math.abs(minor) % 100;
  const groups: [number, [string, string, string], boolean][] = [
    [Math.floor(whole / 1e9) % 1000, ["миллиард", "миллиарда", "миллиардов"], false],
    [Math.floor(whole / 1e6) % 1000, ["миллион", "миллиона", "миллионов"], false],
    [Math.floor(whole / 1e3) % 1000, ["тысяча", "тысячи", "тысяч"], true],
  ];
  const parts: string[] = [];
  for (const [n, forms, female] of groups) if (n) parts.push(`${triad(n, female)} ${plural(n, forms)}`);
  const rest = whole % 1000;
  if (rest || !parts.length) parts.push(rest ? triad(rest, false) : "ноль");
  const words = parts.join(" ").replace(/\s+/g, " ").trim();
  const unit = currency === "USD" ? plural(whole, ["доллар США", "доллара США", "долларов США"]) : "сом";
  const sub = currency === "USD" ? `${String(cents).padStart(2, "0")} ${plural(cents, ["цент", "цента", "центов"])}` : `${String(cents).padStart(2, "0")} тыйын`;
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} ${unit} ${sub}`;
}

export const DOCS = {
  contract: "Договор купли-продажи",
  invoice: "Счёт на оплату",
  act: "Акт приёма-передачи",
} as const;
export type DocKind = keyof typeof DOCS;

export async function saleDocument(actor: Actor, saleId: string) {
  const data = await getSale(actor, saleId);
  if (!data) return null;
  const unitIds = data.items.filter((i) => i.active && i.inventory_unit_id).map((i) => i.inventory_unit_id as string);
  const [{ company }, policy, penalty, units, customer] = await Promise.all([
    getCompany(),
    salesPolicy(),
    penaltyPolicy(),
    unitIds.length
      ? getRawDb().prepare(`SELECT id, vin, model, engine_number, year, color, passport_number, certificate_number FROM inventory_units_v2 WHERE id IN (${unitIds.map(() => "?").join(",")})`).bind(...unitIds).all<{ id: string; vin: string; model: string; engine_number: string; year: number | null; color: string; passport_number: string; certificate_number: string }>()
      : Promise.resolve({ results: [] }),
    getRawDb().prepare("SELECT name, phone, email, region, passport, address FROM crm_customers WHERE id=?").bind(data.sale.customer_id).first<{ name: string; phone: string; email: string; region: string; passport: string; address: string }>(),
  ]);
  return { ...data, company, policy, penalty, units: new Map(units.results.map((u) => [u.id, u])), customer };
}
