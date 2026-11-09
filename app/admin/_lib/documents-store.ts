/**
 * Раздел «Документы»: папки на три уровня (Папка → Вид добавления → Тип документа).
 * Хранение то же, что в прошлой админке: admin_records (kind='documents') + documents_v2, папки в document_folders_v3,
 * свои значения уровней в record_options_v3. Старые документы видны здесь без переноса.
 */
import { getRawDb } from "../../../db";
import { canUseSection, type Actor } from "../../lib/admin-auth";
import { HttpError } from "../../lib/security";
import { defaultChoices } from "../../lib/workflow-options";
import { audit, isBoss, newId, num, query, safeJson, text } from "./db-kit";

export const LEVEL2_DEFAULT = ["Первичный", "Импорт 40", "Импорт 70"];
const LEVEL3_DEFAULT = defaultChoices.documentType;
const FIELD = { level2: "importType", level3: "documentType" } as const;

export type DocFolder = { id: string; name: string; version: number };
export type DocRow = {
  id: string; title: string; version: number; archived: boolean; created_at: string; created_by: string | null; author: string | null;
  date: string; folderId: string; level2: string; level3: string; fileUrl: string; attachments: string[];
  number: string; customerId: string; customer: string; vin: string; amount: string; note: string;
};
export type DocInput = {
  title: string; date: string; folderId: string; level2: string; level3: string; files: string[];
  number?: string; customerId?: string; customerName?: string; vin?: string; amount?: string; note?: string; version?: number;
};

export const canDocuments = (a: Actor) => canUseSection(a, "documents");
const canManage = (a: Actor) => isBoss(a) || a.role === "accountant";
function assertDocs(a: Actor) {
  if (!canDocuments(a)) throw new HttpError(403, "Нет доступа к документам");
}
const fileOk = (u: string) => /^\/api\/admin\/media\?key=admin-private\S+$/.test(u) || /^https:\/\/\S+$/.test(u);
const unique = (list: string[]) => [...new Set(list.filter(Boolean))];

type Data = Record<string, unknown>;
function toRow(r: { id: string; title: string; version: number; archived: number; created_at: string; created_by: string | null; author: string | null; data_json: string }, names: Map<string, string>): DocRow {
  const d = safeJson<Data>(r.data_json, {});
  const s = (k: string) => String(d[k] ?? "").trim();
  return {
    id: r.id, title: r.title, version: Number(r.version), archived: !!r.archived, created_at: r.created_at, created_by: r.created_by, author: r.author,
    date: s("date"), folderId: s("folderId") || "folder-1", level2: s("importType") || "Первичный", level3: s("documentType") || "Другое",
    fileUrl: s("fileUrl"), attachments: s("attachments").split("\n").map((x) => x.trim()).filter(Boolean),
    number: s("number"), customerId: s("customerId"), customer: names.get(s("customerId")) ?? s("customer"), vin: s("vin"), amount: s("amount"), note: s("note"),
  };
}

const SELECT = "SELECT r.id, r.title, r.version, r.archived, r.created_at, r.created_by, r.data_json, s.display_name AS author FROM admin_records r LEFT JOIN staff s ON s.id=r.created_by";
type RawDoc = Parameters<typeof toRow>[0];

async function namesOf(rows: RawDoc[]) {
  const ids = unique(rows.map((r) => String(safeJson<Data>(r.data_json, {}).customerId ?? "")));
  if (!ids.length) return new Map<string, string>();
  const { results } = await getRawDb().prepare(`SELECT id, name FROM crm_customers WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all<{ id: string; name: string }>();
  return new Map(results.map((c) => [c.id, c.name]));
}

export async function listDocuments(archived = false) {
  const { results } = await getRawDb().prepare(`${SELECT} WHERE r.kind='documents' AND r.archived=? ORDER BY COALESCE(NULLIF(r.data_json::jsonb->>'date',''), r.created_at::date::text) DESC, r.created_at DESC LIMIT 5000`).bind(archived ? 1 : 0).all<RawDoc>();
  const names = await namesOf(results);
  return results.map((r) => toRow(r, names));
}

export async function getDocument(id: string) {
  const r = await getRawDb().prepare(`${SELECT} WHERE r.kind='documents' AND r.id=?`).bind(id).first<RawDoc>();
  return r ? toRow(r, await namesOf([r])) : null;
}

/** Папки и значения уровней. В список входят и значения, которые встречаются в старых документах. */
export async function documentLevels(rows: Pick<DocRow, "level2" | "level3">[] = []) {
  const db = getRawDb();
  const [folders, options] = await Promise.all([
    db.prepare("SELECT id, name, version FROM document_folders_v3 ORDER BY id").all<DocFolder>(),
    db.prepare("SELECT field, value FROM record_options_v3 WHERE kind='documents' ORDER BY value").all<{ field: string; value: string }>(),
  ]);
  const of = (field: string) => options.results.filter((o) => o.field === field).map((o) => o.value);
  return {
    folders: folders.results.map((f) => ({ ...f, version: Number(f.version) })),
    level2: unique([...LEVEL2_DEFAULT, ...of(FIELD.level2), ...rows.map((r) => r.level2)]),
    level3: unique([...LEVEL3_DEFAULT, ...of(FIELD.level3), ...rows.map((r) => r.level3)]),
  };
}

export async function saveDocument(actor: Actor, input: DocInput, docId?: string) {
  assertDocs(actor);
  const title = text(input.title, 200);
  if (title.length < 2) throw new HttpError(400, "Укажите название документа");
  const date = text(input.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new HttpError(400, "Укажите дату документа");
  const folderId = text(input.folderId, 40);
  const level2 = text(input.level2, 60), level3 = text(input.level3, 60);
  if (!level2 || !level3) throw new HttpError(400, "Выберите вид добавления и тип документа");
  const files = unique((input.files ?? []).map((x) => text(x, 500))).filter(fileOk);
  if (!files.length) throw new HttpError(400, "Загрузите файл или фотографию");
  if (files.length > 31) throw new HttpError(400, "Слишком много файлов в одном документе");
  const amount = num(input.amount, "Сумма", { optional: true });
  const vin = text(input.vin, 40).toUpperCase();
  const customerId = text(input.customerId, 100);
  const db = getRawDb();
  if (customerId && !(await db.prepare("SELECT 1 FROM crm_customers WHERE id=? AND archived=0").bind(customerId).first())) throw new HttpError(404, "Клиент не найден");
  const unit = vin ? await db.prepare("SELECT id FROM inventory_units_v2 WHERE upper(vin)=? AND archived=0").bind(vin).first<{ id: string }>() : null;
  const fields = {
    date, folderId, importType: level2, documentType: level3, fileUrl: files[0], attachments: files.slice(1).join("\n"),
    number: text(input.number, 80), customerId, customer: text(input.customerName, 160), vin, inventoryUnitId: unit?.id ?? "", amount: amount === null ? "" : String(amount), note: text(input.note, 2000),
  };
  return db.transaction(async (client) => {
    const q = query(client);
    if (!(await q("SELECT 1 FROM document_folders_v3 WHERE id=?", folderId)).length) throw new HttpError(400, "Выберите папку");
    if (!LEVEL2_DEFAULT.includes(level2)) await q("INSERT INTO record_options_v3(kind,field,value) VALUES('documents',?,?) ON CONFLICT DO NOTHING", FIELD.level2, level2);
    if (!LEVEL3_DEFAULT.includes(level3)) await q("INSERT INTO record_options_v3(kind,field,value) VALUES('documents',?,?) ON CONFLICT DO NOTHING", FIELD.level3, level3);
    if (docId) {
      const [row] = await q<{ data_json: string; version: number; created_by: string | null }>("SELECT data_json, version, created_by FROM admin_records WHERE id=? AND kind='documents' FOR UPDATE", docId);
      if (!row) throw new HttpError(404, "Документ не найден");
      if (input.version !== undefined && Number(input.version) !== Number(row.version)) throw new HttpError(409, "Документ уже изменил другой сотрудник. Обновите страницу");
      await q("UPDATE admin_records SET title=?, category=?, data_json=?, updated_by=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", title, level2, JSON.stringify({ ...safeJson<Data>(row.data_json, {}), ...fields }), actor.id, docId);
      await q("UPDATE documents_v2 SET customer_id=?, document_type=?, title=?, file_url=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", customerId || null, level3, title, files[0], docId);
      await audit(q, actor, "document.update", docId, title);
      return docId;
    }
    const id = newId();
    await q("INSERT INTO admin_records(id,kind,title,status,category,data_json,created_by,updated_by) VALUES(?,'documents',?,'active',?,?,?,?)", id, title, level2, JSON.stringify(fields), actor.id, actor.id);
    await q("INSERT INTO documents_v2(id,customer_id,document_type,title,file_url,status,uploaded_by) VALUES(?,?,?,?,?,'uploaded',?)", id, customerId || null, level3, title, files[0], actor.id);
    await audit(q, actor, "document.create", id, title);
    return id;
  });
}

export async function setDocumentArchived(actor: Actor, docId: string, archived: boolean) {
  assertDocs(actor);
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [row] = await q<{ title: string; created_by: string | null }>("SELECT title, created_by FROM admin_records WHERE id=? AND kind='documents' FOR UPDATE", docId);
    if (!row) throw new HttpError(404, "Документ не найден");
    if (!canManage(actor) && row.created_by !== actor.id) throw new HttpError(403, "Убрать в архив можно только свой документ");
    await q("UPDATE admin_records SET archived=?, updated_by=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", archived ? 1 : 0, actor.id, docId);
    await q("UPDATE documents_v2 SET archived=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", archived ? 1 : 0, docId);
    await audit(q, actor, archived ? "document.archive" : "document.restore", docId, row.title);
  });
}

export async function addFolder(actor: Actor, nameInput: string) {
  assertDocs(actor);
  const name = text(nameInput, 60);
  if (!name) throw new HttpError(400, "Укажите название папки");
  await getRawDb().prepare("INSERT INTO document_folders_v3(id,name) VALUES(?,?)").bind(`folder-n${Date.now()}`, name).run();
}

export async function renameFolder(actor: Actor, id: string, version: number, nameInput: string) {
  if (!canManage(actor)) throw new HttpError(403, "Переименовать папку могут владелец, директор и бухгалтер");
  const name = text(nameInput, 60);
  if (!name) throw new HttpError(400, "Укажите название папки");
  const r = await getRawDb().prepare("UPDATE document_folders_v3 SET name=?, version=version+1 WHERE id=? AND version=?").bind(name, id, version).run();
  if (!r.meta.changes) throw new HttpError(409, "Папку уже изменил другой сотрудник. Обновите страницу");
}

export async function addLevelValue(actor: Actor, level: "level2" | "level3", valueInput: string) {
  assertDocs(actor);
  const value = text(valueInput, 60);
  if (!value) throw new HttpError(400, "Укажите название");
  await getRawDb().prepare("INSERT INTO record_options_v3(kind,field,value) VALUES('documents',?,?) ON CONFLICT DO NOTHING").bind(FIELD[level], value).run();
}
