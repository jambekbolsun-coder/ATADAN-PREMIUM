"use client";
import { useId, useState } from "react";
import { ArrowLeftRight, Minus, Plus, Wallet } from "lucide-react";
import { ActionDialog, Field } from "../../../_ui/forms";
import { createAccountAction, movementAction, reverseAction, transferAction } from "../../../_lib/stock-actions";

type Account = { id: string; name: string; currency: string; balance: number };
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (minor: number, cur: string) => `${(minor / 100).toLocaleString("ru-RU")} ${cur === "USD" ? "$" : cur === "CNY" ? "¥" : "с"}`;

export function MovementDialog({ direction, accounts, categories, isOwner, defaultOpenLabel }: { direction: "in" | "out"; accounts: Account[]; categories: string[]; isOwner: boolean; defaultOpenLabel?: string }) {
  return (
    <ActionDialog
      label={direction === "in" ? <><Plus size={17} aria-hidden />{defaultOpenLabel ?? "Приход"}</> : <><Minus size={17} aria-hidden />{defaultOpenLabel ?? "Расход"}</>}
      triggerClass={direction === "in" ? "ax-btn-primary" : undefined}
      title={direction === "in" ? "Приход в кассу" : "Расход из кассы"}
      description={direction === "in" ? "Оплаты клиентов по продажам записывайте в карточке продажи: там же считается долг." : "Оплату заводу и расходы поставки вносите в Логистике: они войдут в себестоимость машин."}
      action={movementAction}
      submitLabel={direction === "in" ? "Записать приход" : "Записать расход"}
      disabled={!accounts.length}
      disabledReason="Сначала добавьте кассу или счёт"
    >
      <input type="hidden" name="direction" value={direction} />
      <Field label="Касса или счёт" htmlFor={`mv-acc-${direction}`}>
        <select id={`mv-acc-${direction}`} name="accountId" className="ax-input">{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · остаток {fmt(a.balance, a.currency)}</option>)}</select>
      </Field>
      <div className="ax-grid ax-g2" style={{ gap: 12 }}>
        <Field label="Сумма (в валюте кассы)" htmlFor={`mv-amount-${direction}`}><input id={`mv-amount-${direction}`} name="amount" className="ax-input num" inputMode="decimal" required /></Field>
        <Field label="Дата" htmlFor={`mv-date-${direction}`}><input id={`mv-date-${direction}`} name="date" type="date" className="ax-input" defaultValue={today()} max={today()} required /></Field>
      </div>
      <Field label="Категория" htmlFor={`mv-cat-${direction}`}><select id={`mv-cat-${direction}`} name="category" className="ax-input">{categories.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label={direction === "in" ? "От кого" : "Кому"} htmlFor={`mv-cp-${direction}`}><input id={`mv-cp-${direction}`} name="counterparty" className="ax-input" placeholder={direction === "in" ? "Например: владелец" : "Например: ИП Касымов (аренда)"} /></Field>
      <Field label="Комментарий" htmlFor={`mv-desc-${direction}`}><input id={`mv-desc-${direction}`} name="description" className="ax-input" placeholder={direction === "in" ? "" : "Аренда склада за ноябрь"} /></Field>
      {direction === "out" && isOwner ? <label className="ax-check"><input type="checkbox" name="allowNegative" /> Разрешить уйти в минус (только владелец)</label> : null}
    </ActionDialog>
  );
}

export function TransferDialog({ accounts }: { accounts: Account[] }) {
  const [from, setFrom] = useState(accounts[0]?.id ?? "");
  const [to, setTo] = useState(accounts[1]?.id ?? "");
  const a = accounts.find((x) => x.id === from), b = accounts.find((x) => x.id === to);
  return (
    <ActionDialog label={<><ArrowLeftRight size={17} aria-hidden />Перевод</>} title="Перевод между кассами" description="Например: сдали наличные в банк или купили доллары." action={transferAction} submitLabel="Перевести" disabled={accounts.length < 2} disabledReason="Нужно хотя бы две кассы или счёта">
      <div className="ax-grid ax-g2" style={{ gap: 12 }}>
        <Field label="Откуда" htmlFor="tr-from"><select id="tr-from" name="fromId" className="ax-input" value={from} onChange={(e) => setFrom(e.target.value)}>{accounts.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.currency}</option>)}</select></Field>
        <Field label="Куда" htmlFor="tr-to"><select id="tr-to" name="toId" className="ax-input" value={to} onChange={(e) => setTo(e.target.value)}>{accounts.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.currency}</option>)}</select></Field>
        <Field label={`Сумма, ${a?.currency ?? ""}`} htmlFor="tr-amount"><input id="tr-amount" name="amount" className="ax-input num" inputMode="decimal" required /></Field>
        {a && b && a.currency !== b.currency ? <Field label={`Пришло на «${b.name}», ${b.currency}`} htmlFor="tr-received" hint="Курс посчитается сам из двух сумм"><input id="tr-received" name="received" className="ax-input num" inputMode="decimal" required /></Field> : null}
        <Field label="Дата" htmlFor="tr-date"><input id="tr-date" name="date" type="date" className="ax-input" defaultValue={today()} max={today()} required /></Field>
      </div>
      <Field label="Комментарий" htmlFor="tr-note"><input id="tr-note" name="note" className="ax-input" /></Field>
    </ActionDialog>
  );
}

export function ReverseButton({ txId }: { txId: string }) {
  const uid = useId(); // кнопка может быть дважды на странице (таблица и карточки телефона)
  return (
    <ActionDialog label="Сторно" triggerClass="ax-btn-sm ax-btn-ghost" title="Сторнировать проводку" description="Проводка не удаляется: создаётся обратная, остаток пересчитается. Перевод сторнируется целиком." action={reverseAction.bind(null, txId)} submitLabel="Сторнировать" variant="danger">
      <Field label="Причина" htmlFor={`rv-${uid}`}><input id={`rv-${uid}`} name="reason" className="ax-input" required placeholder="Ошибка в сумме" /></Field>
    </ActionDialog>
  );
}

export function NewAccountDialog() {
  return (
    <ActionDialog label={<><Wallet size={17} aria-hidden />Новая касса</>} title="Новая касса или счёт" action={createAccountAction} submitLabel="Добавить">
      <Field label="Название" htmlFor="acc-name"><input id="acc-name" name="name" className="ax-input" required placeholder="Касса USD / Айыл Банк р/с" /></Field>
      <div className="ax-grid ax-g2" style={{ gap: 12 }}>
        <Field label="Тип" htmlFor="acc-type"><select id="acc-type" name="type" className="ax-input"><option value="cash">Наличная касса</option><option value="bank">Банковский счёт</option></select></Field>
        <Field label="Валюта" htmlFor="acc-cur"><select id="acc-cur" name="currency" className="ax-input"><option value="KGS">Сомы</option><option value="USD">Доллары</option><option value="CNY">Юани</option></select></Field>
      </div>
      <Field label="Начальный остаток" htmlFor="acc-open" hint="Сколько денег на счёте сейчас, до начала учёта"><input id="acc-open" name="opening" className="ax-input num" inputMode="decimal" defaultValue="0" /></Field>
    </ActionDialog>
  );
}
