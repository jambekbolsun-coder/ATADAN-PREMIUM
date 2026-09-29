"use client";

import { ImageUp, LoaderCircle } from "lucide-react";
import { ChangeEvent, useState } from "react";

export function AdminMediaUpload({
  onUploaded,
  accept = "image/jpeg,image/png,image/webp,image/avif",
  multiple = false,
  label = "Загрузить файл",
  visibility = "public",
  scope = "documents",
}: {
  onUploaded: (urls: string[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  visibility?: "public" | "private";
  scope?:string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, multiple ? 12 : 1);
    event.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setError("");
    const urls: string[] = [];
    try {
      for (const file of files) {
        const payload = new FormData();
        payload.set("file", file);
        payload.set("visibility", visibility);
        payload.set("scope",scope);
        if(file.size>4_000_000)throw new Error("Размер файла · до 4 МБ");
        const response = await fetch("/api/admin/media", { method: "POST", body: payload });
        const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
        if (!response.ok || !result.url) throw new Error(result.error || `Не удалось загрузить «${file.name}»`);
        urls.push(result.url);
      }
      onUploaded(urls);
    } catch (uploadError) {
      if (urls.length) onUploaded(urls);
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить файл");
    } finally {
      setBusy(false);
    }
  }

  return <span className="admin-media-upload">
    <label className={busy ? "is-busy" : ""}>
      {busy ? <LoaderCircle className="spin"/> : <ImageUp/>}
      <span>{busy ? "Загружаем…" : label}</span>
      <input type="file" accept={accept} multiple={multiple} disabled={busy} onChange={upload}/>
    </label>
    {error ? <small role="alert">{error}</small> : null}
  </span>;
}
