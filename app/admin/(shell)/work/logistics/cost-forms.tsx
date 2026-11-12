"use client";
import { useState } from "react";
import { Calculator, Plus, Receipt, Trash2 } from "lucide-react";
import { ActionDialog, Field } from "../../../_ui/forms";
import { orderCostAction, orderPlanAction, shipmentCostAction, voidOrderCostAction } from "../../../_lib/stock-actions";
import { COST_ITEMS } from "../../../_lib/landed-cost";
import { VoidButton } from "./logistics-actions";

type Account = { id: string; name: string; currency: string };
const today = () => new Date().toISOString().slice(0, 10);
const SIGN: Record<string, string> = { USD: "$", CNY: "¥", KGS: "сом" };
const num = (v: string) => Number(String(v).replace(/\s/g, "").replace(",", ".")) || 0;
const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");

/**
 * Расход по заказу или поставке. scopes: к чему относится (весь заказ, модель, поставка).
 * Валюта по умолчанию: валюта заказа (обычно доллары), рядом сразу видно, сколько это в сомах.
 */
export function CostDialog({ target, accounts, usdRate, currency: poCurrency = "USD", scopes, defaultScope }: { target: { poId: string } | { shipmentId: string }; accounts: Account[]; usdRate: number; currency?: string; scopes?: { value: string; label: string }[]; defaultScope?: string }) {
  const [accountId, setAccountId] = useState("");
  const [costCur, setCostCur] = useState(poCurrency === "CNY" ? "USD" : poCurrency);
  const [amount, setAmount] = useState("");
  const [fx, setFx] = useState<Record<string, string>>({ USD: usdRate ? String(usdRate) : "", CNY: "" });
  const acc = accounts.find((a) => a.id === accountId);
  const currency = acc ? acc.currency : costCur;
  const action = "poId" in target ? orderCostAction.bind(null, target.poId) : shipmentCostAction.bind(null, target.shipmentId);
  return (
    <ActionDialog label={<><Receipt size={17} aria-hidden />Расход</>} title="Расход по заказу" description="Пошлина, транспорт, НДС, сборы, брокер, СВХ. Входит в себестоимость машин; по этой статье план из расчёта больше не учитывается." action={action} submitLabel="Добавить расход">
      <div className="ax-grid ax-g2" style={{ gap: 12 }}>
        <Field label="Статья" htmlFor="oc-cat"><select id="oc-cat" name="category" className="ax-input">{COST_ITEMS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></Field>
        {scopes?.length ? (
          <Field label="К чему относится" htmlFor="oc-scope" hint="Весь заказ: делится на все заказанные машины по цене завода">
            <select id="oc-scope" name="scope" className="ax-input" defaultValue={defaultScope ?? scopes[0].value}>{scopes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
          </Field>
        ) : null}
      </div>
      <Field label="Откуда платим" htmlFor="oc-acc" hint="«Ещё не оплачено»: сумма войдёт в себестоимость, деньги из кассы спишете позже">
        <select id="oc-acc" name="accountId" className="ax-input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Ещё не оплачено</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
        </select>
      </Field>
      <div className="ax-grid ax-g2" style={{ gap: 12 }}>
        {!acc ? <Field label="Валюта" htmlFor="oc-cur"><select id="oc-cur" name="currency" className="ax-input" value={costCur} onChange={(e) => setCostCur(e.target.value)}><option value="USD">Доллары, $</option><option value="KGS">Сомы</option><option value="CNY">Юани, ¥</option></select></Field> : <input type="hidden" name="currency" value={acc.currency} />}
        <Field label={`Сумма, ${SIGN[currency]}`} htmlFor="oc-amount" hint={currency !== "KGS" && num(amount) && num(fx[currency] ?? "") ? `≈ ${fmt(num(amount) * num(fx[currency] ?? ""))} сом` : undefined}><input id="oc-amount" name="amount" className="ax-input num" inputMode="decimal" required defaultValue="" onChange={(e) => setAmount(e.target.value)} /></Field>
        {currency !== "KGS" ? <Field label={`Курс: сомов за 1 ${SIGN[currency]}`} htmlFor="oc-fx" hint="По умолчанию курс НБКР на сегодня"><input id="oc-fx" name="fxRate" className="ax-input num" inputMode="decimal" required value={fx[currency] ?? ""} onChange={(e) => setFx((x) => ({ ...x, [currency]: e.target.value }))} /></Field> : <input type="hidden" name="fxRate" value="1" />}
        <Field label="Дата" htmlFor="oc-date"><input id="oc-date" name="paidAt" type="date" className="ax-input" defaultValue={today()} required /></Field>
      </div>
      <Field label="Комментарий" htmlFor="oc-note"><input id="oc-note" name="note" className="ax-input" placeholder="Счёт брокера № 15, фура Урумчи – Бишкек" /></Field>
    </ActionDialog>
  );
}

export function VoidOrderCost({ poId, costId }: { poId: string; costId: string }) {
  return <VoidButton action={voidOrderCostAction.bind(null, poId, costId)} title="Сторнировать расход" />;
}

type PlanLine = { id: string; model: string; qty: number; price: number; target: number | null };

/** Расчёт себестоимости как в Excel: по каждой модели цена завода + расходы на 1 машину = себестоимость; цель продажи и график оплаты заводу. */
export function PlanDialog({ poId, currency, lines, plan, schedule, usdRate }: { poId: string; currency: string; lines: PlanLine[]; plan: Record<string, number>; schedule: { label: string; percent: number }[]; usdRate: number }) {
  const sign = SIGN[currency] ?? currency;
  const init: Record<string, string> = {};
  for (const l of lines) {
    for (const c of COST_ITEMS) { const v = plan[`${l.id}:${c.key}`]; init[`${l.id}:${c.key}`] = v ? String(v / 100) : ""; }
    init[`target:${l.id}`] = l.target ? String(l.target / 100) : "";
  }
  const [values, setValues] = useState(init);
  const [pays, setPays] = useState(schedule.length ? schedule.map((s) => ({ label: s.label, percent: String(s.percent) })) : [{ label: "Оплата 1", percent: "" }, { label: "Оплата 2", percent: "" }]);
  const set = (k: string, v: string) => setValues((x) => ({ ...x, [k]: v }));
  const totalOf = (l: PlanLine) => l.price / 100 + COST_ITEMS.reduce((a, c) => a + num(values[`${l.id}:${c.key}`] ?? ""), 0);
  const paySum = pays.reduce((a, p) => a + num(p.percent), 0);
  return (
    <ActionDialog wide label={<><Calculator size={17} aria-hidden />Расчёт себестоимости</>} title="Расчёт себестоимости" description={`Суммы на одну машину, в ${sign}. Это план: когда внесёте настоящий расход по статье, он заменит план.`} action={orderPlanAction.bind(null, poId)} submitLabel="Сохранить расчёт">
      <div className="ax-table-wrap ax-calc-edit" style={{ marginBottom: 14 }}>
        <table className="ax-table">
          <thead><tr><th>Статья, {sign} на 1 машину</th>{lines.map((l) => <th key={l.id} className="r">{l.model} · {l.qty} шт.</th>)}</tr></thead>
          <tbody>
            <tr><td className="ax-strong">Цена завода (EXW)</td>{lines.map((l) => <td key={l.id} className="r num">{fmt(l.price / 100)}</td>)}</tr>
            {COST_ITEMS.map((c) => (
              <tr key={c.key}>
                <td>{c.label}</td>
                {lines.map((l) => <td key={l.id}><input className="ax-input num" aria-label={`${c.label}, ${l.model}`} inputMode="decimal" name={`plan:${l.id}:${c.key}`} value={values[`${l.id}:${c.key}`] ?? ""} onChange={(e) => set(`${l.id}:${c.key}`, e.target.value)} /></td>)}
              </tr>
            ))}
            <tr className="ax-calc-total"><td>Себестоимость, {sign}</td>{lines.map((l) => <td key={l.id} className="r num">{fmt(totalOf(l))}</td>)}</tr>
            {currency === "USD" && usdRate ? <tr className="ax-calc-sub"><td>≈ в сомах по курсу {usdRate}</td>{lines.map((l) => <td key={l.id} className="r num">{fmt(totalOf(l) * usdRate)}</td>)}</tr> : null}
            <tr>
              <td className="ax-strong">Цена продажи, {sign}</td>
              {lines.map((l) => <td key={l.id}><input className="ax-input num" aria-label={`Цена продажи ${l.model}`} inputMode="decimal" name={`target:${l.id}`} value={values[`target:${l.id}`] ?? ""} onChange={(e) => set(`target:${l.id}`, e.target.value)} placeholder="цель" /></td>)}
            </tr>
            <tr className="ax-calc-sub">
              <td>Прибыль с машины</td>
              {lines.map((l) => { const t = num(values[`target:${l.id}`] ?? ""); const p = t - totalOf(l); return <td key={l.id} className="r num" style={{ color: t ? (p >= 0 ? "var(--brand)" : "var(--terra)") : undefined }}>{t ? `${fmt(p)} (${Math.round((p / t) * 100)}%)` : ""}</td>; })}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="ax-group-t">График оплаты заводу</div>
      <div style={{ display: "grid", gap: 8, marginBottom: 6 }}>
        {pays.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input className="ax-input" aria-label="Название оплаты" name="payLabel" value={p.label} onChange={(e) => setPays((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} style={{ flex: 2 }} />
            <input className="ax-input num" aria-label="Процент" name="payPercent" inputMode="decimal" value={p.percent} placeholder="%" onChange={(e) => setPays((x) => x.map((y, j) => (j === i ? { ...y, percent: e.target.value } : y)))} style={{ flex: 1, maxWidth: 110 }} />
            <span className="ax-small" style={{ width: 16 }}>%</span>
            <button type="button" className="ax-tap" aria-label="Убрать оплату" onClick={() => setPays((x) => x.filter((_, j) => j !== i))}><Trash2 size={16} aria-hidden /></button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        {pays.length < 8 ? <button type="button" className="ax-btn ax-btn-sm" onClick={() => setPays((x) => [...x, { label: `Оплата ${x.length + 1}`, percent: "" }])}><Plus size={15} aria-hidden />Ещё оплата</button> : null}
        <span className="ax-small" style={{ color: paySum > 100 ? "var(--terra)" : undefined }}>Всего: {Math.round(paySum * 100) / 100}%{paySum && paySum !== 100 ? (paySum > 100 ? ", больше 100%" : `, не хватает ${Math.round((100 - paySum) * 100) / 100}%`) : ""}</span>
      </div>
    </ActionDialog>
  );
}
