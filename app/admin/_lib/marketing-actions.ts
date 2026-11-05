"use server";
/**
 * Серверные действия Маркетинга. После каждой записи обновляется и админка, и публичный сайт
 * (revalidatePath("/", "layout")), чтобы изменения были видны на atadan.kg сразу.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HttpError } from "../../lib/security";
import { requireStaff } from "./session";
import type { ActionResult } from "./sales-actions";
import * as catalog from "./catalog-admin";
import * as news from "./news-admin";
import * as records from "./records-admin";
import * as parts from "./parts";
import * as site from "./site-admin";

async function run(work: () => Promise<unknown>, success: string): Promise<ActionResult> {
  try {
    await work();
  } catch (error) {
    if (error instanceof HttpError) return { ok: false, error: error.message };
    const code = (error as { code?: string })?.code;
    if (code === "23505") return { ok: false, error: "Такой адрес или артикул уже есть" };
    console.error("[admin/marketing] action failed", error);
    return { ok: false, error: "Не удалось сохранить. Обновите страницу и повторите" };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: success };
}
const f = (form: FormData, key: string) => String(form.get(key) ?? "");

// ── каталог техники
export async function saveModelAction(input: catalog.ModelInput): Promise<ActionResult> {
  const actor = await requireStaff("/admin/marketing/catalog");
  let slug = "";
  const r = await run(async () => { slug = await catalog.saveModel(actor, input); }, "Модель сохранена");
  if (r.ok && (!input.originalSlug || input.originalSlug !== slug)) redirect(`/admin/marketing/catalog/${slug}?saved=1`);
  return r;
}
export async function modelStatusAction(slug: string, status: string): Promise<ActionResult> {
  const actor = await requireStaff("/admin/marketing/catalog");
  return run(() => catalog.setModelStatus(actor, slug, status), status === "published" ? "Модель на сайте" : "Статус изменён");
}
export async function modelCostAction(slug: string, version: number, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff("/admin/marketing/catalog");
  return run(() => catalog.saveModelCost(actor, slug, f(form, "cost"), version), "Себестоимость сохранена");
}

// ── публикации
export async function savePostAction(input: news.PostInput): Promise<ActionResult> {
  const actor = await requireStaff("/admin/marketing/news");
  let slug = "";
  const r = await run(async () => { slug = await news.savePost(actor, input); }, input.status === "published" ? "Опубликовано" : "Сохранено");
  if (r.ok && input.originalSlug !== slug) redirect(`/admin/marketing/news/${slug}?saved=1`);
  return r;
}
export async function postStatusAction(slug: string, status: string): Promise<ActionResult> {
  const actor = await requireStaff("/admin/marketing/news");
  return run(() => news.setPostStatus(actor, slug, status), status === "published" ? "Опубликовано" : "Статус изменён");
}
export async function deletePostAction(slug: string): Promise<ActionResult> {
  const actor = await requireStaff("/admin/marketing/news");
  const r = await run(() => news.deletePost(actor, slug), "Публикация удалена");
  if (r.ok) redirect("/admin/marketing/news");
  return r;
}

// ── записи сайта: акции, лизинг, FAQ, сервис
export async function saveRecordAction(kind: string, input: records.RecordInput): Promise<ActionResult & { id?: string }> {
  const actor = await requireStaff("/admin/marketing");
  let id = "";
  const r = await run(async () => { id = await records.saveRecord(actor, kind, input); }, "Сохранено");
  return { ...r, id };
}
export async function recordStatusAction(kind: string, id: string, status: string): Promise<ActionResult> {
  const actor = await requireStaff("/admin/marketing");
  return run(() => records.setRecordStatus(actor, kind, id, status), "Статус изменён");
}
export async function recordMoveAction(kind: string, id: string, dir: -1 | 1): Promise<ActionResult> {
  const actor = await requireStaff("/admin/marketing");
  return run(() => records.moveRecord(actor, kind, id, dir), "Порядок изменён");
}
export async function recordArchiveAction(kind: string, id: string): Promise<ActionResult> {
  const actor = await requireStaff("/admin/marketing");
  return run(() => records.archiveRecord(actor, kind, id), "Убрано в архив");
}

// ── запчасти
export async function savePartAction(input: parts.PartInput): Promise<ActionResult> {
  const actor = await requireStaff("/admin/marketing/parts");
  let id = "";
  const r = await run(async () => { id = await parts.savePart(actor, input); }, "Запчасть сохранена");
  if (r.ok && !input.id) redirect(`/admin/work/parts/${id}?saved=1`);
  return r;
}
export async function partMovementAction(partId: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff("/admin/work/parts");
  return run(() => parts.addMovement(actor, partId, { kind: f(form, "kind"), qty: f(form, "qty"), unitCost: f(form, "unitCost"), note: f(form, "note") }), "Движение проведено");
}
export async function partArchiveAction(partId: string, archived: boolean): Promise<ActionResult> {
  const actor = await requireStaff("/admin/work/parts");
  return run(() => parts.archivePart(actor, partId, archived), archived ? "Убрано в архив" : "Возвращено");
}

// ── страницы сайта: контакты и калькулятор
export async function saveSiteAction(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff("/admin/marketing/pages");
  return run(() => site.saveContacts(actor, {
    phone: f(form, "phone"), address: f(form, "address"), instagram: f(form, "instagram"), email: f(form, "email"), workingHours: f(form, "workingHours"),
    annualRate: f(form, "annualRate"), downPercent: f(form, "downPercent"), fee: f(form, "fee"), method: f(form, "method"), version: Number(f(form, "version")) || 0,
  }), "Сайт обновлён");
}
