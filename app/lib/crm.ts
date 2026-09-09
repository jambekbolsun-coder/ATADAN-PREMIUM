import { getRawDb } from "../../db";
import type { Actor } from "./admin-auth";
import { HttpError } from "./security";
export const stages = ["new", "ai", "qualified", "meeting", "negotiation", "reserved", "contract", "awaiting_payment", "won", "lost"] as const;
export type Stage = typeof stages[number];
export const stageLabels: Record<Stage,string> = {new:"Новая заявка",ai:"AI-консультация",qualified:"Квалифицирован",meeting:"Встреча",negotiation:"Переговоры",reserved:"Бронь",contract:"Договор",awaiting_payment:"Ожидание оплаты",won:"Успешно продано",lost:"Закрыто"};
export function canTransition(from: string, to: string, role: string, reason: string, amount: number) {
  if (!stages.includes(to as Stage)) throw new HttpError(400,"Неизвестный этап");
  if ((from === "won" || from === "lost") && from !== to && role !== "owner" && role !== "director") throw new HttpError(403,"Закрытую сделку может вернуть директор");
  if (to === "lost" && reason.trim().length < 3) throw new HttpError(400,"Укажите причину отказа");
  if (to === "won" && amount <= 0) throw new HttpError(400,"Укажите сумму продажи");
}
export function minor(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1_000_000_000) throw new HttpError(400,"Проверьте денежную сумму");
  return Math.round(value*100);
}
export function auditStatement(actor: Actor, action: string, entity: string, detail = "") {
  return getRawDb().prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),actor.id,action,entity,detail.slice(0,2000));
}
export async function visibleDeal(actor: Actor, id: string) {
  const deal = await getRawDb().prepare("SELECT * FROM crm_deals WHERE id=? AND archived=0").bind(id).first<{id:string; assigned_to:string|null;stage:string;amount_minor:number;version:number;customer_id:string;lead_id:string|null}>();
  if (!deal || (!["owner","director"].includes(actor.role) && deal.assigned_to !== actor.id)) throw new HttpError(404,"Сделка не найдена");
  return deal;
}
