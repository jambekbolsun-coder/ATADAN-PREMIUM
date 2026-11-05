/**
 * Деньги: кассы и счета, движения, расходы, переводы, долги и маржа
 * (docs/admin-redesign/03-architecture.md §5.3, §12).
 *
 * Правила:
 *  - остаток кассы = начальный остаток + все проводки (приход − расход); сторно - обратная проводка,
 *    исходная остаётся видна, поэтому сумма «приход + сторно» = 0 (ошибка №8 из 04-bugs.md исправлена);
 *  - касса не уходит в минус без подтверждения владельца;
 *  - платежи продаж, оплаты заводу и расходы поставок сторнируются в своих разделах, здесь - только ручные;
 *  - перевод между кассами - две связанные проводки; при разных валютах нужен курс.
 */
import type { PoolClient } from "pg";
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { HttpError } from "../../lib/security";

export const EXPENSE_CATEGORIES = ["Аренда", "Зарплата", "Реклама", "Логистика", "Таможня", "Сервис и ремонт", "Запчасти", "Налоги", "Связь и интернет", "Транспорт и топливо", "Офис", "Банковские комиссии", "Прочее"];
export const INCOME_CATEGORIES = ["Прочий приход", "Возврат от поставщика", "Внесение владельца", "Кредит / займ"];
/** Проводки, которые создаются из других разделов и там же сторнируются. */
const SYSTEM_CATEGORIES = new Set(["Оплата продажи", "Сторно оплаты", "Возврат клиенту", "Оплата заводу", "Сторно оплаты заводу", "Оплата клиента", "Сторно расхода поставки"]);

export const canMoney = (a: Pick<Actor, "role">) => a.role === "owner" || a.role === "director" || a.role === "accountant";
function assertMoney(a: Actor) {
  if (!canMoney(a)) throw new HttpError(403, "Кассу ведут бухгалтер, директор и владелец");
}

type Q = <T = Record<string, unknown>>(sql: string, ...args: unknown[]) => Promise<T[]>;
const query = (client: PoolClient): Q => async <T,>(sql: string, ...args: unknown[]) => (await getRawDb().prepare(sql).bind(...args).execute<T>(client)).results;
const id = () => crypto.randomUUID();
const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const toMinor = (v: unknown, label: string) => {
  const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n > 1_000_000_000) throw new HttpError(400, `${label}: проверьте сумму`);
  return Math.round(n * 100);
};
const dateOnly = (v: unknown, label: string) => {
  const s = String(v ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new HttpError(400, `${label}: укажите дату`);
  return s;
};

export type Account = { id: string; name: string; account_type: "cash" | "bank" | "clearing"; currency: string; balance: number; active: number };

export async function listAccounts(includeClearing = false) {
  const { results } = await getRawDb().prepare(`SELECT a.id, a.name, a.account_type, a.currency, a.active,
      (a.opening_balance_minor + COALESCE(SUM(CASE WHEN t.direction='in' THEN t.amount_minor ELSE -t.amount_minor END),0))::bigint AS balance
    FROM financial_accounts a LEFT JOIN account_transactions t ON t.account_id=a.id
    WHERE a.active=1 ${includeClearing ? "" : "AND a.account_type IN ('cash','bank')"} GROUP BY a.id ORDER BY a.account_type, a.name`).all<Account>();
  return results.map((a) => ({ ...a, balance: Number(a.balance) }));
}

export type Tx = { id: string; account_id: string; account: string; currency: string; direction: "in" | "out"; amount_minor: number; category: string; occurred_at: string; description: string; counterparty: string; link_type: string | null; link_id: string | null; transfer_id: string | null; reversed_by: string | null; author: string | null; system: boolean };

export async function listTransactions(f: { accountId?: string; direction?: string; category?: string; from?: string; to?: string; q?: string; expensesOnly?: boolean; page: number }) {
  const where: string[] = ["1=1"];
  const args: unknown[] = [];
  if (f.accountId) { where.push("t.account_id=?"); args.push(f.accountId); }
  if (f.direction === "in" || f.direction === "out") { where.push("t.direction=?"); args.push(f.direction); }
  if (f.category) { where.push("t.category=?"); args.push(f.category); }
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) { where.push("t.occurred_at >= ?::date"); args.push(f.from); }
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) { where.push("t.occurred_at < ?::date + 1"); args.push(f.to); }
  if (f.q) { where.push("(lower(t.description) LIKE ? OR lower(t.counterparty) LIKE ?)"); const like = `%${f.q.toLowerCase().replace(/[%_\\]/g, "")}%`; args.push(like, like); }
  if (f.expensesOnly) {
    where.push(`t.direction='out' AND t.transfer_id IS NULL AND t.reversed_by IS NULL AND (t.link_type IS NULL OR t.link_type='payroll') AND t.category <> 'Сторно' AND t.category NOT IN (${[...SYSTEM_CATEGORIES].map(() => "?").join(",")})`);
    args.push(...SYSTEM_CATEGORIES);
  }
  const size = 50;
  const db = getRawDb();
  const [rows, totals] = await Promise.all([
    db.prepare(`SELECT t.id, t.account_id, a.name AS account, a.currency, t.direction, t.amount_minor, t.category, t.occurred_at, t.description, t.counterparty, t.link_type, t.link_id, t.transfer_id, t.reversed_by, s.display_name AS author
      FROM account_transactions t JOIN financial_accounts a ON a.id=t.account_id LEFT JOIN staff s ON s.id=t.created_by
      WHERE ${where.join(" AND ")} ORDER BY t.occurred_at DESC, t.created_at DESC LIMIT ${size + 1} OFFSET ${(f.page - 1) * size}`).bind(...args).all<Tx>(),
    db.prepare(`SELECT a.currency, t.direction, COALESCE(SUM(t.amount_minor),0)::bigint AS total FROM account_transactions t JOIN financial_accounts a ON a.id=t.account_id WHERE ${where.join(" AND ")} GROUP BY a.currency, t.direction`).bind(...args).all<{ currency: string; direction: string; total: number }>(),
  ]);
  const list = rows.results.map((t) => ({ ...t, amount_minor: Number(t.amount_minor), system: SYSTEM_CATEGORIES.has(t.category) || !!t.link_type }));
  return { rows: list.slice(0, size), hasMore: list.length > size, totals: totals.results.map((t) => ({ ...t, total: Number(t.total) })) };
}

export async function expensesByCategory(from: string, to: string) {
  const { results } = await getRawDb().prepare(`SELECT t.category, a.currency, COALESCE(SUM(t.amount_minor),0)::bigint AS total, COUNT(*)::int AS n
    FROM account_transactions t JOIN financial_accounts a ON a.id=t.account_id
    WHERE t.direction='out' AND t.transfer_id IS NULL AND t.reversed_by IS NULL AND (t.link_type IS NULL OR t.link_type='payroll') AND t.category <> 'Сторно' AND t.occurred_at >= ?::date AND t.occurred_at < ?::date + 1
      AND t.category NOT IN (${[...SYSTEM_CATEGORIES].map(() => "?").join(",")})
    GROUP BY t.category, a.currency ORDER BY total DESC`).bind(from, to, ...SYSTEM_CATEGORIES).all<{ category: string; currency: string; total: number; n: number }>();
  return results.map((r) => ({ ...r, total: Number(r.total) }));
}

async function balanceOf(q: Q, accountId: string) {
  const [r] = await q<{ b: number }>("SELECT (a.opening_balance_minor + COALESCE((SELECT SUM(CASE WHEN direction='in' THEN amount_minor ELSE -amount_minor END) FROM account_transactions WHERE account_id=a.id),0))::bigint AS b FROM financial_accounts a WHERE a.id=?", accountId);
  return Number(r?.b ?? 0);
}

async function lockAccount(q: Q, accountId: string) {
  const [a] = await q<{ id: string; name: string; currency: string; account_type: string }>("SELECT id, name, currency, account_type FROM financial_accounts WHERE id=? AND active=1 FOR UPDATE", text(accountId, 100));
  if (!a || a.account_type === "clearing") throw new HttpError(400, "Выберите кассу или счёт");
  return a;
}

async function audit(q: Q, actor: Actor, action: string, entity: string, detail: string) {
  await q("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)", id(), actor.id, action, entity, detail.slice(0, 2000));
}

export async function addMovement(actor: Actor, input: { direction: "in" | "out"; accountId: string; amount: string; category: string; date: string; description?: string; counterparty?: string; allowNegative?: boolean }) {
  assertMoney(actor);
  const direction = input.direction === "in" ? "in" : "out";
  const list = direction === "in" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (!list.includes(input.category)) throw new HttpError(400, "Выберите категорию");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const acc = await lockAccount(q, input.accountId);
    const amount = toMinor(input.amount, "Сумма");
    if (direction === "out") {
      const balance = await balanceOf(q, acc.id);
      if (balance - amount < 0 && !(input.allowNegative && actor.role === "owner")) throw new HttpError(409, `В «${acc.name}» не хватает денег: остаток ${(balance / 100).toLocaleString("ru-RU")} ${acc.currency}. Уйти в минус может только владелец с подтверждением`);
    }
    const txId = id();
    await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,occurred_at,description,counterparty,created_by) VALUES(?,?,?,?,?,?,?,?,?)", txId, acc.id, direction, amount, input.category, dateOnly(input.date, "Дата"), text(input.description, 500), text(input.counterparty, 160), actor.id);
    await audit(q, actor, direction === "in" ? "cash.income" : "cash.expense", txId, `${input.category}: ${amount / 100} ${acc.currency} · ${acc.name}`);
    return txId;
  });
}

export async function transfer(actor: Actor, input: { fromId: string; toId: string; amount: string; received?: string; date: string; note?: string }) {
  assertMoney(actor);
  if (input.fromId === input.toId) throw new HttpError(400, "Выберите разные кассы");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const from = await lockAccount(q, input.fromId);
    const to = await lockAccount(q, input.toId);
    const amount = toMinor(input.amount, "Сумма перевода");
    let received = amount;
    if (from.currency !== to.currency) {
      if (!String(input.received ?? "").trim()) throw new HttpError(400, `Разные валюты: укажите, сколько ${to.currency} пришло на «${to.name}»`);
      received = toMinor(input.received, "Сумма зачисления");
    }
    const balance = await balanceOf(q, from.id);
    if (balance - amount < 0) throw new HttpError(409, `В «${from.name}» не хватает денег: остаток ${(balance / 100).toLocaleString("ru-RU")} ${from.currency}`);
    const tid = id(), date = dateOnly(input.date, "Дата");
    const note = text(input.note, 300);
    await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,occurred_at,description,transfer_id,created_by) VALUES(?,?, 'out', ?, 'Перевод между счетами', ?, ?, ?, ?)", id(), from.id, amount, date, `→ ${to.name}${note ? ` · ${note}` : ""}`, tid, actor.id);
    await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,occurred_at,description,transfer_id,created_by) VALUES(?,?, 'in', ?, 'Перевод между счетами', ?, ?, ?, ?)", id(), to.id, received, date, `← ${from.name}${note ? ` · ${note}` : ""}`, tid, actor.id);
    const rate = from.currency !== to.currency ? ` (курс ${(from.currency === "KGS" ? amount / received : received / amount).toFixed(4)})` : "";
    await audit(q, actor, "cash.transfer", tid, `${amount / 100} ${from.currency} ${from.name} → ${received / 100} ${to.currency} ${to.name}${rate}`);
  });
}

/** Сторно ручной проводки или перевода. Системные проводки сторнируются в своих разделах. */
export async function reverseMovement(actor: Actor, txId: string, reason: string) {
  assertMoney(actor);
  const why = text(reason, 300);
  if (why.length < 5) throw new HttpError(400, "Укажите причину сторно (не короче 5 символов)");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [t] = await q<{ id: string; account_id: string; direction: string; amount_minor: number; category: string; reversed_by: string | null; transfer_id: string | null; link_type: string | null }>("SELECT id, account_id, direction, amount_minor, category, reversed_by, transfer_id, link_type FROM account_transactions WHERE id=? FOR UPDATE", txId);
    if (!t) throw new HttpError(404, "Проводка не найдена");
    if (t.reversed_by) throw new HttpError(409, "Проводка уже сторнирована");
    if (t.category.startsWith("Сторно")) throw new HttpError(409, "Сторно нельзя сторнировать: проведите новую запись");
    if (SYSTEM_CATEGORIES.has(t.category) || t.link_type) throw new HttpError(409, "Эта проводка создана из продажи, заказа заводу или поставки: сторно делайте там");
    const group = t.transfer_id ? await q<typeof t>("SELECT id, account_id, direction, amount_minor, category, reversed_by, transfer_id, link_type FROM account_transactions WHERE transfer_id=? AND reversed_by IS NULL FOR UPDATE", t.transfer_id) : [t];
    for (const row of group) {
      const rid = id();
      await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,occurred_at,description,created_by) VALUES(?,?,?,?, 'Сторно', CURRENT_TIMESTAMP, ?, ?)", rid, row.account_id, row.direction === "in" ? "out" : "in", row.amount_minor, `Сторно «${row.category}»: ${why}`, actor.id);
      await q("UPDATE account_transactions SET reversed_by=? WHERE id=?", rid, row.id);
    }
    await audit(q, actor, "cash.reverse", t.id, why);
  });
}

export async function createAccount(actor: Actor, input: { name: string; type: string; currency: string; opening?: string }) {
  if (actor.role !== "owner" && actor.role !== "director" && actor.role !== "accountant") throw new HttpError(403, "Нет прав");
  const name = text(input.name, 80);
  if (name.length < 2) throw new HttpError(400, "Укажите название кассы или счёта");
  if (!["cash", "bank"].includes(input.type)) throw new HttpError(400, "Выберите тип: касса или банковский счёт");
  if (!["KGS", "USD", "CNY"].includes(input.currency)) throw new HttpError(400, "Выберите валюту");
  const opening = input.opening ? Math.round(Number(String(input.opening).replace(/\s/g, "").replace(",", ".")) * 100) : 0;
  if (!Number.isFinite(opening) || Math.abs(opening) > 100_000_000_000) throw new HttpError(400, "Начальный остаток: проверьте сумму");
  const aid = id();
  await getRawDb().prepare("INSERT INTO financial_accounts(id,name,account_type,currency,opening_balance_minor,active) VALUES(?,?,?,?,?,1)").bind(aid, name, input.type, input.currency, opening).run();
  await getRawDb().prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)").bind(id(), actor.id, "cash.account", aid, `${name} · ${input.currency}`).run();
  return aid;
}

// ───────────────────────── долги ─────────────────────────
export type PenaltyPolicy = { ratePerDay: number; graceDays: number; maxPercent: number };
export async function penaltyPolicy(): Promise<PenaltyPolicy> {
  const row = await getRawDb().prepare("SELECT value FROM site_settings WHERE key='sales_policy'").first<{ value: string }>();
  try {
    const v = row ? (JSON.parse(row.value) as { penalty?: Partial<PenaltyPolicy> }).penalty ?? {} : {};
    return { ratePerDay: Number(v.ratePerDay ?? 0.1), graceDays: Number(v.graceDays ?? 5), maxPercent: Number(v.maxPercent ?? 10) };
  } catch {
    return { ratePerDay: 0.1, graceDays: 5, maxPercent: 10 };
  }
}

export type DebtRow = { id: string; number: string; customer_id: string; customer: string; phone: string; currency: "USD" | "KGS"; fx_rate: number; status: string; payment_method: string; bank_name: string; manager: string | null; total_minor: number; paid_minor: number; left_minor: number; due_minor: number; overdue_minor: number; oldest_due: string | null; days_overdue: number; next_due: string | null; bank_part: number; has_schedule: boolean };

export async function listDebts(actor: Actor) {
  const own = canMoney(actor) ? "" : "AND o.manager_id=?";
  const { results } = await getRawDb().prepare(`
    WITH base AS (
      SELECT o.id, o.number, o.customer_id, c.name AS customer, c.phone, o.currency, o.fx_rate::float AS fx_rate, o.status, o.payment_method, o.bank_name, s.display_name AS manager, o.total_minor,
        COALESCE((SELECT SUM(CASE WHEN p.direction='in' THEN p.amount_sale_minor ELSE -p.amount_sale_minor END) FROM sale_payments p WHERE p.sale_id=o.id AND p.status='posted'),0) AS paid_minor,
        -- нет графика (старые продажи): долг по выданной машине считается наступившим в день выдачи
        CASE WHEN NOT EXISTS (SELECT 1 FROM sale_schedule x WHERE x.sale_id=o.id)
          THEN CASE WHEN o.status='delivered' AND o.delivered_at::date < CURRENT_DATE THEN o.total_minor ELSE 0 END
          ELSE COALESCE((SELECT SUM(x.amount_minor) FROM sale_schedule x WHERE x.sale_id=o.id AND x.due_date < CURRENT_DATE),0) END AS due_minor,
        EXISTS (SELECT 1 FROM sale_schedule x WHERE x.sale_id=o.id) AS has_schedule, o.delivered_at::date::text AS delivered_on,
        COALESCE((SELECT SUM(x.amount_minor) FROM sale_schedule x WHERE x.sale_id=o.id AND x.payer='bank'),0) AS bank_part,
        (SELECT MIN(x.due_date) FROM sale_schedule x WHERE x.sale_id=o.id AND x.due_date >= CURRENT_DATE)::text AS next_due
      FROM sale_orders o JOIN crm_customers c ON c.id=o.customer_id LEFT JOIN staff s ON s.id=o.manager_id
      WHERE o.status IN ('booked','delivered') ${own}
    )
    SELECT b.*, GREATEST(b.total_minor - b.paid_minor,0) AS left_minor,
      LEAST(GREATEST(b.total_minor - b.paid_minor,0), GREATEST(b.due_minor - b.paid_minor,0)) AS overdue_minor,
      COALESCE((SELECT MIN(x.due_date) FROM sale_schedule x WHERE x.sale_id=b.id AND x.due_date < CURRENT_DATE
         AND (SELECT COALESCE(SUM(y.amount_minor),0) FROM sale_schedule y WHERE y.sale_id=b.id AND y.due_date <= x.due_date) > b.paid_minor)::text,
        CASE WHEN NOT b.has_schedule AND b.due_minor > 0 THEN b.delivered_on END) AS oldest_due
    FROM base b WHERE b.total_minor - b.paid_minor > 0 ORDER BY overdue_minor DESC, b.number`).bind(...(own ? [actor.id] : [])).all<DebtRow>();
  const today = new Date(new Date().toISOString().slice(0, 10)).getTime();
  return results.map((r) => {
    const days = r.oldest_due ? Math.max(0, Math.round((today - new Date(r.oldest_due).getTime()) / 86400000)) : 0;
    return { ...r, total_minor: Number(r.total_minor), paid_minor: Number(r.paid_minor), left_minor: Number(r.left_minor), due_minor: Number(r.due_minor), overdue_minor: Number(r.overdue_minor), bank_part: Number(r.bank_part), fx_rate: Number(r.fx_rate), has_schedule: Boolean(r.has_schedule), days_overdue: Number(r.overdue_minor) > 0 ? days : 0 };
  });
}

export function penaltyFor(d: Pick<DebtRow, "overdue_minor" | "days_overdue">, p: PenaltyPolicy) {
  const days = Math.max(0, d.days_overdue - p.graceDays);
  if (!days || !d.overdue_minor || !p.ratePerDay) return 0;
  return Math.min(Math.round((d.overdue_minor * p.ratePerDay * days) / 100), Math.round((d.overdue_minor * p.maxPercent) / 100));
}

export function bucketOf(days: number) {
  if (days <= 0) return "current";
  if (days <= 30) return "d30";
  if (days <= 60) return "d60";
  if (days <= 90) return "d90";
  return "d90p";
}
export const BUCKETS = [
  { key: "current", label: "Не просрочено", color: "brand" },
  { key: "d30", label: "1–30 дней", color: "sun" },
  { key: "d60", label: "31–60 дней", color: "terra" },
  { key: "d90", label: "61–90 дней", color: "lilac" },
  { key: "d90p", label: "Больше 90 дней", color: "bad" },
] as const;

// ───────────────────────── маржа ─────────────────────────
export type MarginSale = { id: string; number: string; sold_at: string; customer: string; manager: string | null; status: string; revenue_kgs: number; cost_kgs: number; items: string; preliminary: boolean };

export async function marginReport(from: string, to: string) {
  const db = getRawDb();
  const kgs = "CASE WHEN o.currency='USD' THEN o.fx_rate ELSE 1 END";
  const [sales, models, managers] = await Promise.all([
    db.prepare(`SELECT o.id, o.number, o.sold_at, c.name AS customer, s.display_name AS manager, o.status, (o.total_minor*${kgs})::bigint AS revenue_kgs, o.cost_kgs_minor AS cost_kgs,
        COALESCE((SELECT string_agg(i.title, ', ') FROM sale_order_items i WHERE i.sale_id=o.id AND i.active=1),'') AS items,
        (o.status='booked' OR EXISTS (SELECT 1 FROM sale_order_items i WHERE i.sale_id=o.id AND i.active=1 AND i.kind IN ('model_order','unit') AND i.cost_kgs_minor=0)) AS preliminary
      FROM sale_orders o JOIN crm_customers c ON c.id=o.customer_id LEFT JOIN staff s ON s.id=o.manager_id
      WHERE o.status<>'cancelled' AND o.sold_at >= ?::date AND o.sold_at < ?::date + 1 ORDER BY o.sold_at DESC`).bind(from, to).all<MarginSale>(),
    db.prepare(`SELECT COALESCE(i.tractor_slug, i.kind) AS key, MIN(CASE WHEN i.kind IN ('unit','model_order') THEN split_part(i.title,' · ',1) ELSE CASE i.kind WHEN 'part' THEN 'Запчасти' ELSE 'Услуги' END END) AS label,
        SUM(i.qty)::int AS qty, SUM(i.price_minor*i.qty*${kgs})::bigint AS revenue_kgs, SUM(i.cost_kgs_minor*i.qty)::bigint AS cost_kgs
      FROM sale_order_items i JOIN sale_orders o ON o.id=i.sale_id
      WHERE i.active=1 AND o.status<>'cancelled' AND o.sold_at >= ?::date AND o.sold_at < ?::date + 1 GROUP BY 1 ORDER BY revenue_kgs DESC`).bind(from, to).all<{ key: string; label: string; qty: number; revenue_kgs: number; cost_kgs: number }>(),
    db.prepare(`SELECT COALESCE(s.display_name,'Не указан') AS manager, COUNT(*)::int AS n, SUM(o.total_minor*${kgs})::bigint AS revenue_kgs, SUM(o.cost_kgs_minor)::bigint AS cost_kgs
      FROM sale_orders o LEFT JOIN staff s ON s.id=o.manager_id WHERE o.status<>'cancelled' AND o.sold_at >= ?::date AND o.sold_at < ?::date + 1 GROUP BY 1 ORDER BY revenue_kgs DESC`).bind(from, to).all<{ manager: string; n: number; revenue_kgs: number; cost_kgs: number }>(),
  ]);
  const num = <T extends { revenue_kgs: number; cost_kgs: number }>(r: T) => ({ ...r, revenue_kgs: Number(r.revenue_kgs), cost_kgs: Number(r.cost_kgs) });
  return { sales: sales.results.map((s) => ({ ...num(s), preliminary: Boolean(s.preliminary) })), models: models.results.map(num), managers: managers.results.map(num) };
}
