"use server";
/** Серверные действия перевозок. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HttpError } from "../../lib/security";
import { requireStaff } from "./session";
import * as d from "./deliveries";
import type { ActionResult } from "./sales-actions";

const LIST = "/admin/work/logistics";

async function run(work: () => Promise<unknown>, success: string, id?: string): Promise<ActionResult> {
  try {
    await work();
  } catch (error) {
    if (error instanceof HttpError) return { ok: false, error: error.message };
    console.error("[admin/deliveries] action failed", error);
    return { ok: false, error: "Не удалось сохранить. Обновите страницу и повторите" };
  }
  revalidatePath(LIST);
  if (id) revalidatePath(`${LIST}/deliveries/${id}`);
  return { ok: true, message: success };
}

export async function saveDeliveryAction(input: d.DeliveryInput, deliveryId?: string): Promise<ActionResult> {
  const actor = await requireStaff();
  let id = deliveryId ?? "";
  const r = await run(async () => { id = await d.saveDelivery(actor, input, deliveryId); }, "Перевозка сохранена");
  if (r.ok) redirect(`${LIST}/deliveries/${id}?saved=1`);
  return r;
}
export async function deliveryStatusAction(id: string, status: string): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => d.setDeliveryStatus(actor, id, status), "Статус обновлён", id);
}
export async function payDeliveryAction(id: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => d.payDelivery(actor, id, { accountId: String(form.get("accountId") ?? ""), amount: String(form.get("amount") ?? ""), paidAt: String(form.get("paidAt") ?? "") }), "Оплата записана", id);
}
export async function voidDeliveryPaymentAction(id: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => d.voidDeliveryPayment(actor, id, String(form.get("reason") ?? "")), "Оплата сторнирована", id);
}
