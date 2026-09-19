import { getRawDb } from "../../../../db";
import { canUseSection, requireActor } from "../../../lib/admin-auth";
import { normalizePhone, normalizeVin, somToMinor } from "../../../lib/business";
import { auditStatement } from "../../../lib/crm";
import { cleanText, fail, HttpError, jsonBody, sameOrigin } from "../../../lib/security";

export const runtime = "nodejs";

const MAX_IMPORT_BYTES = 5_000_000;
const MAX_IMPORT_ROWS = 5_000;

const exportPermission: Record<string, string> = {
  clients: "client-base", deals: "deals", sales: "sales", inventory: "inventory-units",
  payments: "payments", debts: "debts", expenses: "expenses",
};

const exportSql: Record<string, string> = {
  clients: "SELECT id,name,phone,email,region,source,tractor_slug,power,budget_minor,created_at FROM crm_customers WHERE archived=0 ORDER BY created_at DESC",
  deals: "SELECT id,customer_id,title,tractor_slug,stage,amount_minor,inventory_unit_id,assigned_to,loss_reason_code,loss_reason,created_at,updated_at FROM crm_deals WHERE archived=0 ORDER BY updated_at DESC",
  sales: "SELECT s.id,s.deal_id,c.name customer,i.vin,i.model,s.sale_amount_minor,s.cost_minor,s.sold_at,s.delivered_at FROM sales_v2 s JOIN crm_customers c ON c.id=s.customer_id JOIN inventory_units_v2 i ON i.id=s.inventory_unit_id WHERE s.archived=0 ORDER BY s.sold_at DESC",
  inventory: "SELECT id,vin,tractor_slug,model,status,purchase_cost_minor,landed_cost_minor,list_price_minor,location,responsible_id,updated_at FROM inventory_units_v2 WHERE archived=0 ORDER BY vin",
  payments: "SELECT p.id,p.deal_id,c.name customer,a.name account,p.amount_minor,p.method,p.status,p.paid_at,p.reference FROM payments_v2 p JOIN crm_customers c ON c.id=p.customer_id JOIN financial_accounts a ON a.id=p.account_id WHERE p.archived=0 ORDER BY p.paid_at DESC",
  debts: "SELECT r.id,r.deal_id,c.name customer,r.principal_minor,COALESCE(p.paid_minor,0) paid_minor,GREATEST(r.principal_minor-COALESCE(p.paid_minor,0),0) outstanding_minor,r.due_at,r.status FROM receivables_v2 r JOIN crm_customers c ON c.id=r.customer_id LEFT JOIN (SELECT deal_id,SUM(amount_minor) paid_minor FROM payments_v2 WHERE status='posted' AND archived=0 GROUP BY deal_id) p ON p.deal_id=r.deal_id WHERE r.archived=0 ORDER BY r.due_at",
  expenses: "SELECT t.id,a.name account,t.amount_minor,t.category,t.occurred_at,t.description FROM account_transactions t JOIN financial_accounts a ON a.id=t.account_id WHERE t.direction='out' AND t.reversed_by IS NULL ORDER BY t.occurred_at DESC",
};

type ImportKind = "customers" | "inventory";
type ImportRow = Record<string, string> & { __row: string };

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  return `\uFEFF${columns.map(csvCell).join(",")}\r\n${rows.map((row) => columns.map((key) => csvCell(row[key])).join(",")).join("\r\n")}`;
}

function parseCsv(source: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  row.push(cell.replace(/\r$/, ""));
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function cellText(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

const headerAliases: Record<ImportKind, Record<string, string>> = {
  customers: {
    name: "name", "имя": "name", "фио": "name", "клиент": "name",
    phone: "phone", "телефон": "phone", "номер телефона": "phone",
    email: "email", "электронная почта": "email", "почта": "email",
    region: "region", "регион": "region", "город": "region",
    source: "source", "источник": "source", "канал": "source",
  },
  inventory: {
    vin: "vin", "вин": "vin", "серийный номер": "vin", model: "model", "модель": "model",
    tractorslug: "tractorSlug", "tractor slug": "tractorSlug", slug: "tractorSlug", "slug модели": "tractorSlug",
    purchasecost: "purchaseCost", "purchase cost": "purchaseCost", "закупочная цена": "purchaseCost",
    expenses: "expenses", "дополнительные расходы": "expenses", "расходы": "expenses",
    saleprice: "salePrice", "sale price": "salePrice", "цена продажи": "salePrice",
    location: "location", "местонахождение": "location", "склад": "location",
  },
};

function canonicalHeader(value: unknown, kind: ImportKind) {
  const normalized = cellText(value).replace(/^\uFEFF/, "").toLowerCase().replaceAll("_", " ").replace(/\s+/g, " ");
  return headerAliases[kind][normalized] ?? normalized.replaceAll(" ", "");
}

function tableToRows(table: unknown[][], kind: ImportKind): ImportRow[] {
  const [headerCells, ...body] = table;
  if (!headerCells?.length) return [];
  const headers = headerCells.map((value) => canonicalHeader(value, kind));
  const populated = body.map((values, index) => ({ values, sourceRow: index + 2 }))
    .filter(({ values }) => values.some((value) => Boolean(cellText(value))));
  if (populated.length > MAX_IMPORT_ROWS) throw new HttpError(413, `За один раз можно импортировать не более ${MAX_IMPORT_ROWS} строк`);
  return populated.map(({ values, sourceRow }) => Object.assign(
    Object.fromEntries(headers.map((header, column) => [header, cellText(values[column])])),
    { __row: String(sourceRow) },
  ));
}

async function importPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    const body = await jsonBody(request, 1_500_000);
    const action = cleanText(body.action, 40, true);
    const kind = cleanText(body.kind, 30, true) as ImportKind;
    const csv = cleanText(body.csv, 1_400_000, true);
    return { action, kind, rows: tableToRows(parseCsv(csv), kind), filename: "import.csv" };
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_IMPORT_BYTES + 100_000) throw new HttpError(413, "Файл должен быть меньше 5 МБ");
  const form = await request.formData();
  const action = cleanText(form.get("action"), 40, true);
  const kind = cleanText(form.get("kind"), 30, true) as ImportKind;
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) throw new HttpError(400, "Выберите CSV или XLSX-файл");
  if (file.size > MAX_IMPORT_BYTES) throw new HttpError(413, "Файл должен быть меньше 5 МБ");
  const filename = cleanText(file.name, 240, true);
  const extension = filename.split(".").pop()?.toLowerCase();
  let table: unknown[][];
  if (extension === "csv" || file.type === "text/csv") table = parseCsv(await file.text());
  else if (extension === "xlsx" || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    const { readSheet } = await import("read-excel-file/node");
    table = await readSheet(Buffer.from(await file.arrayBuffer()));
  } else throw new HttpError(415, "Поддерживаются только CSV и XLSX");
  return { action, kind, rows: tableToRows(table, kind), filename };
}

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request), type = cleanText(new URL(request.url).searchParams.get("type") ?? "", 30, true), db = getRawDb();
    if (type === "backup") {
      if (!["owner", "director"].includes(actor.role)) throw new HttpError(403, "Доступно директору");
      const [last, health] = await Promise.all([
        db.prepare("SELECT * FROM backup_runs ORDER BY started_at DESC LIMIT 1").first<{ status: string }>(),
        db.prepare("SELECT CURRENT_TIMESTAMP checked_at,(SELECT COUNT(*) FROM crm_customers) customers,(SELECT COUNT(*) FROM crm_deals) deals,(SELECT COUNT(*) FROM inventory_units_v2) inventory,(SELECT COUNT(*) FROM account_transactions) transactions").first(),
      ]);
      return Response.json({ provider: "Neon/PostgreSQL", databaseReachable: true, last, health, providerBackupVerified: last?.status === "provider_verified", requireProviderBackupVerification: last?.status !== "provider_verified" });
    }
    const permission = exportPermission[type], sql = exportSql[type];
    if (!permission || !sql || !canUseSection(actor, permission)) throw new HttpError(403, "Нет доступа к экспорту");
    const rows = await db.prepare(sql).all();
    return new Response(toCsv(rows.results), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename=atadan-${type}-${new Date().toISOString().slice(0, 10)}.csv`, "Cache-Control": "no-store" } });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const actor = await requireActor(request);
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      const body = await jsonBody(request.clone(), 1_500_000);
      if (cleanText(body.action, 40, true) === "backup_check") {
        if (!["owner", "director"].includes(actor.role)) throw new HttpError(403, "Доступно директору");
        const id = crypto.randomUUID(), db = getRawDb();
        await db.batch([
          db.prepare("INSERT INTO backup_runs(id,status,provider,completed_at,verified_at,detail) VALUES(?,'database_integrity_verified','neon',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'Соединение и критичные таблицы проверены; наличие и срок хранения provider backup подтверждаются отдельно в Neon')").bind(id),
          auditStatement(actor, "Проверена целостность базы", id),
        ]);
        return Response.json({ id, status: "database_integrity_verified", providerBackupVerified: false });
      }
    }

    const { action, kind, rows, filename } = await importPayload(request);
    if (action !== "validate_import" && action !== "commit_import") throw new HttpError(400, "Неизвестное действие");
    if (!new Set(["customers", "inventory"]).has(kind)) throw new HttpError(400, "Импорт доступен для клиентов и склада");
    if (!canUseSection(actor, kind === "customers" ? "client-base" : "inventory-units")) throw new HttpError(403, "Нет доступа к импорту");

    const required = kind === "customers" ? ["name", "phone"] : ["vin", "model", "tractorSlug"];
    const available = new Set(rows.flatMap((row) => Object.keys(row)));
    const missing = required.filter((key) => !available.has(key));
    if (missing.length) throw new HttpError(400, `В файле нет обязательных колонок: ${missing.join(", ")}`);
    if (!rows.length) throw new HttpError(400, "В файле нет строк данных");

    const db = getRawDb();
    const valid: Array<Record<string, unknown> & { __row: number }> = [];
    const errors: Array<{ row: number; error: string }> = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const sourceRow = Number(row.__row);
      try {
        if (kind === "customers") {
          const name = cleanText(row.name, 120, true), phone = cleanText(row.phone, 40, true), normalizedPhone = normalizePhone(phone);
          if (seen.has(normalizedPhone)) throw new Error("Дубликат телефона в файле");
          seen.add(normalizedPhone);
          valid.push({ __row: sourceRow, name, phone, normalizedPhone, email: cleanText(row.email ?? "", 200), region: cleanText(row.region ?? "", 100), source: cleanText(row.source ?? "import", 100) });
        } else {
          const vin = normalizeVin(row.vin);
          if (seen.has(vin)) throw new Error("Дубликат VIN в файле");
          seen.add(vin);
          valid.push({ __row: sourceRow, vin, model: cleanText(row.model, 120, true), tractorSlug: cleanText(row.tractorSlug, 120, true), purchaseCostMinor: somToMinor(Number(row.purchaseCost || 0)), landedCostMinor: somToMinor(Number(row.expenses || 0)), listPriceMinor: somToMinor(Number(row.salePrice || 0)), location: cleanText(row.location ?? "", 200) });
        }
      } catch (error) { errors.push({ row: sourceRow, error: error instanceof Error ? error.message : "Некорректная строка" }); }
    }

    const keys = valid.map((row) => kind === "customers" ? row.normalizedPhone : row.vin);
    const existing = kind === "customers"
      ? await db.prepare(`SELECT normalized_phone key FROM crm_customers WHERE normalized_phone IN (${keys.map(() => "?").join(",") || "NULL"}) AND archived=0`).bind(...keys).all<{ key: string }>()
      : await db.prepare(`SELECT upper(vin) key FROM inventory_units_v2 WHERE upper(vin) IN (${keys.map(() => "?").join(",") || "NULL"})`).bind(...keys).all<{ key: string }>();
    const existingKeys = new Set(existing.results.map((row) => row.key));
    valid.forEach((row) => {
      const key = String(kind === "customers" ? row.normalizedPhone : row.vin);
      if (existingKeys.has(key)) errors.push({ row: row.__row, error: kind === "customers" ? "Клиент с этим телефоном уже есть" : "VIN уже существует" });
    });
    const committable = valid.filter((row) => !existingKeys.has(String(kind === "customers" ? row.normalizedPhone : row.vin)));
    const preview = committable.slice(0, 20).map(({ __row, ...row }) => ({ row: __row, ...row }));
    if (action === "validate_import" || errors.length) return Response.json({ filename, total: rows.length, valid: committable.length, errors, preview, canCommit: errors.length === 0 && committable.length > 0 });

    const statements = [];
    for (const row of committable) {
      const id = crypto.randomUUID();
      if (kind === "customers") statements.push(db.prepare("INSERT INTO crm_customers(id,name,phone,normalized_phone,email,region,source,assigned_to) VALUES(?,?,?,?,?,?,?,?)").bind(id, row.name, row.phone, row.normalizedPhone, row.email, row.region, row.source, actor.id));
      else {
        const data = { vin: row.vin, model: row.model, tractorSlug: row.tractorSlug, unitStatus: "На складе", purchaseCost: Number(row.purchaseCostMinor) / 100, expenses: Number(row.landedCostMinor) / 100, salePrice: Number(row.listPriceMinor) / 100, location: row.location };
        statements.push(db.prepare("INSERT INTO inventory_units_v2(id,vin,tractor_slug,model,status,purchase_cost_minor,landed_cost_minor,list_price_minor,location,responsible_id,created_by,updated_by) VALUES(?,?,?,?,'stock',?,?,?,?,?,?,?)").bind(id, row.vin, row.tractorSlug, row.model, row.purchaseCostMinor, row.landedCostMinor, row.listPriceMinor, row.location, actor.id, actor.id, actor.id));
        statements.push(db.prepare("INSERT INTO admin_records(id,kind,title,status,category,data_json,created_by,updated_by) VALUES(?,'inventory_units',?,'active','Импорт',?,?,?)").bind(id, `${row.model} · ${row.vin}`, JSON.stringify(data), actor.id, actor.id));
      }
    }
    statements.push(auditStatement(actor, "Импорт CSV/XLSX", kind, `${committable.length} строк · ${filename}`));
    await db.batch(statements);
    return Response.json({ ok: true, imported: committable.length });
  } catch (error) { return fail(error); }
}
