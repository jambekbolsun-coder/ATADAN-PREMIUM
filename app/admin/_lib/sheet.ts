/** Таблицы: CSV для Excel (с защитой от формул) и чтение CSV/XLSX при импорте. */
import { HttpError } from "../../lib/security";

function cell(value: unknown) {
  let t = value == null ? "" : value instanceof Date ? value.toISOString() : String(value);
  // текст, начинающийся с = + - @, Excel открывает как формулу
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(t) && !/^-?\d+([.,]\d+)?$/.test(t)) t = `'${t}`;
  return /[";\r\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
}

/** CSV с точкой с запятой: так русский Excel сразу раскладывает по колонкам. */
export function toCsv(columns: [string, string][], rows: Record<string, unknown>[]) {
  const head = columns.map(([, label]) => cell(label)).join(";");
  const body = rows.map((r) => columns.map(([k]) => cell(r[k])).join(";")).join("\r\n");
  return `\uFEFF${head}\r\n${body}`;
}

export function parseCsv(source: string) {
  const rows: string[][] = [];
  let row: string[] = [], c = "", quoted = false;
  const first = source.split(/\r?\n/, 1)[0] ?? "";
  const delim = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { c += '"'; i++; }
      else if (ch === '"') quoted = false;
      else c += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(c); c = ""; }
    else if (ch === "\n") { row.push(c.replace(/\r$/, "")); rows.push(row); row = []; c = ""; }
    else c += ch;
  }
  row.push(c.replace(/\r$/, ""));
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export async function readTable(file: File) {
  if (!file.size) throw new HttpError(400, "Файл пустой");
  if (file.size > 5_000_000) throw new HttpError(413, "Файл должен быть меньше 5 МБ");
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv" || file.type === "text/csv") return parseCsv((await file.text()).replace(/^\uFEFF/, ""));
  if (ext === "xlsx") {
    const { readSheet } = await import("read-excel-file/node");
    return (await readSheet(Buffer.from(await file.arrayBuffer()))).map((r) => r.map((v) => (v == null ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v))));
  }
  throw new HttpError(415, "Загрузите CSV или XLSX");
}

/** Строки таблицы → объекты по колонкам; заголовки узнаются по-русски и по-английски. */
export function rowsOf(table: string[][], aliases: Record<string, string>, max = 5000) {
  const [head, ...body] = table;
  if (!head?.length) throw new HttpError(400, "В файле нет заголовков колонок");
  const keys = head.map((h) => {
    const n = String(h).trim().toLowerCase().replace(/\s+/g, " ").replace(/[*:]/g, "");
    return aliases[n] ?? n;
  });
  const rows = body.map((v, i) => ({ v, row: i + 2 })).filter(({ v }) => v.some((x) => String(x).trim()));
  if (rows.length > max) throw new HttpError(413, `За один раз не больше ${max} строк`);
  return { keys, rows: rows.map(({ v, row }) => ({ row, data: Object.fromEntries(keys.map((k, i) => [k, String(v[i] ?? "").trim()])) })) };
}
