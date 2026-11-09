"use client";
/** Загрузка документов в закрытое хранилище (POST /api/admin/media). Большие фото с телефона уменьшаются до загрузки. */
import { useRef, useState } from "react";
import { FileText, LoaderCircle, Paperclip, Trash2 } from "lucide-react";

const LIMIT = 3_900_000;
const isImageUrl = (u: string) => /\.(jpe?g|png|webp|avif)$/i.test(u);

async function shrink(file: File): Promise<File> {
  const convert = /image\/(heic|heif)/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (!(file.type.startsWith("image/") || convert) || (file.size <= LIMIT && !convert)) return file;
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.85));
  if (!blob) throw new Error("Не удалось подготовить фото");
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
}

async function upload(original: File) {
  const file = await shrink(original);
  if (file.size > 4_000_000) throw new Error(`${original.name}: файл больше 4 МБ`);
  const form = new FormData();
  form.set("file", file);
  form.set("visibility", "private");
  form.set("scope", "documents");
  const res = await fetch("/api/admin/media", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error || "Не удалось загрузить файл");
  return data.url;
}

export function FileLink({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {isImageUrl(url) ? <img src={url} alt="" className="ax-thumb" /> : <FileText size={20} aria-hidden />}
      <span>{label}</span>
    </a>
  );
}

/** Список файлов: первый считается основным. */
export function FilesInput({ value, onChange, max = 31 }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {value.map((url, i) => (
        <div key={url} className="ax-row-line">
          <FileLink url={url} label={i === 0 ? "Основной файл" : `Файл ${i + 1}`} />
          <button type="button" className="ax-tap" aria-label="Убрать файл" onClick={() => onChange(value.filter((x) => x !== url))}><Trash2 size={16} aria-hidden /></button>
        </div>
      ))}
      <input ref={ref} type="file" multiple accept="image/*,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={async (e) => {
        const files = Array.from(e.target.files ?? []).slice(0, max - value.length);
        e.target.value = "";
        if (!files.length) return;
        setBusy(true); setError("");
        let next = value;
        try {
          for (const file of files) { const url = await upload(file); next = [...next, url]; onChange(next); }
        } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
      }} />
      <button type="button" className="ax-btn ax-btn-sm" style={{ justifySelf: "start" }} disabled={busy || value.length >= max} onClick={() => ref.current?.click()}>{busy ? <LoaderCircle size={15} className="ax-spin" aria-hidden /> : <Paperclip size={15} aria-hidden />}Добавить файл или фото</button>
      <span className="ax-small">PDF, фото, Excel, Word. До 4 МБ на файл, большие фото уменьшатся сами.</span>
      {error ? <div className="ax-error" role="alert">{error}</div> : null}
    </div>
  );
}
