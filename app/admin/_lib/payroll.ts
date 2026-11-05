/**
 * Зарплаты: начисления (оклад, премия), удержания и выплаты по месяцам.
 * Выплата = расход из кассы с категорией «Зарплата» (видна в Кассе и в Расходах), сторно выплаты
 * возвращает деньги в кассу. Остаток к выплате = начислено + премии - удержания - выплачено.
 * Подсказка для премии менеджера: продажи и маржа за месяц.
 */
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { canUseSection } from "../../lib/admin-auth";
import { HttpError } from "../../lib/security";
import { audit, isBoss, newId, query, text, toMinor } from "./db-kit";

export const PAY_KIND: Record<string, { label: string; sign: 1 | -1 }> = {
  salary: { label: "Оклад", sign: 1 },
  bonus: { label: "Премия", sign: 1 },
  deduction: { label: "Удержание", sign: -1 },
  payout: { label: "Выплата", sign: -1 },
};
export const canPayroll = (a: Actor) => isBoss(a) || a.role === "accountant" || canUseSection(a, "payroll");
export const periodOf = (v: unknown) => (typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : new Date().toISOString().slice(0, 7));

export async function payrollMonth(period: string) {
  const db = getRawDb();
  const [staff, entries, sales] = await Promise.all([
    db.prepare("SELECT id, display_name, role, position, active FROM staff WHERE active>=0 ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'director' THEN 1 ELSE 2 END, display_name").all<{ id: string; display_name: string; role: string; position: string; active: number }>(),
    db.prepare(`SELECT e.id, e.staff_id, e.kind, e.amount_minor, e.note, e.status, e.void_reason, e.created_at, e.tx_id, a.name AS account, s.display_name AS author
      FROM payroll_entries e LEFT JOIN account_transactions t ON t.id=e.tx_id LEFT JOIN financial_accounts a ON a.id=t.account_id LEFT JOIN staff s ON s.id=e.created_by
      WHERE e.period=? ORDER BY e.created_at`).bind(period).all<{ id: string; staff_id: string; kind: string; amount_minor: number; note: string; status: string; void_reason: string; created_at: string; tx_id: string | null; account: string | null; author: string | null }>(),
    db.prepare(`SELECT o.manager_id, COUNT(*)::int AS n, SUM(o.total_minor * CASE WHEN o.currency='USD' THEN o.fx_rate ELSE 1 END)::bigint AS revenue, SUM(o.total_minor * CASE WHEN o.currency='USD' THEN o.fx_rate ELSE 1 END - o.cost_kgs_minor)::bigint AS margin
      FROM sale_orders o WHERE o.status<>'cancelled' AND to_char(o.sold_at,'YYYY-MM')=? GROUP BY o.manager_id`).bind(period).all<{ manager_id: string; n: number; revenue: number; margin: number }>(),
  ]);
  const list = entries.results.map((e) => ({ ...e, amount_minor: Number(e.amount_minor) }));
  const rows = staff.results.map((s) => {
    const mine = list.filter((e) => e.staff_id === s.id);
    const sum = (k: string) => mine.filter((e) => e.kind === k && e.status === "posted").reduce((a, e) => a + e.amount_minor, 0);
    const accrued = sum("salary") + sum("bonus") - sum("deduction");
    const paid = sum("payout");
    const sale = sales.results.find((x) => x.manager_id === s.id);
    return { ...s, entries: mine, salary: sum("salary"), bonus: sum("bonus"), deduction: sum("deduction"), accrued, paid, left: accrued - paid, sales: sale ? { n: sale.n, revenue: Number(sale.revenue), margin: Number(sale.margin) } : null };
  }).filter((r) => r.active === 1 || r.entries.length);
  return { rows, total: { accrued: rows.reduce((a, r) => a + r.accrued, 0), paid: rows.reduce((a, r) => a + r.paid, 0), left: rows.reduce((a, r) => a + r.left, 0) } };
}

/** Старые начисления из прежней админки (только просмотр). */
export async function legacyPayroll() {
  const { results } = await getRawDb().prepare("SELECT id, title, data_json, created_at FROM admin_records WHERE kind='payroll' AND archived=0 ORDER BY created_at DESC LIMIT 200").all<{ id: string; title: string; data_json: string; created_at: string }>();
  return results.map((r) => { let d: Record<string, string> = {}; try { d = JSON.parse(r.data_json); } catch { d = {}; } return { id: r.id, title: r.title, data: d, created_at: r.created_at }; });
}

export async function addPayroll(actor: Actor, input: { staffId: string; period: string; kind: string; amount: string; note: string; accountId?: string }) {
  if (!canPayroll(actor)) throw new HttpError(403, "Зарплаты ведут владелец, директор и бухгалтер");
  const kind = PAY_KIND[input.kind] ? input.kind : "";
  if (!kind) throw new HttpError(400, "Выберите тип");
  const period = periodOf(input.period);
  const amount = toMinor(input.amount, "Сумма")!;
  const note = text(input.note, 300);
  if (kind === "deduction" && note.length < 3) throw new HttpError(400, "Укажите причину удержания");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [s] = await q<{ id: string; display_name: string }>("SELECT id, display_name FROM staff WHERE id=? AND active>=0", text(input.staffId, 100));
    if (!s) throw new HttpError(404, "Сотрудник не найден");
    const id = newId();
    let txId: string | null = null;
    if (kind === "payout") {
      const [acc] = await q<{ id: string; name: string; currency: string }>("SELECT id, name, currency FROM financial_accounts WHERE id=? AND active=1 AND account_type IN ('cash','bank') FOR UPDATE", text(input.accountId, 100));
      if (!acc) throw new HttpError(400, "Выберите кассу, из которой платите");
      if (acc.currency !== "KGS") throw new HttpError(400, "Зарплата выплачивается из сомовой кассы");
      const [b] = await q<{ b: number }>("SELECT (a.opening_balance_minor + COALESCE((SELECT SUM(CASE WHEN direction='in' THEN amount_minor ELSE -amount_minor END) FROM account_transactions WHERE account_id=a.id),0))::bigint AS b FROM financial_accounts a WHERE a.id=?", acc.id);
      if (Number(b?.b ?? 0) < amount && actor.role !== "owner") throw new HttpError(409, `В «${acc.name}» не хватает денег: остаток ${(Number(b?.b ?? 0) / 100).toLocaleString("ru-RU")} с`);
      txId = newId();
      await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,occurred_at,description,counterparty,link_type,link_id,created_by) VALUES(?,?, 'out', ?, 'Зарплата', CURRENT_TIMESTAMP, ?, ?, 'payroll', ?, ?)", txId, acc.id, amount, `Зарплата за ${period}${note ? ` · ${note}` : ""}`, s.display_name, id, actor.id);
    }
    await q("INSERT INTO payroll_entries(id,staff_id,period,kind,amount_minor,note,tx_id,created_by) VALUES(?,?,?,?,?,?,?,?)", id, s.id, period, kind, amount, note, txId, actor.id);
    await audit(q, actor, `payroll.${kind}`, id, `${s.display_name}, ${period}: ${PAY_KIND[kind].label} ${amount / 100} с`);
  });
}

export async function voidPayroll(actor: Actor, id: string, reason: string) {
  if (!canPayroll(actor)) throw new HttpError(403, "Нет доступа");
  const why = text(reason, 300);
  if (why.length < 3) throw new HttpError(400, "Укажите причину");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [e] = await q<{ id: string; status: string; tx_id: string | null; kind: string; amount_minor: number; period: string }>("SELECT id, status, tx_id, kind, amount_minor, period FROM payroll_entries WHERE id=? FOR UPDATE", id);
    if (!e) throw new HttpError(404, "Запись не найдена");
    if (e.status === "void") throw new HttpError(409, "Уже отменена");
    if (e.tx_id) {
      const [t] = await q<{ account_id: string; amount_minor: number; reversed_by: string | null }>("SELECT account_id, amount_minor, reversed_by FROM account_transactions WHERE id=? FOR UPDATE", e.tx_id);
      if (t && !t.reversed_by) {
        const rid = newId();
        await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,occurred_at,description,link_type,link_id,created_by) VALUES(?,?, 'in', ?, 'Сторно', CURRENT_TIMESTAMP, ?, 'payroll', ?, ?)", rid, t.account_id, t.amount_minor, `Сторно выплаты зарплаты: ${why}`, e.id, actor.id);
        await q("UPDATE account_transactions SET reversed_by=? WHERE id=?", rid, e.tx_id);
      }
    }
    await q("UPDATE payroll_entries SET status='void', void_reason=? WHERE id=?", why, id);
    await audit(q, actor, "payroll.void", id, `${PAY_KIND[e.kind]?.label} ${Number(e.amount_minor) / 100} с за ${e.period}: ${why}`);
  });
}
