"use client";
import { useState } from "react";
import { Download, LoaderCircle, Upload } from "lucide-react";
import { Field } from "../../../_ui/forms";

type Kind = { key: string; label: string; endpoint: "data" | "import"; columns: string[]; example: string[]; hint: string };
type Result = { filename?: string; total?: number; valid?: number; create?: number; update?: number; skipped?: number; errors?: { row: number; error: string }[]; preview?: Record<string, unknown>[]; canCommit?: boolean; ok?: boolean; imported?: number; error?: string };

function template(k: Kind) {
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
  const csv = `\uFEFF${k.columns.map(esc).join(";")}\r\n${k.example.map(esc).join(";")}\r\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `atadan-shablon-${k.key}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ImportWizard({ kinds }: { kinds: Kind[] }) {
  const [kindKey, setKindKey] = useState(kinds[0]?.key ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState("skip");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [done, setDone] = useState<Result | null>(null);
  const kind = kinds.find((k) => k.key === kindKey);
  if (!kind) return <p className="ax-small">Импорт вам недоступен.</p>;

  async function send(commit: boolean) {
    if (!file || !kind) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    if (kind.endpoint === "data") { fd.set("action", commit ? "commit_import" : "validate_import"); fd.set("kind", kind.key); }
    else { fd.set("action", commit ? "commit" : "validate"); fd.set("mode", mode); }
    try {
      const r = await fetch(kind.endpoint === "data" ? "/api/admin/data" : "/api/admin/import", { method: "POST", body: fd });
      const data = (await r.json().catch(() => ({ error: "Сервер не ответил" }))) as Result;
      if (!r.ok) data.error = data.error ?? "Не удалось проверить файл";
      if (commit && data.ok) { setDone(data); setRes(null); setFile(null); } else setRes(data);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ol className="ax-small" style={{ margin: 0, paddingLeft: 18 }}>
        <li>Выберите, что загружаете, и скачайте шаблон.</li>
        <li>Заполните его в Excel и сохраните (CSV или XLSX).</li>
        <li>Загрузите файл: система покажет, что создастся и где ошибки.</li>
        <li>Если ошибок нет, нажмите «Загрузить». Строки с ошибками не загружаются никогда.</li>
      </ol>
      <div className="ax-grid ax-g2" style={{ gap: 12 }}>
        <Field label="Что загружаем" htmlFor="im-kind" hint={kind.hint}><select id="im-kind" className="ax-input" value={kindKey} onChange={(e) => { setKindKey(e.target.value); setRes(null); setDone(null); }}>{kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select></Field>
        {kind.endpoint === "import" ? <Field label="Если такой артикул уже есть" htmlFor="im-mode"><select id="im-mode" className="ax-input" value={mode} onChange={(e) => { setMode(e.target.value); setRes(null); }}><option value="skip">Пропустить</option><option value="update">Обновить название, цену, группу, минимум</option></select></Field> : <div />}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="ax-btn" onClick={() => template(kind)}><Download size={16} aria-hidden />Шаблон</button>
        <label className="ax-btn" style={{ cursor: "pointer" }}><Upload size={16} aria-hidden />{file ? file.name : "Выбрать файл"}<input type="file" accept=".csv,.xlsx" hidden onChange={(e) => { setFile(e.target.files?.[0] ?? null); setRes(null); setDone(null); }} /></label>
        <button type="button" className="ax-btn ax-btn-primary" disabled={!file || busy} onClick={() => send(false)}>{busy ? <LoaderCircle size={16} className="ax-spin" aria-hidden /> : null}Проверить</button>
      </div>
      {res?.error ? <div className="ax-error" role="alert">{res.error}</div> : null}
      {res && !res.error ? (
        <div className="ax-card" style={{ background: "var(--surface-2)" }}>
          <p style={{ marginTop: 0 }}>Строк в файле: <b>{res.total}</b>. {res.create !== undefined ? <>Будет создано <b>{res.create}</b>, обновлено <b>{res.update}</b>, пропущено <b>{res.skipped}</b>.</> : <>Готово к загрузке: <b>{res.valid}</b>.</>} {res.errors?.length ? <span className="ax-down">Ошибок: {res.errors.length}</span> : null}</p>
          {res.errors?.length ? <ul className="ax-small" style={{ maxHeight: 180, overflow: "auto" }}>{res.errors.slice(0, 100).map((e, i) => <li key={i}>строка {e.row}: {e.error}</li>)}</ul> : null}
          {res.preview?.length ? (
            <div className="ax-table-wrap" style={{ maxHeight: 260 }}>
              <table className="ax-table"><thead><tr>{Object.keys(res.preview[0]).map((k) => <th key={k}>{k}</th>)}</tr></thead>
                <tbody>{res.preview.map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j} className="ax-small">{String(v ?? "")}</td>)}</tr>)}</tbody></table>
            </div>
          ) : null}
          <div style={{ marginTop: 10 }}>
            <button type="button" className="ax-btn ax-btn-primary" disabled={!res.canCommit || busy} onClick={() => send(true)}>{busy ? <LoaderCircle size={16} className="ax-spin" aria-hidden /> : null}Загрузить</button>
            {!res.canCommit ? <span className="ax-small" style={{ marginLeft: 8 }}>Исправьте ошибки в файле и проверьте снова</span> : null}
          </div>
        </div>
      ) : null}
      {done ? <div className="ax-notice ax-n-good"><p style={{ margin: 0 }}>Загружено: {done.imported}{done.create !== undefined ? ` (создано ${done.create}, обновлено ${done.update})` : ""}. Запись в журнале действий.</p></div> : null}
    </div>
  );
}
