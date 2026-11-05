"use client";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, LoaderCircle, Pencil, Plus } from "lucide-react";
import { recordArchiveAction, recordMoveAction, recordStatusAction, saveRecordAction } from "../../_lib/marketing-actions";
import type { RecordField, RecordKindConfig } from "../../_lib/record-kinds";
import { ActionButton, Field, Toast } from "../../_ui/forms";
import { ImageInput } from "../../_ui/upload";

type Rec = { id: string; title: string; subtitle: string; status: string; data: Record<string, string>; version: number; updated_at: string; author: string | null };
type Model = { slug: string; model: string };
const STATUS: Record<string, { label: string; cls: string }> = { published: { label: "На сайте", cls: "ax-b-good" }, draft: { label: "Черновик", cls: "ax-b-warn" }, hidden: { label: "Скрыто", cls: "ax-b-mute" } };
const today = () => new Date().toISOString().slice(0, 10);

function summary(kind: string, r: Rec, models: Model[]) {
  const name = (s: string) => models.find((m) => m.slug === s)?.model ?? s;
  const d = r.data;
  const period = d.startsAt || d.endsAt ? `${d.startsAt ?? "…"} - ${d.endsAt ?? "…"}` : "";
  const ended = d.endsAt && d.endsAt < today();
  if (kind === "promotions") return [d.discount ? `скидка ${d.discount}${d.discountType === "Сумма" ? " с" : "%"}` : "", d.reducedDownPercent ? `взнос ${d.reducedDownPercent}%` : "", d.zeroPercent === "Да" ? "0%" : "", d.gift ? `подарок: ${d.gift}` : "", (d.tractorSlugs ?? "").split(",").filter(Boolean).map((s) => name(s.trim())).join(", "), period, ended ? "закончилась" : ""].filter(Boolean).join(" · ");
  if (kind === "leasing_terms") return [d.programType, d.partner, d.annualRate ? `${d.annualRate}% годовых` : "", d.minDownPercent ? `взнос от ${d.minDownPercent}%` : "", d.termsMonths ? `сроки ${d.termsMonths} мес.` : "", period].filter(Boolean).join(" · ");
  if (kind === "leasing_model_terms") return [name(d.tractorSlug ?? ""), d.enabled === "Нет" ? "лизинг выключен" : "", d.price ? `цена ${Number(d.price).toLocaleString("ru-RU")} с` : "", d.minDownPercent ? `взнос от ${d.minDownPercent}%` : ""].filter(Boolean).join(" · ");
  if (kind === "faq") return (d.answer ?? r.subtitle ?? "").slice(0, 140);
  if (kind === "service_pages") return [d.slug ? `/service/${d.slug}` : "", d.price, d.timing].filter(Boolean).join(" · ");
  return r.subtitle;
}

function ModelPicker({ value, onChange, models, multi }: { value: string; onChange: (v: string) => void; models: Model[]; multi: boolean }) {
  const chosen = value.split(",").map((s) => s.trim()).filter(Boolean);
  if (!multi) return <select className="ax-input" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Выберите модель</option>{models.map((m) => <option key={m.slug} value={m.slug}>{m.model}</option>)}</select>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 180, overflow: "auto", padding: 4, border: "1px solid var(--border)", borderRadius: 10 }}>
      {models.map((m) => {
        const on = chosen.includes(m.slug);
        return <button type="button" key={m.slug} className={`ax-btn ax-btn-sm ${on ? "ax-btn-primary" : ""}`} aria-pressed={on} onClick={() => onChange((on ? chosen.filter((s) => s !== m.slug) : [...chosen, m.slug]).join(","))}>{m.model}</button>;
      })}
    </div>
  );
}

function FieldInput({ f, value, onChange, models }: { f: RecordField; value: string; onChange: (v: string) => void; models: Model[] }) {
  const id = `rf-${f.key}`;
  if (f.key === "tractorSlugs" || f.key === "tractorSlug") return <ModelPicker value={value} onChange={onChange} models={models} multi={f.key === "tractorSlugs"} />;
  if (f.type === "file") return <ImageInput value={value} onChange={onChange} />;
  if (f.type === "textarea" || f.type === "files") return <textarea id={id} className="ax-input" rows={f.type === "files" ? 3 : 4} value={value} onChange={(e) => onChange(e.target.value)} />;
  if (f.type === "select") return <select id={id} className="ax-input" value={value} onChange={(e) => onChange(e.target.value)}><option value="">не выбрано</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>;
  return <input id={id} className={`ax-input ${f.type === "number" ? "num" : ""}`} type={f.type === "date" ? "date" : "text"} inputMode={f.type === "number" ? "decimal" : undefined} value={value} onChange={(e) => onChange(e.target.value)} />;
}

export function RecordsBoard({ kind, config, records, models, titleLabel, subtitleLabel, initialEdit }: { kind: string; config: RecordKindConfig; records: Rec[]; models: Model[]; titleLabel: string; subtitleLabel?: string; initialEdit?: string }) {
  const [editing, setEditing] = useState<Rec | "new" | null>(() => records.find((r) => r.id === initialEdit) ?? null);
  const [draft, setDraft] = useState<{ title: string; subtitle: string; data: Record<string, string> }>(() => {
    const r = records.find((x) => x.id === initialEdit);
    return r ? { title: r.title, subtitle: r.subtitle, data: { ...r.data } } : { title: "", subtitle: "", data: {} };
  });
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [pending, start] = useTransition();

  function open(r: Rec | "new") {
    setEditing(r);
    setError("");
    setDraft(r === "new" ? { title: "", subtitle: "", data: kind === "leasing_terms" ? { termsMonths: "84", currency: "KGS" } : kind === "leasing_model_terms" ? { enabled: "Да" } : {} } : { title: r.title, subtitle: r.subtitle, data: { ...r.data } });
    setTimeout(() => document.getElementById("rec-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
  function save(status: string) {
    setError("");
    start(async () => {
      const cur = editing && editing !== "new" ? editing : null;
      const r = await saveRecordAction(kind, { id: cur?.id, version: cur?.version, title: kind === "faq" ? draft.data.question || draft.title : draft.title, subtitle: draft.subtitle, status, data: draft.data });
      if (!r.ok) setError(r.error ?? "Не удалось сохранить");
      else { setToast(status === "published" ? "Сохранено и показано на сайте" : "Сохранено"); setEditing(null); }
    });
  }
  const fields = config.fields.filter((f) => !(kind === "faq" && f.key === "question"));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <p className="ax-small" style={{ margin: 0, maxWidth: 640 }}>{config.description}</p>
        <button type="button" className="ax-btn ax-btn-primary" onClick={() => open("new")}><Plus size={17} aria-hidden />Добавить {config.singular}</button>
      </div>

      {editing ? (
        <section id="rec-editor" className="ax-card" style={{ marginBottom: 14, borderColor: "var(--brand)" }}>
          <h3 className="ax-card-h">{editing === "new" ? `Новая запись: ${config.singular}` : `Изменить: ${editing.title}`}</h3>
          <Field label={kind === "faq" ? "Вопрос посетителя" : titleLabel} htmlFor="rf-title">
            <input id="rf-title" className="ax-input" value={kind === "faq" ? draft.data.question ?? draft.title : draft.title} onChange={(e) => setDraft((d) => (kind === "faq" ? { ...d, title: e.target.value, data: { ...d.data, question: e.target.value } } : { ...d, title: e.target.value }))} />
          </Field>
          {subtitleLabel ? <Field label={subtitleLabel} htmlFor="rf-sub"><input id="rf-sub" className="ax-input" value={draft.subtitle} onChange={(e) => setDraft((d) => ({ ...d, subtitle: e.target.value }))} /></Field> : null}
          <div className="ax-grid ax-g2" style={{ gap: 12 }}>
            {fields.map((f) => (
              <div key={f.key} style={f.type === "textarea" || f.type === "file" || f.type === "files" || f.key === "tractorSlugs" ? { gridColumn: "1 / -1" } : undefined}>
                <Field label={`${f.label}${f.required ? " *" : ""}`} htmlFor={`rf-${f.key}`} hint={f.hint}>
                  <FieldInput f={f} models={models} value={draft.data[f.key] ?? ""} onChange={(v) => setDraft((d) => ({ ...d, data: { ...d.data, [f.key]: v } }))} />
                </Field>
              </div>
            ))}
          </div>
          <p className="ax-small">* обязательно для показа на сайте. Черновик можно сохранить и без них.</p>
          {error ? <div className="ax-error" role="alert" style={{ marginBottom: 10 }}>{error}</div> : null}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="ax-btn ax-btn-primary" disabled={pending} onClick={() => save("published")}>{pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Сохранить и показать на сайте</button>
            <button type="button" className="ax-btn" disabled={pending} onClick={() => save(editing !== "new" && editing.status === "hidden" ? "hidden" : "draft")}>Сохранить без показа</button>
            <button type="button" className="ax-btn ax-btn-ghost" onClick={() => setEditing(null)}>Отмена</button>
          </div>
        </section>
      ) : null}

      {records.length ? (
        <div className="ax-list ax-card" style={{ padding: 0 }}>
          {records.map((r, i) => (
            <div key={r.id} className="ax-list-row" style={{ padding: "12px 14px", alignItems: "center", flexWrap: "wrap" }}>
              <span className="ax-row-body" style={{ minWidth: 200, flex: 1 }}>
                <span className="ax-row-t">{r.title} <span className={`ax-badge ${STATUS[r.status]?.cls ?? "ax-b-mute"}`}>{STATUS[r.status]?.label ?? r.status}</span></span>
                <span className="ax-row-s">{summary(kind, r, models)}</span>
              </span>
              <span style={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" className="ax-tap" aria-label="Выше" disabled={i === 0 || pending} onClick={() => start(async () => { await recordMoveAction(kind, r.id, -1); })}><ArrowUp size={16} aria-hidden /></button>
                <button type="button" className="ax-tap" aria-label="Ниже" disabled={i === records.length - 1 || pending} onClick={() => start(async () => { await recordMoveAction(kind, r.id, 1); })}><ArrowDown size={16} aria-hidden /></button>
                {r.status === "published"
                  ? <button type="button" className="ax-tap" aria-label="Скрыть с сайта" title="Скрыть с сайта" onClick={() => start(async () => { const x = await recordStatusAction(kind, r.id, "hidden"); setToast(x.ok ? "Скрыто" : x.error ?? ""); })}><EyeOff size={16} aria-hidden /></button>
                  : <button type="button" className="ax-tap" aria-label="Показать на сайте" title="Показать на сайте" onClick={() => start(async () => { const x = await recordStatusAction(kind, r.id, "published"); if (!x.ok) { open(r); setError(x.error ?? ""); } else setToast("Показано на сайте"); })}><Eye size={16} aria-hidden /></button>}
                <button type="button" className="ax-btn ax-btn-sm" onClick={() => open(r)}><Pencil size={14} aria-hidden />Изменить</button>
                <ActionButton className="ax-btn-sm ax-btn-ghost" label="В архив" action={recordArchiveAction.bind(null, kind, r.id)} confirm={`«${r.title}» пропадёт с сайта и из списка.`} />
              </span>
            </div>
          ))}
        </div>
      ) : !editing ? <div className="ax-card"><p className="ax-small" style={{ margin: 0 }}>Пока пусто. Нажмите «Добавить {config.singular}».</p></div> : null}
      {toast ? <Toast text={toast} onDone={() => setToast("")} /> : null}
    </>
  );
}
