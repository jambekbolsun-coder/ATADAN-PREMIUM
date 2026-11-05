"use server";
/** Серверные действия Настроек: сотрудники, профиль, уведомления, реквизиты и правила продаж. */
import { revalidatePath } from "next/cache";
import { HttpError } from "../../lib/security";
import { requireStaff } from "./session";
import type { ActionResult } from "./sales-actions";
import * as team from "./team";
import * as company from "./company";

async function run<T>(work: () => Promise<T>, success: string, path = "/admin/settings"): Promise<ActionResult & { data?: T }> {
  try {
    const data = await work();
    revalidatePath(path);
    revalidatePath("/admin", "layout");
    return { ok: true, message: success, data };
  } catch (error) {
    if (error instanceof HttpError) return { ok: false, error: error.message };
    console.error("[admin/settings] action failed", error);
    return { ok: false, error: "Не удалось сохранить. Обновите страницу и повторите" };
  }
}
const f = (form: FormData, k: string) => String(form.get(k) ?? "");

export async function inviteAction(input: { email: string; role: string; permissions: string[] }) {
  const actor = await requireStaff("/admin/settings/team");
  return run(() => team.invite(actor, input), "Приглашение создано", "/admin/settings/team");
}
export async function revokeInviteAction(hash: string): Promise<ActionResult> {
  const actor = await requireStaff("/admin/settings/team");
  return run(() => team.revokeInvite(actor, hash), "Приглашение отозвано", "/admin/settings/team");
}
export async function permissionsAction(id: string, permissions: string[]): Promise<ActionResult> {
  const actor = await requireStaff("/admin/settings/team");
  return run(() => team.setPermissions(actor, id, permissions), "Доступы сохранены. Сотруднику нужно войти заново", "/admin/settings/team");
}
export async function roleAction(id: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff("/admin/settings/team");
  return run(() => team.setRole(actor, id, f(form, "role")), "Роль изменена", "/admin/settings/team");
}
export async function blockAction(id: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff("/admin/settings/team");
  return run(() => team.setActive(actor, id, false, f(form, "reassignTo")), "Сотрудник заблокирован, дела переданы", "/admin/settings/team");
}
export async function unblockAction(id: string): Promise<ActionResult> {
  const actor = await requireStaff("/admin/settings/team");
  return run(() => team.setActive(actor, id, true, ""), "Сотрудник разблокирован", "/admin/settings/team");
}
export async function resetLinkAction(id: string) {
  const actor = await requireStaff("/admin/settings/team");
  return run(() => team.resetLink(actor, id), "Ссылка создана", "/admin/settings/team");
}

export async function profileAction(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff("/admin/settings/profile");
  return run(() => team.saveProfile(actor, { name: f(form, "name"), phone: f(form, "phone"), position: f(form, "position"), avatar: f(form, "avatar"), bio: f(form, "bio") }), "Профиль сохранён", "/admin/settings/profile");
}
export async function notifyAction(prefs: Record<string, boolean>): Promise<ActionResult> {
  const actor = await requireStaff("/admin/settings/notifications");
  return run(() => team.saveNotifyPrefs(actor, prefs), "Сохранено", "/admin/settings/notifications");
}

export async function companyAction(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff("/admin/settings/company");
  return run(() => company.saveCompany(actor, {
    legalName: f(form, "legalName"), inn: f(form, "inn"), okpo: f(form, "okpo"), address: f(form, "address"), director: f(form, "director"), phone: f(form, "phone"), email: f(form, "email"),
    bankName: f(form, "bankName"), bik: f(form, "bik"), account: f(form, "account"), accountUsd: f(form, "accountUsd"), contractNote: f(form, "contractNote"), version: Number(f(form, "version")) || 0,
  }), "Реквизиты сохранены", "/admin/settings/company");
}
export async function policyAction(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff("/admin/settings/company");
  return run(() => company.savePolicy(actor, { reserveDays: f(form, "reserveDays"), stateLeasingReserveDays: f(form, "stateLeasingReserveDays"), belowCost: f(form, "belowCost"), ratePerDay: f(form, "ratePerDay"), graceDays: f(form, "graceDays"), maxPercent: f(form, "maxPercent"), warrantyMonths: f(form, "warrantyMonths"), warrantyHours: f(form, "warrantyHours") }), "Правила сохранены", "/admin/settings/company");
}
