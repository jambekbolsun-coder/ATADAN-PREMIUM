"use server";
/** Серверные действия раздела «Документы». */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HttpError } from "../../lib/security";
import { requireStaff } from "./session";
import * as store from "./documents-store";
import type { ActionResult } from "./sales-actions";

const PATH = "/admin/work/documents";

async function run(work: () => Promise<unknown>, success: string): Promise<ActionResult> {
  try {
    await work();
  } catch (error) {
    if (error instanceof HttpError) return { ok: false, error: error.message };
    console.error("[admin/documents] action failed", error);
    return { ok: false, error: "Не удалось сохранить. Обновите страницу и повторите" };
  }
  revalidatePath(PATH, "layout");
  return { ok: true, message: success };
}

export async function saveDocumentAction(input: store.DocInput, docId?: string): Promise<ActionResult> {
  const actor = await requireStaff();
  let id = docId ?? "";
  const r = await run(async () => { id = await store.saveDocument(actor, input, docId); }, "Документ сохранён");
  if (r.ok) redirect(`${PATH}/${id}?saved=1`);
  return r;
}
export async function archiveDocumentAction(docId: string, archived: boolean): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => store.setDocumentArchived(actor, docId, archived), archived ? "Документ в архиве" : "Документ возвращён");
}
export async function addFolderAction(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => store.addFolder(actor, String(form.get("name") ?? "")), "Папка создана");
}
export async function renameFolderAction(id: string, version: number, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => store.renameFolder(actor, id, version, String(form.get("name") ?? "")), "Папка переименована");
}
export async function addLevelValueAction(level: "level2" | "level3", _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => store.addLevelValue(actor, level, String(form.get("value") ?? "")), "Добавлено");
}
