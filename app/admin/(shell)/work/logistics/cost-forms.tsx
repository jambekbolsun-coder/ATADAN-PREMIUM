"use client";
import { useState } from "react";
import { Receipt } from "lucide-react";
import { ActionDialog, Field } from "../../../_ui/forms";
import { orderCostAction, shipmentCostAction, voidOrderCostAction } from "../../../_lib/stock-actions";
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
    <ActionDialog label={<><Receipt size={17} aria-hidden />Расход</>} title="Расход по заказу" description="Пошлина, транспорт, НДС, сборы, брокер, СВХ. Входит в себестоимость машин." action={action} submitLabel="Добавить расход">
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
