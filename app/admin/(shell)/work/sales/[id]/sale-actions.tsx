"use client";
import { useState, useTransition } from "react";
import { Ban, Banknote, CalendarClock, Check, CreditCard, KeyRound, Landmark, RotateCcw, Truck } from "lucide-react";
import { ActionButton, ActionDialog, Field } from "../../../../_ui/forms";
import {
  addPaymentAction, allowDebtAction, attachUnitAction, bankDecisionAction, cancelSaleAction, changeMethodAction,
  deliverAction, extendReserveAction, refundAction, returnSaleAction, toggleDossierAction, voidPaymentAction,
} from "../../../../_lib/sales-actions";

type Account = { id: string; name: string; currency: string; account_type: string };
const today = () => new Date().toISOString().slice(0, 10);
const money = (minor: number, cur: string) => (cur === "USD" ? `$${Math.round(minor / 100).toLocaleString("ru-RU")}` : `${Math.round(minor / 100).toLocaleString("ru-RU")} с`);

/**
 * Касса, валюта, сумма и курс. Валюта платежа = валюта кассы. Сумма по умолчанию: остаток,
 * пересчитанный в валюту выбранной кассы по курсу; курс можно поправить, сумма пересчитается.
 */
function MoneyFields({ prefix, accounts, saleCurrency, fxDefault, leftMinor }: { prefix: string; accounts: Account[]; saleCurrency: string; fxDefault: number; leftMinor?: number }) {
  const [accountId, setAccountId] = useState(accounts.find((a) => a.currency === saleCurrency)?.id ?? accounts[0]?.id ?? "");
  const [fx, setFx] = useState(String(fxDefault));
  const [amount, setAmount] = useState<string | null>(null);
  const account = accounts.find((a) => a.id === accountId);
  const currency = account?.currency ?? "KGS";
  const needsRate = currency === "USD" || currency !== saleCurrency;
  const rate = Number(fx.replace(",", ".")) || fxDefault;
  const suggested = leftMinor
    ? String(Math.round((currency === saleCurrency ? leftMinor : saleCurrency === "USD" ? leftMinor * rate : leftMinor / rate)) / 100)
    : "";
  if (!accounts.length) return <p className="ax-error">Нет ни одной кассы или счёта. Добавьте их в Настройки → Компания.</p>;
  return (
    <>
      <Field label="Касса или счёт" htmlFor={`${prefix}-acc`} hint={`Валюта платежа: ${currency}`}>
        <select id={`${prefix}-acc`} name="accountId" className="ax-input" value={accountId} onChange={(e) => { setAccountId(e.target.value); setAmount(null); }}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
        </select>
      </Field>
      <input type="hidden" name="currency" value={currency} />
      <div className="ax-grid ax-g2" style={{ gap: 12 }}>
        <Field label={`Сумма, ${currency === "USD" ? "$" : "сом"}`} htmlFor={`${prefix}-amount`} hint={leftMinor && currency !== saleCurrency ? `Остаток ${money(leftMinor, saleCurrency)} по курсу ${rate}` : undefined}>
          <input id={`${prefix}-amount`} name="amount" className="ax-input num" inputMode="decimal" required value={amount ?? suggested} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        {needsRate ? (
          <Field label="Курс: сомов за $1" htmlFor={`${prefix}-fx`} hint="На дату платежа">
            <input id={`${prefix}-fx`} name="fxRate" className="ax-input num" inputMode="decimal" value={fx} onChange={(e) => setFx(e.target.value)} required />
          </Field>
        ) : null}
      </div>
    </>
  );
}

export function SaleActions(p: {
  saleId: string; status: string; currency: string; left: number; paid: number; leasing: boolean; bankDecision: string; method: string; bankName: string;
  accounts: Account[]; fxDefault: number; deliverBlock: string; debtAllowed: boolean; canDebt: boolean; canCancel: boolean; canRefund: boolean; canBankPay: boolean; reserveUntil: string | null;
}) {
  const booked = p.status === "booked";
  const open = p.status !== "cancelled";
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {open && p.left > 0 ? (
        <ActionDialog label={<><Banknote size={17} aria-hidden />Записать платёж</>} triggerClass="ax-btn-primary" title="Записать платёж" description={`Осталось оплатить ${money(p.left, p.currency)}. Платёж больше остатка не проводится.`} action={addPaymentAction.bind(null, p.saleId)} submitLabel="Провести платёж">
          {p.leasing && p.canBankPay ? (
            <Field label="Кто платит" htmlFor="pay-payer"><select id="pay-payer" name="payer" className="ax-input" defaultValue="client"><option value="client">Клиент</option><option value="bank">Банк ({p.bankName || "лизинг"})</option></select></Field>
          ) : <input type="hidden" name="payer" value="client" />}
          <MoneyFields key={p.left} prefix="pay" accounts={p.accounts} saleCurrency={p.currency} fxDefault={p.fxDefault} leftMinor={p.left} />
          <div className="ax-grid ax-g2" style={{ gap: 12 }}>
            <Field label="Дата" htmlFor="pay-date"><input id="pay-date" name="paidAt" type="date" className="ax-input" defaultValue={today()} max={today()} required /></Field>
            <Field label="Как оплатил" htmlFor="pay-method"><select id="pay-method" name="method" className="ax-input" defaultValue="cash"><option value="cash">Наличные</option><option value="bank_transfer">Перевод</option><option value="card">Карта</option></select></Field>
          </div>
          <Field label="Номер документа (необязательно)" htmlFor="pay-ref"><input id="pay-ref" name="reference" className="ax-input" placeholder="№ платёжки или квитанции" /></Field>
        </ActionDialog>
      ) : null}

      {booked ? (
        <ActionButton
          label={<><Truck size={17} aria-hidden />Выдать клиенту</>}
          variant={p.deliverBlock ? "default" : "primary"}
          disabled={!!p.deliverBlock}
          disabledReason={p.deliverBlock}
          confirm="Выдать технику клиенту? Машины уйдут со склада, начнётся гарантия."
          action={() => deliverAction(p.saleId)}
        />
      ) : null}

      {booked && p.canDebt && p.left > 0 && !p.debtAllowed ? (
        <ActionButton label={<><KeyRound size={17} aria-hidden />Разрешить выдачу в долг</>} confirm="Разрешить выдать технику до полной оплаты? Остаток уйдёт в «Долги»." action={() => allowDebtAction(p.saleId)} disabled={p.method === "installment" && p.paid <= 0} disabledReason="Сначала нужен первый взнос" />
      ) : null}

      {booked && p.leasing && p.bankDecision !== "approved" ? (
        <ActionDialog label={<><Landmark size={17} aria-hidden />Решение банка</>} title="Решение банка" action={bankDecisionAction.bind(null, p.saleId)} submitLabel="Сохранить">
          <Field label="Решение" htmlFor="bank-dec"><select id="bank-dec" name="decision" className="ax-input"><option value="approved">Одобрил</option><option value="rejected">Отказал</option></select></Field>
          <Field label="Комментарий" htmlFor="bank-note" hint="При отказе обязательно: причина"><input id="bank-note" name="note" className="ax-input" /></Field>
        </ActionDialog>
      ) : null}

      {booked ? (
        <ActionDialog label={<><CreditCard size={17} aria-hidden />Способ оплаты</>} title="Сменить способ оплаты" description="Например, если банк отказал. Уже внесённые платежи остаются." action={changeMethodAction.bind(null, p.saleId)} submitLabel="Сменить">
          <Field label="Новый способ" htmlFor="ch-method">
            <select id="ch-method" name="method" className="ax-input" defaultValue={p.method}>
              <option value="full">Полная оплата</option><option value="prepay">Предоплата + остаток</option><option value="installment">Рассрочка ATADAN</option><option value="bank_leasing">Банковский лизинг</option><option value="state_leasing">Гослизинг 6%</option>
            </select>
          </Field>
          <Field label="Банк (для лизинга)" htmlFor="ch-bank"><input id="ch-bank" name="bankName" className="ax-input" defaultValue={p.bankName} /></Field>
          <Field label="Срок (для рассрочки), месяцев" htmlFor="ch-months" hint="График остатка построится заново"><input id="ch-months" name="months" className="ax-input num" inputMode="numeric" defaultValue="12" /></Field>
        </ActionDialog>
      ) : null}

      {booked ? (
        <ActionDialog label={<><CalendarClock size={17} aria-hidden />Продлить резерв</>} title="Продлить резерв" description={p.reserveUntil ? `Сейчас до ${p.reserveUntil}. Максимум 90 дней от даты продажи.` : undefined} action={extendReserveAction.bind(null, p.saleId)} submitLabel="Продлить">
          <Field label="Новый срок" htmlFor="res-until"><input id="res-until" name="until" type="date" className="ax-input" required min={today()} /></Field>
          <Field label="Причина" htmlFor="res-why"><input id="res-why" name="reason" className="ax-input" required placeholder="Ждём транш банка" /></Field>
        </ActionDialog>
      ) : null}

      {(booked ? p.canRefund : open && p.canDebt) && p.paid > 0 ? (
        <ActionDialog label={<><RotateCcw size={17} aria-hidden />Возврат</>} title="Вернуть деньги клиенту" description={`Клиент заплатил ${money(p.paid, p.currency)}. Возврат уходит расходом из кассы.`} action={refundAction.bind(null, p.saleId)} submitLabel="Провести возврат" variant="danger">
          <MoneyFields key={p.paid} prefix="refund" accounts={p.accounts} saleCurrency={p.currency} fxDefault={p.fxDefault} leftMinor={p.paid} />
          <Field label="Причина" htmlFor="rf-why"><input id="rf-why" name="reason" className="ax-input" required placeholder="Клиент отказался от покупки" /></Field>
        </ActionDialog>
      ) : null}

      {open && !booked && p.canDebt ? (
        <ActionDialog label={<><RotateCcw size={17} aria-hidden />Возврат техники</>} triggerClass="ax-btn-danger" title="Вернуть технику на склад" description={p.paid > 0 ? "Сначала верните деньги клиенту кнопкой «Возврат»." : "Машины вернутся на склад, продажа будет отменена. Запись останется в истории."} action={returnSaleAction.bind(null, p.saleId)} submitLabel="Вернуть на склад" variant="danger" disabled={p.paid > 0} disabledReason="Сначала верните деньги">
          <Field label="Причина" htmlFor="rt-why"><input id="rt-why" name="reason" className="ax-input" required placeholder="Клиент вернул трактор" /></Field>
        </ActionDialog>
      ) : null}

      {booked && p.canCancel ? (
        <ActionDialog
          label={<><Ban size={17} aria-hidden />Отменить</>}
          triggerClass="ax-btn-danger"
          title="Отменить продажу"
          description={p.paid > 0 ? "Сначала верните деньги клиенту или сторнируйте платежи: отмена с оплатой не проводится." : "Резерв машин снимется, заявка вернётся в работу. Запись продажи останется в истории."}
          action={cancelSaleAction.bind(null, p.saleId)}
          submitLabel="Отменить продажу"
          variant="danger"
          disabled={p.paid > 0}
          disabledReason="Сначала верните деньги или сторнируйте платежи"
        >
          <Field label="Причина отмены" htmlFor="cn-why"><input id="cn-why" name="reason" className="ax-input" required placeholder="Клиент передумал / банк отказал" /></Field>
        </ActionDialog>
      ) : null}
    </div>
  );
}

export function PaymentRowActions({ saleId, paymentId }: { saleId: string; paymentId: string }) {
  return (
    <ActionDialog label="Сторно" triggerClass="ax-btn-sm ax-btn-ghost" title="Сторнировать платёж" description="Ошибочный платёж не удаляется: создаётся обратная проводка, остатки касс и долг пересчитаются." action={voidPaymentAction.bind(null, saleId, paymentId)} submitLabel="Сторнировать" variant="danger">
      <Field label="Причина" htmlFor={`void-${paymentId}`}><input id={`void-${paymentId}`} name="reason" className="ax-input" required placeholder="Ошибка в сумме" /></Field>
    </ActionDialog>
  );
}

export function DossierToggle({ saleId, docKey, label, checked, disabled }: { saleId: string; docKey: string; label: string; checked: boolean; disabled?: boolean }) {
  const [value, setValue] = useState(checked);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <label className="ax-check">
      <input
        type="checkbox"
        checked={value}
        disabled={pending || disabled}
        onChange={(e) => {
          const next = e.target.checked;
          setValue(next);
          setError("");
          start(async () => {
            const r = await toggleDossierAction(saleId, docKey, next);
            if (!r.ok) { setValue(!next); setError(r.error ?? "Не сохранилось"); }
          });
        }}
      />
      <span style={{ flex: 1 }}>{label}</span>
      {value ? <Check size={15} className="ax-up" aria-hidden /> : null}
      {error ? <span className="ax-error">{error}</span> : null}
    </label>
  );
}

export function AttachUnit({ saleId, itemId, units }: { saleId: string; itemId: string; units: { id: string; vin: string; model: string; status: string }[] }) {
  if (!units.length) return <div className="ax-small" style={{ marginTop: 6 }}>Свободных машин этой модели пока нет: дождитесь поставки.</div>;
  return (
    <div style={{ marginTop: 8 }}>
      <ActionDialog label="Привязать VIN" triggerClass="ax-btn-sm" title="Привязать машину" description="Выберите машину этой модели. Она зарезервируется под продажу." action={attachUnitAction.bind(null, saleId, itemId)} submitLabel="Привязать">
        <Field label="Машина" htmlFor={`att-${itemId}`}>
          <select id={`att-${itemId}`} name="unitId" className="ax-input" required>
            {units.map((u) => <option key={u.id} value={u.id}>{u.model} · VIN {u.vin} · {u.status === "stock" ? "на складе" : u.status}</option>)}
          </select>
        </Field>
      </ActionDialog>
    </div>
  );
}
