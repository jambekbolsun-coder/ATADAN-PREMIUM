"use server";
/**
 * Серверные действия отдела продаж. Каждое: проверяет вход, вызывает операцию из sales.ts,
 * обновляет экраны и возвращает понятный результат для формы. Ошибки не «глотаются»:
 * пользователь видит причину рядом с кнопкой.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HttpError } from "../../lib/security";
import { requireStaff } from "./session";
import * as sales from "./sales";

export type ActionResult = { ok: boolean; error?: string; message?: string };

async function run(work: () => Promise<unknown>, success: string, paths: string[]): Promise<ActionResult> {
  try {
    await work();
  } catch (error) {
    if (error instanceof HttpError) return { ok: false, error: error.message };
    const code = (error as { code?: string })?.code;
    if (code === "23505") return { ok: false, error: "Эта машина или номер уже заняты другой продажей. Обновите страницу" };
    console.error("[admin/sales] action failed", error);
    return { ok: false, error: "Не удалось сохранить. Обновите страницу и повторите" };
  }
  for (const p of paths) revalidatePath(p);
  revalidatePath("/admin", "layout");
  return { ok: true, message: success };
}

const f = (form: FormData, key: string) => String(form.get(key) ?? "");

export async function createSaleAction(payload: sales.NewSaleInput): Promise<ActionResult & { id?: string }> {
  const actor = await requireStaff("/admin/work/sales/new");
  let created: { id: string; number: string } | null = null;
  const result = await run(async () => {
    created = await sales.createSale(actor, payload);
  }, "Продажа оформлена", ["/admin/work/sales", "/admin/work/leads", "/admin/work/stock"]);
  if (!result.ok || !created) return result;
  redirect(`/admin/work/sales/${(created as { id: string }).id}?created=1`);
}

export async function addPaymentAction(saleId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(
    () => sales.addPayment(actor, saleId, { payer: f(form, "payer") as "client" | "bank", accountId: f(form, "accountId"), currency: f(form, "currency") as sales.SaleCurrency, amount: f(form, "amount"), fxRate: f(form, "fxRate"), paidAt: f(form, "paidAt"), method: f(form, "method"), reference: f(form, "reference") }),
    "Платёж проведён",
    [`/admin/work/sales/${saleId}`, "/admin/work/sales"],
  );
}

export async function refundAction(saleId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => sales.refund(actor, saleId, { accountId: f(form, "accountId"), currency: f(form, "currency") as sales.SaleCurrency, amount: f(form, "amount"), fxRate: f(form, "fxRate"), reason: f(form, "reason") }), "Возврат проведён", [`/admin/work/sales/${saleId}`]);
}

export async function voidPaymentAction(saleId: string, paymentId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => sales.voidPayment(actor, paymentId, f(form, "reason")), "Платёж сторнирован", [`/admin/work/sales/${saleId}`]);
}

export async function bankDecisionAction(saleId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const decision = f(form, "decision") === "approved" ? "approved" : "rejected";
  return run(() => sales.setBankDecision(actor, saleId, decision, f(form, "note")), decision === "approved" ? "Отмечено: банк одобрил" : "Отмечено: банк отказал", [`/admin/work/sales/${saleId}`]);
}

export async function changeMethodAction(saleId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => sales.changeMethod(actor, saleId, f(form, "method") as sales.PaymentMethod, f(form, "bankName")), "Способ оплаты изменён", [`/admin/work/sales/${saleId}`]);
}

export async function allowDebtAction(saleId: string): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => sales.allowDebt(actor, saleId), "Выдача в долг разрешена", [`/admin/work/sales/${saleId}`]);
}

export async function deliverAction(saleId: string): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => sales.deliver(actor, saleId), "Техника выдана", [`/admin/work/sales/${saleId}`, "/admin/work/stock"]);
}

export async function attachUnitAction(saleId: string, itemId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => sales.attachUnit(actor, itemId, f(form, "unitId")), "VIN привязан", [`/admin/work/sales/${saleId}`]);
}

export async function extendReserveAction(saleId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => sales.extendReserve(actor, saleId, f(form, "until"), f(form, "reason")), "Резерв продлён", [`/admin/work/sales/${saleId}`]);
}

export async function cancelSaleAction(saleId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => sales.cancelSale(actor, saleId, f(form, "reason")), "Продажа отменена, резерв снят", [`/admin/work/sales/${saleId}`, "/admin/work/sales", "/admin/work/stock"]);
}

export async function toggleDossierAction(saleId: string, key: string, done: boolean): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => sales.toggleDossier(actor, saleId, key, done), "Сохранено", [`/admin/work/sales/${saleId}`]);
}

export async function takeLeadAction(leadId: string): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => sales.takeLead(actor, leadId), "Заявка у вас в работе", ["/admin/work/leads"]);
}

export async function rejectLeadAction(leadId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => sales.rejectLead(actor, leadId, f(form, "code"), f(form, "note")), "Заявка закрыта", ["/admin/work/leads"]);
}

export async function reopenLeadAction(leadId: string): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => sales.reopenLead(actor, leadId), "Заявка снова в работе", ["/admin/work/leads"]);
}

export async function createLeadAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const result = await run(() => sales.createLead(actor, { name: f(form, "name"), phone: f(form, "phone"), model: f(form, "model"), source: f(form, "source"), comment: f(form, "comment") }), "Заявка добавлена", ["/admin/work/leads"]);
  if (result.ok) redirect("/admin/work/leads?view=work");
  return result;
}

export type CustomerHit = { id: string; name: string; phone: string; region: string };

/** Поиск клиента в форме продажи. Менеджер видит своих клиентов и клиента по полному номеру телефона. */
export async function searchCustomersAction(query: string): Promise<CustomerHit[]> {
  const actor = await requireStaff();
  const q = String(query ?? "").trim().slice(0, 60);
  if (q.length < 2) return [];
  const { getRawDb } = await import("../../../db");
  const like = `%${q.toLowerCase().replace(/[%_\\]/g, "")}%`;
  const digits = q.replace(/\D/g, "");
  const company = sales.isCompany(actor);
  const { results } = await getRawDb()
    .prepare(
      `SELECT c.id, c.name, c.phone, c.region FROM crm_customers c
       WHERE c.archived=0 AND (
         ${company ? "lower(c.name) LIKE ? OR (length(?)>=4 AND regexp_replace(c.phone,'\\D','','g') LIKE ?)" : "((c.assigned_to=? OR EXISTS (SELECT 1 FROM sale_orders o WHERE o.customer_id=c.id AND o.manager_id=?)) AND (lower(c.name) LIKE ? OR (length(?)>=4 AND regexp_replace(c.phone,'\\D','','g') LIKE ?))) OR (length(?)>=9 AND c.normalized_phone LIKE ?)"}
       ) ORDER BY c.updated_at DESC LIMIT 8`,
    )
    .bind(...(company ? [like, digits, `%${digits}%`] : [actor.id, actor.id, like, digits, `%${digits}%`, digits, `%${digits}`]))
    .all<CustomerHit>();
  return results;
}
