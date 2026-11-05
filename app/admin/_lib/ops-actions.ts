"use server";
/** Серверные действия: сервис и гарантия, зарплаты. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HttpError } from "../../lib/security";
import { requireStaff } from "./session";
import type { ActionResult } from "./sales-actions";
import * as service from "./service";
import * as payroll from "./payroll";

async function run(work: () => Promise<unknown>, success: string, paths: string[]): Promise<ActionResult> {
  try {
    await work();
  } catch (error) {
    if (error instanceof HttpError) return { ok: false, error: error.message };
    console.error("[admin/ops] action failed", error);
    return { ok: false, error: "Не удалось сохранить. Обновите страницу и повторите" };
  }
  for (const p of paths) revalidatePath(p);
  revalidatePath("/admin", "layout");
  return { ok: true, message: success };
}
const f = (form: FormData, k: string) => String(form.get(k) ?? "");

export async function searchServiceUnitsAction(q: string) {
  const actor = await requireStaff("/admin/work/service");
  if (!service.canService(actor) || q.trim().length < 2) return [];
  return service.serviceUnits(q.trim().slice(0, 60));
}

export async function createTicketAction(input: { unitId: string; kind: string; issue: string; engineHours?: string; dueAt?: string; assignedTo?: string; outOfWarranty?: boolean }): Promise<ActionResult> {
  const actor = await requireStaff("/admin/work/service/new");
  let id = "";
  const r = await run(async () => { id = await service.createTicket(actor, input); }, "Обращение создано", ["/admin/work/service"]);
  if (r.ok) redirect(`/admin/work/service/${id}`);
  return r;
}

export async function updateTicketAction(id: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff("/admin/work/service");
  return run(() => service.updateTicket(actor, id, { status: f(form, "status"), note: f(form, "note"), resolution: f(form, "resolution"), price: f(form, "price"), assignedTo: f(form, "assignedTo"), dueAt: f(form, "dueAt") }), "Обращение обновлено", [`/admin/work/service/${id}`, "/admin/work/service"]);
}

export async function payrollAction(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff("/admin/work/payroll");
  return run(() => payroll.addPayroll(actor, { staffId: f(form, "staffId"), period: f(form, "period"), kind: f(form, "kind"), amount: f(form, "amount"), note: f(form, "note"), accountId: f(form, "accountId") }), f(form, "kind") === "payout" ? "Выплата проведена через кассу" : "Записано", ["/admin/work/payroll", "/admin/work/cash", "/admin/work/expenses"]);
}

export async function voidPayrollAction(id: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff("/admin/work/payroll");
  return run(() => payroll.voidPayroll(actor, id, f(form, "reason")), "Запись отменена", ["/admin/work/payroll", "/admin/work/cash", "/admin/work/expenses"]);
}
