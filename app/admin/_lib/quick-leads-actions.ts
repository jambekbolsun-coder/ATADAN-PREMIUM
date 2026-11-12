"use server";
/** Серверные действия «Быстрых заявок». */
import { revalidatePath } from "next/cache";
import { HttpError } from "../../lib/security";
import { requireStaff } from "./session";
import * as quick from "./quick-leads";

export async function duplicatesAction(phones: string[]): Promise<quick.Duplicate[]> {
  const actor = await requireStaff();
  if (!quick.canQuickLeads(actor)) return [];
  return quick.findDuplicates(Array.isArray(phones) ? phones.map(String) : []);
}

export async function saveQuickLeadsAction(payload: { assignee: string; items: quick.QuickLeadInput[] }): Promise<{ ok: boolean; error?: string; count?: number }> {
  const actor = await requireStaff();
  try {
    const count = await quick.createQuickLeads(actor, payload);
    revalidatePath("/admin/work/leads");
    revalidatePath("/admin/work/quick-leads");
    revalidatePath("/admin", "layout");
    return { ok: true, count };
  } catch (error) {
    if (error instanceof HttpError) return { ok: false, error: error.message };
    console.error("[admin/quick-leads] save failed", error);
    return { ok: false, error: "Не удалось сохранить. Обновите страницу и повторите" };
  }
}
