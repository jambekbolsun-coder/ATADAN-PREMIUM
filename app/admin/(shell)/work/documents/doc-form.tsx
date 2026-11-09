"use client";
import { useEffect, useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { saveDocumentAction } from "../../../_lib/documents-actions";
import { searchCustomersAction, type CustomerHit } from "../../../_lib/sales-actions";
import { Field } from "../../../_ui/forms";
import { FilesInput } from "../../../_ui/file-upload";

export type DocFormValue = { title: string; date: string; folderId: string; level2: string; level3: string; files: string[]; number: string; customerId: string; customerName: string; vin: string; amount: string; note: string };
const NEW = "__new";

export function DocForm({ initial, folders, level2, level3, docId, version }: { initial: DocFormValue; folders: { id: string; name: string }[]; level2: string[]; level3: string[]; docId?: string; version?: number }) {
  const [v, setV] = useState(initial);
  const set = <K extends keyof DocFormValue>(k: K, val: DocFormValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const [custom2, setCustom2] = useState(false);
  const [custom3, setCustom3] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(() => { void searchCustomersAction(query).then(setHits); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function submit() {
    if (v.title.trim().length < 2) return setError("Укажите название документа");
    if (!v.files.length) return setError("Загрузите файл или фотографию");
    setError("");
    start(async () => {
      const r = await saveDocumentAction({ ...v, version }, docId);
      if (r && !r.ok) setError(r.error ?? "Не удалось сохранить");
    });
  }

  return (
    <div className="ax-grid" style={{ gap: 14 }}>
      <section className="ax-card">
        <h3 className="ax-card-h">Куда положить</h3>
        <div className="ax-grid ax-g2" style={{ gap: 12 }}>
          <Field label="Папка" htmlFor="d-folder"><select id="d-folder" className="ax-input" value={v.folderId} onChange={(e) => set("folderId", e.target.value)}>{folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Field>
          <Field label="Вид добавления" htmlFor="d-l2">
            {custom2 ? <input id="d-l2" className="ax-input" value={v.level2} onChange={(e) => set("level2", e.target.value)} placeholder="Новый вид" /> : <select id="d-l2" className="ax-input" value={v.level2} onChange={(e) => { if (e.target.value === NEW) { setCustom2(true); set("level2", ""); } else set("level2", e.target.value); }}>{level2.map((x) => <option key={x}>{x}</option>)}<option value={NEW}>Добавить свой…</option></select>}
          </Field>
          <Field label="Тип документа" htmlFor="d-l3">
            {custom3 ? <input id="d-l3" className="ax-input" value={v.level3} onChange={(e) => set("level3", e.target.value)} placeholder="Новый тип" /> : <select id="d-l3" className="ax-input" value={v.level3} onChange={(e) => { if (e.target.value === NEW) { setCustom3(true); set("level3", ""); } else set("level3", e.target.value); }}>{level3.map((x) => <option key={x}>{x}</option>)}<option value={NEW}>Добавить свой…</option></select>}
          </Field>
        </div>
      </section>

      <section className="ax-card">
        <h3 className="ax-card-h">Документ</h3>
        <div className="ax-grid ax-g2" style={{ gap: 12 }}>
          <Field label="Название" htmlFor="d-title"><input id="d-title" className="ax-input" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Инвойс завода, партия октябрь" /></Field>
          <Field label="Дата документа" htmlFor="d-date"><input id="d-date" type="date" className="ax-input" value={v.date} onChange={(e) => set("date", e.target.value)} /></Field>
          <Field label="Номер" htmlFor="d-num"><input id="d-num" className="ax-input" value={v.number} onChange={(e) => set("number", e.target.value)} /></Field>
          <Field label="Сумма, сом" htmlFor="d-amt"><input id="d-amt" className="ax-input num" inputMode="decimal" value={v.amount} onChange={(e) => set("amount", e.target.value)} /></Field>
          <Field label="VIN" htmlFor="d-vin"><input id="d-vin" className="ax-input num" value={v.vin} onChange={(e) => set("vin", e.target.value)} /></Field>
          <Field label="Клиент" htmlFor="d-cust" hint="Начните вводить имя или телефон">
            <input id="d-cust" className="ax-input" value={v.customerName} onChange={(e) => { setV((x) => ({ ...x, customerName: e.target.value, customerId: "" })); setQuery(e.target.value); if (e.target.value.trim().length < 2) setHits([]); }} />
          </Field>
        </div>
        {hits.length && !v.customerId ? <ul className="ax-grouped" style={{ marginBottom: 10 }}>{hits.map((h) => <li key={h.id}><button type="button" className="ax-row" onClick={() => { setV((x) => ({ ...x, customerId: h.id, customerName: h.name })); setHits([]); }}><span className="ax-row-body"><span className="ax-row-t">{h.name}</span><span className="ax-row-s">{h.phone}</span></span><span className="ax-row-end">Выбрать</span></button></li>)}</ul> : null}
        <Field label="Комментарий" htmlFor="d-note"><textarea id="d-note" className="ax-input" rows={2} value={v.note} onChange={(e) => set("note", e.target.value)} /></Field>
        <Field label="Файлы и фотографии"><FilesInput value={v.files} onChange={(files) => set("files", files)} /></Field>
      </section>

      {error ? <div className="ax-error" role="alert">{error}</div> : null}
      <div className="ax-sticky-actions"><button type="button" className="ax-btn ax-btn-primary" disabled={pending} onClick={submit}>{pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Сохранить документ</button></div>
    </div>
  );
}
