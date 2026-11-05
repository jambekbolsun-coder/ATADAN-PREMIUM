"use client";
import { useState, useTransition } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { createOrderAction } from "../../../../../_lib/stock-actions";
import { Field } from "../../../../../_ui/forms";
import { Notice } from "../../../../../_ui/ui";

type Line = { key: number; slug: string; qty: string; price: string };
let seq = 0;
const SIGN: Record<string, string> = { USD: "$", CNY: "¥", KGS: "с" };

export function NewOrderForm({ suppliers, models, usdRate }: { suppliers: { id: string; name: string }[]; models: { slug: string; label: string }[]; usdRate: number }) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [number, setNumber] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [rate, setRate] = useState(String(usdRate));
  const [orderedAt, setOrderedAt] = useState(new Date().toISOString().slice(0, 10));
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: ++seq, slug: "", qty: "1", price: "" }]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(String(l.price).replace(",", ".")) || 0), 0);

  if (!suppliers.length) return <Notice tone="warn">Сначала добавьте поставщика: Логистика → кнопка «Поставщик».</Notice>;

  return (
    <div className="ax-card">
      <div className="ax-grid ax-g2" style={{ gap: 12 }}>
        <Field label="Поставщик" htmlFor="po-sup"><select id="po-sup" className="ax-input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Номер заказа" htmlFor="po-num" hint="Из контракта или инвойса. Если пусто, присвоится сам"><input id="po-num" className="ax-input" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Например: CF-2026-118" /></Field>
        <Field label="Валюта заказа" htmlFor="po-cur">
          <select id="po-cur" className="ax-input" value={currency} onChange={(e) => { setCurrency(e.target.value); setRate(e.target.value === "USD" ? String(usdRate) : e.target.value === "KGS" ? "1" : ""); }}>
            <option value="USD">Доллары, $</option><option value="CNY">Юани, ¥</option><option value="KGS">Сомы</option>
          </select>
        </Field>
        {currency !== "KGS" ? <Field label={`Курс на дату заказа: сомов за 1 ${SIGN[currency]}`} htmlFor="po-rate" hint="Предварительный. После оплат заводу курс уточнится по фактическим платежам"><input id="po-rate" className="ax-input num" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} /></Field> : null}
        <Field label="Дата заказа" htmlFor="po-date"><input id="po-date" type="date" className="ax-input" value={orderedAt} onChange={(e) => setOrderedAt(e.target.value)} /></Field>
        <Field label="Ожидаемая дата отгрузки" htmlFor="po-exp"><input id="po-exp" type="date" className="ax-input" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} /></Field>
      </div>
      <div className="ax-group-t" style={{ marginTop: 6 }}>Что заказываем</div>
      <div className="ax-table-wrap" style={{ marginBottom: 10 }}>
        <table className="ax-table">
          <thead><tr><th>Модель</th><th style={{ width: 110 }}>Кол-во</th><th style={{ width: 170 }}>Цена за шт., {SIGN[currency]}</th><th className="r">Сумма</th><th /></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key}>
                <td><select className="ax-input" aria-label="Модель" value={l.slug} onChange={(e) => setLines((x) => x.map((y) => (y.key === l.key ? { ...y, slug: e.target.value } : y)))}><option value="">Выберите модель</option>{models.map((m) => <option key={m.slug} value={m.slug}>{m.label}</option>)}</select></td>
                <td><input className="ax-input num" aria-label="Количество" inputMode="numeric" value={l.qty} onChange={(e) => setLines((x) => x.map((y) => (y.key === l.key ? { ...y, qty: e.target.value } : y)))} /></td>
                <td><input className="ax-input num" aria-label="Цена" inputMode="decimal" value={l.price} onChange={(e) => setLines((x) => x.map((y) => (y.key === l.key ? { ...y, price: e.target.value } : y)))} /></td>
                <td className="r num">{((Number(l.qty) || 0) * (Number(String(l.price).replace(",", ".")) || 0)).toLocaleString("ru-RU")} {SIGN[currency]}</td>
                <td>{lines.length > 1 ? <button type="button" className="ax-tap" aria-label="Убрать строку" onClick={() => setLines((x) => x.filter((y) => y.key !== l.key))}><Trash2 size={17} aria-hidden /></button> : null}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={3}>Итого</td><td className="r num">{total.toLocaleString("ru-RU")} {SIGN[currency]}</td><td /></tr></tfoot>
        </table>
      </div>
      <button type="button" className="ax-btn" onClick={() => setLines((x) => [...x, { key: ++seq, slug: "", qty: "1", price: "" }])}><Plus size={16} aria-hidden />Ещё модель</button>
      <div style={{ marginTop: 14 }}><Field label="Комментарий" htmlFor="po-notes"><textarea id="po-notes" className="ax-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Условия оплаты, комплектация" /></Field></div>
      {error ? <div className="ax-error" role="alert" style={{ marginBottom: 10 }}>{error}</div> : null}
      <button
        type="button"
        className="ax-btn ax-btn-primary"
        disabled={pending}
        onClick={() => {
          setError("");
          if (lines.some((l) => !l.slug || !(Number(l.qty) > 0) || !(Number(String(l.price).replace(",", ".")) > 0))) return setError("Заполните модель, количество и цену в каждой строке");
          start(async () => {
            const r = await createOrderAction({ supplierId, number, currency, fxRate: currency === "KGS" ? "1" : rate, orderedAt, expectedAt: expectedAt || undefined, notes, lines: lines.map((l) => ({ slug: l.slug, qty: l.qty, price: l.price })) });
            if (r && !r.ok) setError(r.error ?? "Не удалось создать заказ");
          });
        }}
      >
        {pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Создать заказ
      </button>
    </div>
  );
}
