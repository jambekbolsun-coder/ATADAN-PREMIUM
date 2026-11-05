"use client";
import { useState } from "react";
import { Building2, Banknote, PackageCheck, Receipt, Scale } from "lucide-react";
import { ActionButton, ActionDialog, Field } from "../../../_ui/forms";
import {
  advanceShipmentAction, allocationAction, createSupplierAction, receiveShipmentAction, shipmentCostAction,
  supplierPaymentAction, voidShipmentCostAction, voidSupplierPaymentAction,
} from "../../../_lib/stock-actions";

type Account = { id: string; name: string; currency: string };
const today = () => new Date().toISOString().slice(0, 10);
const CUR_SIGN: Record<string, string> = { USD: "$", CNY: "¥", KGS: "сом" };

export function NewSupplierButton() {
  return (
    <ActionDialog label={<><Building2 size={17} aria-hidden />Поставщик</>} title="Новый поставщик" action={createSupplierAction} submitLabel="Добавить">
      <Field label="Название" htmlFor="sp-name"><input id="sp-name" name="name" className="ax-input" required placeholder="Changfa Group (Чанчжоу)" /></Field>
      <div className="ax-grid ax-g2" style={{ gap: 12 }}>
        <Field label="Страна" htmlFor="sp-country"><input id="sp-country" name="country" className="ax-input" defaultValue="Китай" /></Field>
        <Field label="Контактное лицо" htmlFor="sp-contact"><input id="sp-contact" name="contact" className="ax-input" /></Field>
        <Field label="Телефон / WeChat" htmlFor="sp-phone"><input id="sp-phone" name="phone" className="ax-input" /></Field>
      </div>
      <Field label="Условия" htmlFor="sp-terms"><input id="sp-terms" name="terms" className="ax-input" placeholder="30% предоплата, 70% перед отгрузкой" /></Field>
    </ActionDialog>
  );
}

/** Оплата заводу: касса определяет валюту; если валюта кассы не совпадает с валютой заказа, указывается, сколько покрыто в валюте заказа. */
export function SupplierPayment({ poId, poCurrency, accounts, rates }: { poId: string; poCurrency: string; accounts: Account[]; rates: Record<string, number> }) {
  const [accountId, setAccountId] = useState(accounts.find((a) => a.currency === poCurrency)?.id ?? accounts[0]?.id ?? "");
  const acc = accounts.find((a) => a.id === accountId);
  const currency = acc?.currency ?? "KGS";
  return (
    <ActionDialog label={<><Banknote size={17} aria-hidden />Оплатить заводу</>} triggerClass="ax-btn-primary" title="Оплата заводу" description="Курс запоминается: по нему считается закупочная цена машин этого заказа." action={supplierPaymentAction.bind(null, poId)} submitLabel="Провести оплату" disabled={!accounts.length} disabledReason="Сначала добавьте кассу или счёт">
      <Field label="Касса или счёт" htmlFor="spay-acc" hint={`Валюта оплаты: ${currency}`}>
        <select id="spay-acc" name="accountId" className="ax-input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
        </select>
      </Field>
      <div className="ax-grid ax-g2" style={{ gap: 12 }}>
        <Field label={`Сумма, ${CUR_SIGN[currency]}`} htmlFor="spay-amount"><input id="spay-amount" name="amount" className="ax-input num" inputMode="decimal" required /></Field>
        {currency !== "KGS" ? <Field label={`Курс: сомов за 1 ${CUR_SIGN[currency]}`} htmlFor="spay-fx"><input id="spay-fx" name="fxRate" className="ax-input num" inputMode="decimal" required defaultValue={rates[currency] ?? ""} /></Field> : <input type="hidden" name="fxRate" value="1" />}
        {currency !== poCurrency ? <Field label={`Сколько это в валюте заказа, ${CUR_SIGN[poCurrency]}`} htmlFor="spay-po" hint="Например, оплатили долларами заказ в юанях"><input id="spay-po" name="amountPo" className="ax-input num" inputMode="decimal" required /></Field> : null}
        <Field label="Дата" htmlFor="spay-date"><input id="spay-date" name="paidAt" type="date" className="ax-input" defaultValue={today()} max={today()} required /></Field>
      </div>
      <Field label="Комментарий" htmlFor="spay-note"><input id="spay-note" name="note" className="ax-input" placeholder="Предоплата 30%" /></Field>
    </ActionDialog>
  );
}

export function VoidButton({ action, title }: { action: (prev: import("../../../_lib/sales-actions").ActionResult | null, form: FormData) => Promise<import("../../../_lib/sales-actions").ActionResult>; title: string }) {
  return (
    <ActionDialog label="Сторно" triggerClass="ax-btn-sm ax-btn-ghost" title={title} description="Запись не удаляется: создаётся обратная проводка, остатки и себестоимость пересчитаются." action={action} submitLabel="Сторнировать" variant="danger">
      <Field label="Причина" htmlFor="void-why"><input id="void-why" name="reason" className="ax-input" required placeholder="Ошибка в сумме" /></Field>
    </ActionDialog>
  );
}

export function VoidSupplierPayment({ poId, paymentId }: { poId: string; paymentId: string }) {
  return <VoidButton action={voidSupplierPaymentAction.bind(null, poId, paymentId)} title="Сторнировать оплату заводу" />;
}
export function VoidShipmentCost({ shipmentId, costId }: { shipmentId: string; costId: string }) {
  return <VoidButton action={voidShipmentCostAction.bind(null, shipmentId, costId)} title="Сторнировать расход поставки" />;
}

const STEPS = [
  { key: "planned", label: "Планируется" }, { key: "shipped", label: "Отгружено с завода" }, { key: "transit", label: "В пути" },
  { key: "customs", label: "На таможне" }, { key: "cleared", label: "Растаможено" },
];

export function ShipmentActions(p: { shipmentId: string; status: string; units: { id: string; vin: string; model: string; received: boolean }[]; accounts: Account[]; rates: Record<string, number>; allocation: string; manual: { id: string; vin: string; value: string }[]; categories: Record<string, string> }) {
  const idx = STEPS.findIndex((s) => s.key === p.status);
  const next = idx >= 0 && idx < STEPS.length - 1 ? STEPS[idx + 1] : null;
  const notReceived = p.units.filter((u) => !u.received);
  const [costAcc, setCostAcc] = useState("");
  const [costCur, setCostCur] = useState("KGS");
  const acc = p.accounts.find((a) => a.id === costAcc);
  const currency = acc ? acc.currency : costCur;
  const [method, setMethod] = useState(p.allocation);
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {p.status !== "received" && next ? <ActionButton label={`Отметить: ${next.label}`} action={() => advanceShipmentAction(p.shipmentId, next.key)} /> : null}
      {notReceived.length ? (
        <ActionDialog label={<><PackageCheck size={17} aria-hidden />Принять на склад</>} triggerClass="ax-btn-primary" title="Принять на склад" description="Отметьте машины, которые реально пришли. Неотмеченные останутся в пути: недостача видна в поставке." action={receiveShipmentAction.bind(null, p.shipmentId)} submitLabel="Принять">
          <div style={{ maxHeight: 280, overflowY: "auto", marginBottom: 12 }}>
            {notReceived.map((u) => (
              <label key={u.id} className="ax-check"><input type="checkbox" name="unitId" value={u.id} defaultChecked /> <span style={{ flex: 1 }}>{u.model} · <span className="num">VIN {u.vin}</span></span></label>
            ))}
          </div>
          <Field label="Куда поставили" htmlFor="rcv-loc"><input id="rcv-loc" name="location" className="ax-input" defaultValue="Склад Бишкек" /></Field>
        </ActionDialog>
      ) : null}
      <ActionDialog label={<><Receipt size={17} aria-hidden />Расход поставки</>} title="Расход поставки" description="Фрахт, пошлина, НДС, брокер, сертификация. Распределяется на машины и входит в себестоимость." action={shipmentCostAction.bind(null, p.shipmentId)} submitLabel="Добавить расход">
        <Field label="Что оплатили" htmlFor="sc-cat"><select id="sc-cat" name="category" className="ax-input">{Object.entries(p.categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Откуда платим" htmlFor="sc-acc" hint="«Ещё не оплачено»: расход учтётся в себестоимости, деньги из кассы спишете позже">
          <select id="sc-acc" name="accountId" className="ax-input" value={costAcc} onChange={(e) => setCostAcc(e.target.value)}>
            <option value="">Ещё не оплачено</option>
            {p.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
          </select>
        </Field>
        {!acc ? <Field label="Валюта" htmlFor="sc-cur"><select id="sc-cur" name="currency" className="ax-input" value={costCur} onChange={(e) => setCostCur(e.target.value)}><option value="KGS">Сомы</option><option value="USD">Доллары</option><option value="CNY">Юани</option></select></Field> : <input type="hidden" name="currency" value={acc.currency} />}
        <div className="ax-grid ax-g2" style={{ gap: 12 }}>
          <Field label={`Сумма, ${CUR_SIGN[currency]}`} htmlFor="sc-amount"><input id="sc-amount" name="amount" className="ax-input num" inputMode="decimal" required /></Field>
          {currency !== "KGS" ? <Field label={`Курс: сомов за 1 ${CUR_SIGN[currency]}`} htmlFor="sc-fx"><input id="sc-fx" name="fxRate" className="ax-input num" inputMode="decimal" required defaultValue={p.rates[currency] ?? ""} /></Field> : <input type="hidden" name="fxRate" value="1" />}
          <Field label="Дата" htmlFor="sc-date"><input id="sc-date" name="paidAt" type="date" className="ax-input" defaultValue={today()} required /></Field>
        </div>
        <Field label="Комментарий" htmlFor="sc-note"><input id="sc-note" name="note" className="ax-input" placeholder="Фура Урумчи – Бишкек" /></Field>
      </ActionDialog>
      <ActionDialog label={<><Scale size={17} aria-hidden />Распределение</>} title="Как распределять расходы на машины" action={allocationAction.bind(null, p.shipmentId)} submitLabel="Сохранить">
        <Field label="Способ" htmlFor="al-method">
          <select id="al-method" name="method" className="ax-input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="value">Пропорционально закупочной цене</option>
            <option value="equal">Поровну на машину</option>
            <option value="manual">Вручную по каждой машине</option>
          </select>
        </Field>
        {method === "manual" ? (
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {p.manual.map((u) => (
              <Field key={u.id} label={`VIN ${u.vin}, сом`} htmlFor={`al-${u.id}`}><input id={`al-${u.id}`} name={`manual:${u.id}`} className="ax-input num" inputMode="decimal" defaultValue={u.value} /></Field>
            ))}
          </div>
        ) : null}
      </ActionDialog>
    </div>
  );
}
