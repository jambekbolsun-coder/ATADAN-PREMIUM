import Link from "next/link";
import { requireSection } from "../../../_lib/session";
import { canPayroll, legacyPayroll, PAY_KIND, payrollMonth, periodOf } from "../../../_lib/payroll";
import { listAccounts } from "../../../_lib/money";
import { payrollAction, voidPayrollAction } from "../../../_lib/ops-actions";
import { ROLE_LABEL } from "../../../_lib/roles";
import { date, money } from "../../../_lib/format";
import type { StaffRole } from "../../../../lib/admin-auth";
import { ActionDialog, Field } from "../../../_ui/forms";
import { Badge, Card, Empty, Notice, PageHeader } from "../../../_ui/ui";

export const metadata = { title: "Зарплаты" };
const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const label = (p: string) => `${MONTHS[Number(p.slice(5)) - 1]} ${p.slice(0, 4)}`;
const shift = (p: string, d: number) => { const dt = new Date(Date.UTC(Number(p.slice(0, 4)), Number(p.slice(5)) - 1 + d, 1)); return dt.toISOString().slice(0, 7); };

export default async function Payroll({ searchParams }: PageProps<"/admin/work/payroll">) {
  const { actor } = await requireSection("/admin/work/payroll");
  const sp = await searchParams;
  const period = periodOf(sp.period);
  const [{ rows, total }, accounts, legacy] = await Promise.all([payrollMonth(period), listAccounts(), legacyPayroll()]);
  const edit = canPayroll(actor);
  const kgsAccounts = accounts.filter((a) => a.currency === "KGS");

  return (
    <>
      <PageHeader
        title="Зарплаты"
        subtitle="Оклад, премии и удержания по месяцам. Выплата проводится через кассу и попадает в расходы."
        actions={<><Link className="ax-btn" href={`/admin/work/payroll?period=${shift(period, -1)}`}>← {label(shift(period, -1))}</Link><Link className="ax-btn" href={`/admin/work/payroll?period=${shift(period, 1)}`}>{label(shift(period, 1))} →</Link></>}
      />
      <div className="ax-grid ax-g3" style={{ marginBottom: 14 }}>
        <div className="ax-card ax-kpi ax-k-green"><div className="ax-kpi-l">Начислено за {label(period)}</div><div className="ax-kpi-v num">{money(total.accrued)}</div></div>
        <div className="ax-card ax-kpi ax-k-sky"><div className="ax-kpi-l">Выплачено</div><div className="ax-kpi-v num">{money(total.paid)}</div></div>
        <div className="ax-card ax-kpi ax-k-sun"><div className="ax-kpi-l">Осталось выплатить</div><div className={`ax-kpi-v num ${total.left < 0 ? "ax-down" : ""}`}>{money(total.left)}</div><div className="ax-kpi-h">{total.left < 0 ? "выплачено больше начисленного" : ""}</div></div>
      </div>
      {!kgsAccounts.length && edit ? <div style={{ marginBottom: 12 }}><Notice tone="warn">Нет сомовой кассы: выплаты провести не получится. Добавьте кассу в разделе «Касса и платежи».</Notice></div> : null}

      {rows.length ? (
        <div className="ax-grid" style={{ gap: 12 }}>
          {rows.map((r) => (
            <Card key={r.id} title={<>{r.display_name} <span className="ax-small" style={{ fontWeight: 400 }}>{ROLE_LABEL[r.role as StaffRole]}{r.position ? ` · ${r.position}` : ""}</span><span className="num" style={{ marginLeft: "auto" }}>{r.left ? `к выплате ${money(r.left)}` : r.accrued ? "выплачено" : ""}</span></>}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }} className="ax-small">
                <span>Оклад: <b className="num">{money(r.salary)}</b></span>
                <span>Премии: <b className="num">{money(r.bonus)}</b></span>
                <span>Удержания: <b className="num">{money(r.deduction)}</b></span>
                <span>Выплачено: <b className="num">{money(r.paid)}</b></span>
                {r.sales ? <span>Продаж за месяц: <b>{r.sales.n}</b> на {money(r.sales.revenue)}, маржа {money(r.sales.margin)}</span> : null}
              </div>
              {r.entries.length ? (
                <div className="ax-list" style={{ marginBottom: 8 }}>
                  {r.entries.map((e) => (
                    <div key={e.id} className="ax-list-row" style={e.status === "void" ? { opacity: 0.5 } : undefined}>
                      <span className="ax-row-body"><span className="ax-row-t">{PAY_KIND[e.kind]?.label} <span className="num">{money(e.amount_minor)}</span> {e.status === "void" ? <Badge tone="mute">отменено</Badge> : null}</span><span className="ax-row-s">{date(e.created_at)}{e.account ? ` · ${e.account}` : ""}{e.note ? ` · ${e.note}` : ""}{e.void_reason ? ` · отмена: ${e.void_reason}` : ""}{e.author ? ` · ${e.author}` : ""}</span></span>
                      {edit && e.status === "posted" ? (
                        <ActionDialog label="Отменить" triggerClass="ax-btn-sm ax-btn-ghost" variant="danger" title="Отменить запись" description={e.kind === "payout" ? "Деньги вернутся в кассу обратной проводкой." : undefined} action={voidPayrollAction.bind(null, e.id)} submitLabel="Отменить запись">
                          <Field label="Причина" htmlFor={`pv-${e.id}`}><input id={`pv-${e.id}`} name="reason" className="ax-input" required /></Field>
                        </ActionDialog>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              {edit ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ActionDialog label="Начислить" triggerClass="ax-btn-sm" title={`Начисление: ${r.display_name}`} description={`За ${label(period)}`} action={payrollAction} submitLabel="Записать">
                    <input type="hidden" name="staffId" value={r.id} /><input type="hidden" name="period" value={period} />
                    <Field label="Что" htmlFor={`pk-${r.id}`}><select id={`pk-${r.id}`} name="kind" className="ax-input"><option value="salary">Оклад</option><option value="bonus">Премия</option><option value="deduction">Удержание</option></select></Field>
                    <Field label="Сумма, сом" htmlFor={`pa-${r.id}`}><input id={`pa-${r.id}`} name="amount" className="ax-input num" inputMode="decimal" required /></Field>
                    <Field label="Комментарий" htmlFor={`pn-${r.id}`} hint="Для премии: за что; для удержания: причина"><input id={`pn-${r.id}`} name="note" className="ax-input" /></Field>
                  </ActionDialog>
                  <ActionDialog label="Выплатить" triggerClass="ax-btn-sm ax-btn-primary" title={`Выплата: ${r.display_name}`} description={`К выплате за ${label(period)}: ${money(Math.max(0, r.left))}`} action={payrollAction} submitLabel="Выплатить" disabled={!kgsAccounts.length} disabledReason="Нет сомовой кассы">
                    <input type="hidden" name="staffId" value={r.id} /><input type="hidden" name="period" value={period} /><input type="hidden" name="kind" value="payout" />
                    <Field label="Из кассы" htmlFor={`pacc-${r.id}`}><select id={`pacc-${r.id}`} name="accountId" className="ax-input">{kgsAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {money(a.balance)}</option>)}</select></Field>
                    <Field label="Сумма, сом" htmlFor={`ppa-${r.id}`}><input id={`ppa-${r.id}`} name="amount" className="ax-input num" inputMode="decimal" defaultValue={r.left > 0 ? String(r.left / 100) : ""} required /></Field>
                    <Field label="Комментарий" htmlFor={`ppn-${r.id}`}><input id={`ppn-${r.id}`} name="note" className="ax-input" placeholder="Аванс / окончательный расчёт" /></Field>
                  </ActionDialog>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : <div className="ax-card"><Empty icon="banknote" title="Сотрудников нет" /></div>}

      {legacy.length ? (
        <details style={{ marginTop: 16 }}>
          <summary className="ax-small" style={{ cursor: "pointer" }}>Записи из старой админки ({legacy.length}), только просмотр</summary>
          <div className="ax-card" style={{ marginTop: 8 }}>
            {legacy.map((l) => <div key={l.id} className="ax-row-line" style={{ padding: "4px 0" }}><span>{l.title}<span className="ax-small"> · {Object.entries(l.data).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(", ").slice(0, 160)}</span></span><span className="ax-small">{date(l.created_at)}</span></div>)}
          </div>
        </details>
      ) : null}
    </>
  );
}
