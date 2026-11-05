"use client";
/** Загрузка картинок в хранилище сайта (POST /api/admin/media, публичные файлы до 4 МБ). */
import { useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";

async function upload(file: File) {
  const form = new FormData();
  form.set("file", file);
  form.set("visibility", "public");
  const res = await fetch("/api/admin/media", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error || "Не удалось загрузить файл");
  return data.url;
}

function Thumb({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={{ width: 92, height: 68, objectFit: "cover", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }} />;
}

/** Одна картинка: превью, загрузка с устройства или ссылка. */
export function ImageInput({ value, onChange, label = "Загрузить фото" }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const uid = useId();
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {value ? <Thumb src={value} /> : <span className="ax-small" style={{ width: 92, height: 68, display: "grid", placeItems: "center", borderRadius: 10, border: "1px dashed var(--border)" }}>нет фото</span>}
        <input ref={ref} id={uid} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true); setError("");
          try { onChange(await upload(file)); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
        }} />
        <button type="button" className="ax-btn ax-btn-sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? <LoaderCircle size={15} className="ax-spin" aria-hidden /> : <ImagePlus size={15} aria-hidden />}{label}</button>
        {value ? <button type="button" className="ax-btn ax-btn-sm ax-btn-ghost" onClick={() => onChange("")}>Убрать</button> : null}
      </div>
      <input className="ax-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="или ссылка https://…" aria-label="Ссылка на картинку" />
      {error ? <div className="ax-error" role="alert">{error}</div> : null}
    </div>
  );
}

/** Галерея: несколько картинок с порядком. */
export function ImageList({ value, onChange, max = 12 }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const move = (i: number, d: number) => {
    const next = [...value];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {value.map((src, i) => (
          <div key={`${src}-${i}`} style={{ display: "grid", gap: 4, justifyItems: "center" }}>
            <Thumb src={src} />
            <div style={{ display: "flex", gap: 2 }}>
              <button type="button" className="ax-tap" aria-label="Левее" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={15} style={{ transform: "rotate(-90deg)" }} aria-hidden /></button>
              <button type="button" className="ax-tap" aria-label="Правее" onClick={() => move(i, 1)} disabled={i === value.length - 1}><ArrowDown size={15} style={{ transform: "rotate(-90deg)" }} aria-hidden /></button>
              <button type="button" className="ax-tap" aria-label="Убрать фото" onClick={() => onChange(value.filter((_, k) => k !== i))}><Trash2 size={15} aria-hidden /></button>
            </div>
          </div>
        ))}
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={async (e) => {
        const files = Array.from(e.target.files ?? []).slice(0, Math.max(0, max - value.length));
        e.target.value = "";
        if (!files.length) return;
        setBusy(true); setError("");
        const urls: string[] = [];
        try { for (const f of files) urls.push(await upload(f)); } catch (err) { setError((err as Error).message); }
        onChange([...value, ...urls]);
        setBusy(false);
      }} />
      <div><button type="button" className="ax-btn ax-btn-sm" disabled={busy || value.length >= max} onClick={() => ref.current?.click()}>{busy ? <LoaderCircle size={15} className="ax-spin" aria-hidden /> : <ImagePlus size={15} aria-hidden />}Добавить фото</button> <span className="ax-small">{value.length} из {max}</span></div>
      {error ? <div className="ax-error" role="alert">{error}</div> : null}
    </div>
  );
}
