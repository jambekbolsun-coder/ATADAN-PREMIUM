"use client";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { savePartAction } from "../../../_lib/marketing-actions";
import { Field, Toast } from "../../../_ui/forms";
import { ImageInput } from "../../../_ui/upload";

export type PartFormValue = { id?: string; sku: string; name: string; category: string; models: string[]; unit: string; price: string; cost: string; minQty: string; location: string; image: string; description: string; showOnSite: boolean; openingQty: string };

export function PartForm({ initial, categories, models, seesCost, canStock }: { initial: PartFormValue; categories: string[]; models: { slug: string; model: string }[]; seesCost: boolean; canStock: boolean }) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof PartFormValue>(k: K, val: PartFormValue[K]) => setV((x) => ({ ...x, [k]: val }));
  return (
    <div className="ax-grid" style={{ gap: 14 }}>
      <section className="ax-card">
        <div className="ax-grid ax-g2" style={{ gap: 12 }}>
          <Field label="Артикул" htmlFor="pt-sku" hint="Как в каталоге завода"><input id="pt-sku" className="ax-input num" value={v.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} placeholder="CF4C-1012100" /></Field>
          <Field label="Название" htmlFor="pt-name"><input id="pt-name" className="ax-input" value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Масляный фильтр" /></Field>
          <Field label="Группа" htmlFor="pt-cat"><select id="pt-cat" className="ax-input" value={v.category} onChange={(e) => set("category", e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Единица" htmlFor="pt-unit"><select id="pt-unit" className="ax-input" value={v.unit} onChange={(e) => set("unit", e.target.value)}>{["шт", "компл", "л", "кг", "м"].map((u) => <option key={u}>{u}</option>)}</select></Field>
          <Field label="Цена продажи, сом" htmlFor="pt-price"><input id="pt-price" className="ax-input num" inputMode="decimal" value={v.price} onChange={(e) => set("price", e.target.value)} /></Field>
          {seesCost ? <Field label="Себестоимость, сом" htmlFor="pt-cost" hint="Пересчитается сама при приходе"><input id="pt-cost" className="ax-input num" inputMode="decimal" value={v.cost} onChange={(e) => set("cost", e.target.value)} /></Field> : null}
          <Field label="Минимальный остаток" htmlFor="pt-min" hint="Ниже - предупреждение «пора заказать»"><input id="pt-min" className="ax-input num" inputMode="numeric" value={v.minQty} onChange={(e) => set("minQty", e.target.value)} /></Field>
          <Field label="Место на складе" htmlFor="pt-loc"><input id="pt-loc" className="ax-input" value={v.location} onChange={(e) => set("location", e.target.value)} placeholder="Стеллаж 3, полка 2" /></Field>
          {!v.id && canStock ? <Field label="Сколько есть сейчас" htmlFor="pt-open" hint="Начальный остаток"><input id="pt-open" className="ax-input num" inputMode="numeric" value={v.openingQty} onChange={(e) => set("openingQty", e.target.value)} /></Field> : null}
        </div>
        <Field label="Подходит к моделям" htmlFor="pt-models">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 160, overflow: "auto", padding: 4, border: "1px solid var(--border)", borderRadius: 10 }}>
            {models.map((m) => {
              const on = v.models.includes(m.slug);
              return <button key={m.slug} type="button" className={`ax-btn ax-btn-sm ${on ? "ax-btn-primary" : ""}`} aria-pressed={on} onClick={() => set("models", on ? v.models.filter((s) => s !== m.slug) : [...v.models, m.slug])}>{m.model}</button>;
            })}
          </div>
        </Field>
      </section>
      <section className="ax-card">
        <h3 className="ax-card-h">Для сайта</h3>
        <Field label="Фото" htmlFor="pt-img"><ImageInput value={v.image} onChange={(x) => set("image", x)} /></Field>
        <Field label="Описание" htmlFor="pt-desc"><textarea id="pt-desc" className="ax-input" rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <label className="ax-check" style={{ borderBottom: 0 }}><input type="checkbox" checked={v.showOnSite} onChange={(e) => set("showOnSite", e.target.checked)} /> Показывать на сайте (нужна цена)</label>
      </section>
      {error ? <div className="ax-error" role="alert">{error}</div> : null}
      <div className="ax-sticky-actions">
        <button type="button" className="ax-btn ax-btn-primary" disabled={pending} onClick={() => { setError(""); start(async () => { const r = await savePartAction(v); if (r && !r.ok) setError(r.error ?? "Не удалось сохранить"); else if (r?.ok) setToast(r.message ?? "Сохранено"); }); }}>{pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Сохранить</button>
      </div>
      {toast ? <Toast text={toast} onDone={() => setToast("")} /> : null}
    </div>
  );
}
