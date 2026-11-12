/**
 * Быстрые заявки: разбор текста из чат-бота, WhatsApp, Instagram или сайта в заявки.
 *
 * Без внешних сервисов и без ИИ: правила под формат «метка: значение» (как присылает чат-бот ATADAN)
 * и запасной разбор свободного текста (телефон, модель из каталога, имя в первой строке).
 * Модуль чистый: без базы и React, работает и в браузере (мгновенный предпросмотр), и на сервере, и в тестах.
 */

export type ParseModel = { slug: string; model: string };
export type ParsedLead = {
  name: string;
  /** Телефон как в тексте; на сервере нормализуется. */
  phone: string;
  modelSlug: string;
  /** Как модель написана в тексте (видно, если не нашлась в каталоге). */
  modelText: string;
  source: string;
  meetingText: string;
  /** Дата встречи по Бишкеку, YYYY-MM-DDTHH:MM, или пусто. */
  meetingAt: string;
  comment: string;
  raw: string;
};

type Field = "name" | "phone" | "age" | "purpose" | "model" | "notes" | "payment" | "meeting" | "kp" | "source" | "region";

const LABELS: [Field, RegExp][] = [
  ["name", /^(имя|аты|аты-жөнү|клиент|фио|name)$/],
  ["phone", /^(телефон|тел|номер|номер телефона|phone|whatsapp|ватсап|ватсап номер)$/],
  ["age", /^(возраст|жашы|жаш)$/],
  ["purpose", /^(для чего|цель|задача|для каких работ|площадь|эмне үчүн)$/],
  ["model", /^(интересует модель|интересует|модель|техника|трактор|model)$/],
  ["notes", /^(характер\/заметки|характер|заметки|примечание|примечания|комментарий|мүнөзү)$/],
  ["payment", /^(оплата|способ оплаты|төлөм|оплата и взнос)$/],
  ["meeting", /^(встреча|дата встречи|время встречи|жолугушуу)$/],
  ["kp", /^(кп|коммерческое предложение|ссылка на кп)$/],
  ["source", /^(источник|откуда|канал)$/],
  ["region", /^(регион|район|город|адрес|область|айыл)$/],
];

/** В каком порядке поля попадают в комментарий заявки. */
const COMMENT_ORDER: [Field, string][] = [
  ["purpose", "Задача"], ["payment", "Оплата"], ["meeting", "Встреча"], ["notes", "Заметки"],
  ["age", "Возраст"], ["region", "Регион"], ["kp", "КП"],
];

const HEADER = /^(новая встреча|новая заявка|новый клиент|новый лид|заявка|встреча)\b/i;
const stripLead = (s: string) => s.replace(/^[^\p{L}\p{N}+]+/u, "").trim();
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9А-ЯЁ]/g, "");

/** Телефоны в тексте: 9–15 цифр с пробелами, скобками и дефисами. */
export function findPhones(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\+?\d[\d\s\-()]{7,20}\d/g)) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length >= 9 && digits.length <= 15) out.push(m[0].trim());
  }
  return out;
}

/** Цифры телефона в виде 996XXXXXXXXX (как normalizePhone на сервере); пусто, если не похоже на номер. */
export function phoneDigits(value: string) {
  const d = value.replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("0")) return `996${d.slice(1)}`;
  if (d.length === 9) return `996${d}`;
  return d.length >= 9 && d.length <= 15 ? d : "";
}

/** Модель из каталога по тексту: CFH1804-M, cfh 1804 m, «1804-M». Берём самое длинное совпадение. */
export function matchModel(text: string, models: ParseModel[]): ParseModel | null {
  const hay = norm(text);
  if (!hay) return null;
  let best: ParseModel | null = null;
  for (const m of models) {
    const key = norm(m.model);
    if (key.length < 3) continue;
    // полное имя модели или её цифровое ядро с буквами после него (1804M из CFH1804-M)
    const core = key.replace(/^[A-ZА-Я]+/, "");
    const hit = hay.includes(key) || (core.length >= 4 && /\d/.test(core) && hay.includes(core));
    if (hit && (!best || norm(best.model).length < key.length)) best = m;
  }
  return best;
}

export function detectSource(text: string, fallback: string) {
  const t = text.toLowerCase();
  if (/чат-?бот|chat-?bot|\bбот\b/.test(t)) return "chatbot";
  if (/whats\s?app|ватсап|вотсап/.test(t)) return "whatsapp";
  if (/instagram|инстаграм|директ/.test(t)) return "instagram";
  if (/lalafo|лалафо/.test(t)) return "lalafo";
  if (/(^|\s)сайт|website/.test(t)) return "website";
  return fallback;
}

const MONTHS: [RegExp, number][] = [
  [/^янв/, 1], [/^фев/, 2], [/^мар/, 3], [/^апр/, 4], [/^ма[йя]/, 5], [/^июн/, 6],
  [/^июл/, 7], [/^авг/, 8], [/^сен/, 9], [/^окт/, 10], [/^ноя/, 11], [/^дек/, 12],
];
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Дата встречи из фраз вроде «28инде в 15:00», «28 ноября в 15:00», «28.11 15:00», «завтра в 10:00», «эртең саат 11де».
 * now - текущее время по Бишкеку (для тестов передаётся явно). Число без месяца: этот месяц или следующий, если день прошёл.
 */
export function parseMeeting(text: string, now: Date): string {
  const t = text.toLowerCase();
  if (!t.trim()) return "";
  const y0 = now.getUTCFullYear(), m0 = now.getUTCMonth() + 1, d0 = now.getUTCDate();
  let y = y0, mo = 0, d = 0;
  const time = t.match(/(\d{1,2}):(\d{2})/) ?? t.match(/(?:^|\s)(?:в|саат|at)\s*(\d{1,2})(?:[.](\d{2}))?(?!\d)/);
  let hh = time ? Number(time[1]) : 10, mm = time && time[2] && /^\d{2}$/.test(time[2]) ? Number(time[2]) : 0;
  const rest = time ? t.replace(time[0], " ") : t;
  if (/(сегодня|бүгүн)/.test(t)) { mo = m0; d = d0; }
  else if (/(послезавтра|бүрсүгүнү)/.test(t)) { const x = new Date(Date.UTC(y0, m0 - 1, d0 + 2)); y = x.getUTCFullYear(); mo = x.getUTCMonth() + 1; d = x.getUTCDate(); }
  else if (/(завтра|эртең)/.test(t)) { const x = new Date(Date.UTC(y0, m0 - 1, d0 + 1)); y = x.getUTCFullYear(); mo = x.getUTCMonth() + 1; d = x.getUTCDate(); }
  else {
    const named = rest.match(/(\d{1,2})\s*(?:-?го\s*)?([а-яё]{3,})/);
    const month = named ? MONTHS.find(([re]) => re.test(named[2])) : undefined;
    const numeric = rest.match(/(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/);
    if (named && month) { d = Number(named[1]); mo = month[1]; }
    else if (numeric) { d = Number(numeric[1]); mo = Number(numeric[2]); if (numeric[3]) y = Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]); }
    else {
      const day = rest.match(/(?:^|\D)(\d{1,2})(?=\s*(?:-?го|-?е|инде|нде|нчи|чи|числа|\s|$))/);
      if (day) { d = Number(day[1]); mo = d >= d0 ? m0 : m0 + 1; }
    }
    if (mo > 12) { mo -= 12; y += 1; }
    // дата из прошлого без года: значит, следующий год
    if (mo && d && !numeric?.[3] && (mo < m0 || (mo === m0 && d < d0))) y += 1;
  }
  if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return "";
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCMonth() !== mo - 1) return "";
  if (!(hh >= 0 && hh <= 23)) hh = 10;
  if (!(mm >= 0 && mm <= 59)) mm = 0;
  return `${y}-${pad(mo)}-${pad(d)}T${pad(hh)}:${pad(mm)}`;
}

type Block = { fields: Partial<Record<Field, string>>; extra: string[]; free: string[]; lines: string[] };
const emptyBlock = (): Block => ({ fields: {}, extra: [], free: [], lines: [] });

function splitBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let cur = emptyBlock();
  const push = () => { if (cur.lines.some((l) => l.trim())) blocks.push(cur); cur = emptyBlock(); };
  for (const rawLine of text.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();
    const bare = stripLead(line);
    const isHeader = line.startsWith("📌") || HEADER.test(bare);
    const kv = bare.match(/^([^:：]{1,40})[:：]\s*(.*)$/);
    const label = kv ? kv[1].toLowerCase().replace(/\s+/g, " ").trim() : "";
    const field = kv ? LABELS.find(([, re]) => re.test(label))?.[0] : undefined;
    // новый клиент: заголовок «Новая встреча» или второе «Имя» в том же куске
    if ((isHeader && Object.keys(cur.fields).length) || (field === "name" && cur.fields.name)) push();
    if (!line) {
      // пустая строка разделяет свободные сообщения (WhatsApp), но не анкету с метками
      if (!Object.keys(cur.fields).length && cur.free.length && findPhones(cur.free.join(" ")).length) push();
      continue;
    }
    cur.lines.push(rawLine);
    if (isHeader && !kv) continue;
    if (field) {
      const value = kv![2].trim();
      if (value) cur.fields[field] = cur.fields[field] ? `${cur.fields[field]}; ${value}` : value;
    } else if (kv && kv[2].trim() && !/^https?$/i.test(kv[1].trim())) cur.extra.push(`${kv[1].trim()}: ${kv[2].trim()}`);
    else cur.free.push(bare || line);
  }
  push();
  return blocks;
}

/** Разобрать вставленный текст в одну или несколько заявок. */
export function parseLeads(text: string, models: ParseModel[], opts: { now?: Date; source?: string } = {}): ParsedLead[] {
  const now = opts.now ?? new Date(Date.now() + 6 * 3600_000);
  const fallback = opts.source ?? "chatbot";
  return splitBlocks(text).map((b) => {
    const raw = b.lines.join("\n").trim();
    const phone = findPhones(b.fields.phone ?? "")[0] ?? b.fields.phone ?? findPhones(raw)[0] ?? "";
    let name = b.fields.name ?? "";
    if (!name) {
      // свободный текст: имя в первой строке без цифр, до трёх слов
      const first = b.free.find((l) => l.trim());
      if (first && !/\d/.test(first) && first.split(/\s+/).length <= 3 && first.length <= 40) name = first.replace(/[,.!]+$/, "");
      else if (first) {
        // «Нурбек 0772 445566 нужен трактор»: имя перед номером
        const p = findPhones(first)[0];
        const before = p ? first.slice(0, first.indexOf(p)).replace(/[,.:;!-]+\s*$/, "").trim() : "";
        if (before && !/\d/.test(before) && before.split(/\s+/).length <= 3 && /^\p{Lu}/u.test(before)) name = before;
      }
    }
    const modelSource = b.fields.model ?? "";
    const model = matchModel(modelSource, models) ?? matchModel(raw, models);
    const freeRest = b.free.filter((l) => l.replace(/[,.!]+$/, "") !== name && !findPhones(l).some((p) => l.trim() === p));
    const parts = COMMENT_ORDER.filter(([f]) => b.fields[f]).map(([f, label]) => `${label}: ${b.fields[f]}`);
    if (b.fields.model && !model) parts.unshift(`Модель: ${b.fields.model}`);
    const comment = [...parts, ...b.extra, ...(freeRest.length && !Object.keys(b.fields).length ? [freeRest.join(" ")] : freeRest)].join("\n").slice(0, 1000);
    const meetingText = b.fields.meeting ?? "";
    return {
      name: name.slice(0, 160),
      phone,
      modelSlug: model?.slug ?? "",
      modelText: modelSource || model?.model || "",
      // анкета чат-бота начинается с 📌; ссылки на сайт в КП не делают заявку «с сайта»
      source: b.fields.source ? detectSource(b.fields.source, fallback) : b.lines.some((l) => l.trim().startsWith("📌")) ? "chatbot" : detectSource(raw, fallback),
      meetingText,
      meetingAt: meetingText ? parseMeeting(meetingText, now) : "",
      comment,
      raw: raw.slice(0, 4000),
    };
  }).filter((l) => l.name || l.phone);
}
