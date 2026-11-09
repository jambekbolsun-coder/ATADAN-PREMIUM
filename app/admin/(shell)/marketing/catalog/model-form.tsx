"use client";
import { useState, useTransition } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { saveModelAction } from "../../../_lib/marketing-actions";
import { Field, Toast } from "../../../_ui/forms";
import { ImageInput, ImageList } from "../../../_ui/upload";

export type ModelFormValue = {
  slug: string; model: string; hp: string; category: string; farmArea: string; price: string; priceUsd: string;
  discountPercent: string; promotionLabel: string; recommended: boolean; popular: boolean; sortOrder: string;
  image: string; images: string[]; videoUrl: string; description: string; comfort: string; equipment: string;
  specs: { k: string; v: string }[]; status: string; priceOnRequest: boolean;
};

const slugify = (v: string) => v.toLowerCase().replace(/[()]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);

export function ModelForm({ initial, originalSlug, categories, slugLocked }: { initial: ModelFormValue; originalSlug?: string; categories: string[]; slugLocked?: boolean }) {
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!originalSlug);
  const [priceNote, setPriceNote] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof ModelFormValue>(k: K, val: ModelFormValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const priceChanged = originalSlug && (v.price !== initial.price || v.priceUsd !== initial.priceUsd);

  function submit(status?: string) {
    setError("");
    start(async () => {
      const r = await saveModelAction({ ...v, status: status ?? v.status, originalSlug, priceNote, specs: v.specs.filter((s) => s.k.trim() && s.v.trim()) });
      if (r && !r.ok) setError(r.error ?? "Не удалось сохранить");
      else if (r?.ok) { setToast(r.message ?? "Сохранено"); if (status) set("status", status); setPriceNote(""); }
    });
  }

  return (
    <div className="ax-grid" style={{ gap: 14 }}>
      <section className="ax-card">
        <h3 className="ax-card-h">Основное</h3>
        <div className="ax-grid ax-g2" style={{ gap: 12 }}>
          <Field label="Название модели" htmlFor="m-model"><input id="m-model" className="ax-input" value={v.model} onChange={(e) => { set("model", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} placeholder="CFG1204-B" required /></Field>
          <Field label="Адрес на сайте" htmlFor="m-slug" hint={slugLocked ? "У базовой модели адрес не меняется" : "atadan.kg/catalog/…"}><input id="m-slug" className="ax-input num" value={v.slug} disabled={slugLocked} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase()); }} /></Field>
          <Field label="Мощность, л.с." htmlFor="m-hp"><input id="m-hp" className="ax-input num" inputMode="numeric" value={v.hp} onChange={(e) => set("hp", e.target.value)} /></Field>
          <Field label="Класс" htmlFor="m-cat"><select id="m-cat" className="ax-input" value={v.category} onChange={(e) => set("category", e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Для какой площади" htmlFor="m-area"><input id="m-area" className="ax-input" value={v.farmArea} onChange={(e) => set("farmArea", e.target.value)} placeholder="до 100 га" /></Field>
          <Field label="Порядок в каталоге" htmlFor="m-sort" hint="Меньше - выше"><input id="m-sort" className="ax-input num" inputMode="numeric" value={v.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} /></Field>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label className="ax-check"><input type="checkbox" checked={v.recommended} onChange={(e) => set("recommended", e.target.checked)} /> Рекомендуем</label>
          <label className="ax-check"><input type="checkbox" checked={v.popular} onChange={(e) => set("popular", e.target.checked)} /> Популярная</label>
        </div>
      </section>

      <section className="ax-card">
        <h3 className="ax-card-h">Цена на сайте</h3>
        <div className="ax-grid ax-g2" style={{ gap: 12 }}>
          <Field label="Цена, сом" htmlFor="m-price" hint="Если пусто, на сайте примерная цена в долларах"><input id="m-price" className="ax-input num" inputMode="numeric" value={v.price} onChange={(e) => set("price", e.target.value.replace(/\s/g, ""))} /></Field>
          <Field label="Примерная цена, $" htmlFor="m-usd" hint="Показывается в калькуляторе"><input id="m-usd" className="ax-input num" inputMode="numeric" value={v.priceUsd} onChange={(e) => set("priceUsd", e.target.value.replace(/\s/g, ""))} /></Field>
          <Field label="Скидка на сайте, %" htmlFor="m-disc"><input id="m-disc" className="ax-input num" inputMode="decimal" value={v.discountPercent} onChange={(e) => set("discountPercent", e.target.value)} /></Field>
          <Field label="Плашка на карточке" htmlFor="m-label" hint="Например: «Хит сезона»"><input id="m-label" className="ax-input" value={v.promotionLabel} onChange={(e) => set("promotionLabel", e.target.value)} /></Field>
        </div>
        {priceChanged ? <Field label="Почему меняется цена" htmlFor="m-pnote" hint="Попадёт в историю цен"><input id="m-pnote" className="ax-input" value={priceNote} onChange={(e) => setPriceNote(e.target.value)} placeholder="Новый прайс завода" /></Field> : null}
        <label className="ax-check" style={{ borderBottom: 0 }}><input type="checkbox" checked={v.priceOnRequest} onChange={(e) => set("priceOnRequest", e.target.checked)} /> Не показывать цену на сайте: «Цена по запросу»</label>
        <p className="ax-small" style={{ margin: 0 }}>Уже оформленные продажи не меняются. «В наличии» на сайте считается со склада автоматически.</p>
      </section>

      <section className="ax-card">
        <h3 className="ax-card-h">Фото и видео</h3>
        <Field label="Главное фото" htmlFor="m-img"><ImageInput value={v.image} onChange={(x) => set("image", x)} /></Field>
        <Field label="Галерея" htmlFor="m-gal" hint="Если пусто, сайт покажет фото серии"><ImageList value={v.images} onChange={(x) => set("images", x)} /></Field>
        <Field label="Видео (ссылка https://)" htmlFor="m-video"><input id="m-video" className="ax-input" value={v.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} /></Field>
      </section>

      <section className="ax-card">
        <h3 className="ax-card-h">Описание</h3>
        <Field label="Описание" htmlFor="m-desc"><textarea id="m-desc" className="ax-input" rows={5} value={v.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Комфорт и кабина" htmlFor="m-comf"><textarea id="m-comf" className="ax-input" rows={3} value={v.comfort} onChange={(e) => set("comfort", e.target.value)} /></Field>
        <Field label="Комплектация" htmlFor="m-eq" hint="По одному пункту в строке"><textarea id="m-eq" className="ax-input" rows={4} value={v.equipment} onChange={(e) => set("equipment", e.target.value)} /></Field>
      </section>

      <section className="ax-card">
        <h3 className="ax-card-h">Характеристики <span className="ax-small" style={{ marginLeft: "auto" }}>{v.specs.length}</span></h3>
        <div style={{ display: "grid", gap: 6 }}>
          {v.specs.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto", gap: 6 }}>
              <input className="ax-input" aria-label="Параметр" value={s.k} onChange={(e) => set("specs", v.specs.map((x, k) => (k === i ? { ...x, k: e.target.value } : x)))} placeholder="Параметр" />
              <input className="ax-input" aria-label="Значение" value={s.v} onChange={(e) => set("specs", v.specs.map((x, k) => (k === i ? { ...x, v: e.target.value } : x)))} placeholder="Значение" />
              <button type="button" className="ax-tap" aria-label="Убрать строку" onClick={() => set("specs", v.specs.filter((_, k) => k !== i))}><Trash2 size={16} aria-hidden /></button>
            </div>
          ))}
        </div>
        <button type="button" className="ax-btn ax-btn-sm" style={{ marginTop: 8 }} onClick={() => set("specs", [...v.specs, { k: "", v: "" }])}><Plus size={15} aria-hidden />Строка</button>
      </section>

      {error ? <div className="ax-error" role="alert">{error}</div> : null}
      <div className="ax-sticky-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="ax-btn ax-btn-primary" disabled={pending} onClick={() => submit()}>{pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Сохранить</button>
        {v.status !== "published" ? <button type="button" className="ax-btn" disabled={pending} onClick={() => submit("published")}>Сохранить и показать на сайте</button> : null}
        {!originalSlug ? <span className="ax-small" style={{ alignSelf: "center" }}>Новая модель сохраняется черновиком, пока вы не покажете её на сайте</span> : null}
      </div>
      {toast ? <Toast text={toast} onDone={() => setToast("")} /> : null}
    </div>
  );
}
