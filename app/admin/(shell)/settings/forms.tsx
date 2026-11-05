"use client";
/** Формы настроек на useActionState: значения не сбрасываются при ошибке, после успеха - всплывашка. */
import { startTransition, useActionState, useState, useTransition, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import type { ActionResult } from "../../_lib/sales-actions";
import { notifyAction } from "../../_lib/settings-actions";
import { Toast } from "../../_ui/forms";
import { ImageInput } from "../../_ui/upload";

export function SettingsForm({ action, children, submitLabel = "Сохранить", disabled }: { action: (p: ActionResult | null, f: FormData) => Promise<ActionResult>; children: ReactNode; submitLabel?: string; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [shown, setShown] = useState(state);
  const [toast, setToast] = useState("");
  if (state !== shown) { setShown(state); if (state?.ok) setToast(state.message ?? "Сохранено"); }
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => formAction(fd)); }} style={{ display: "grid", gap: 12 }}>
      <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 12 }}>{children}</fieldset>
      {state && !state.ok ? <div className="ax-error" role="alert">{state.error}</div> : null}
      {!disabled ? <div><button className="ax-btn ax-btn-primary" disabled={pending}>{pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}{submitLabel}</button></div> : null}
      {toast ? <Toast text={toast} onDone={() => setToast("")} /> : null}
    </form>
  );
}

/** Фото профиля: загрузка и скрытое поле формы. */
export function AvatarField({ initial }: { initial: string }) {
  const [v, setV] = useState(initial);
  return <><ImageInput value={v} onChange={setV} label="Загрузить фото" /><input type="hidden" name="avatar" value={v} /></>;
}

export function NotifyToggles({ items, initial }: { items: { key: string; label: string; hint: string }[]; initial: Record<string, boolean> }) {
  const [v, setV] = useState(initial);
  const [toast, setToast] = useState("");
  const [pending, start] = useTransition();
  const toggle = (k: string) => {
    const next = { ...v, [k]: !v[k] };
    setV(next);
    start(async () => { const r = await notifyAction(next); setToast(r.ok ? "Сохранено" : r.error ?? "Ошибка"); });
  };
  return (
    <ul className="ax-grouped">
      {items.map((i) => (
        <li key={i.key}>
          <label className="ax-row" style={{ cursor: "pointer" }} htmlFor={`nt-${i.key}`}>
            <span className="ax-row-body"><span className="ax-row-t">{i.label}</span><span className="ax-row-s">{i.hint}</span></span>
            <input id={`nt-${i.key}`} aria-label={i.label} type="checkbox" role="switch" checked={v[i.key]} disabled={pending} onChange={() => toggle(i.key)} style={{ width: 20, height: 20, accentColor: "var(--brand)" }} />
          </label>
        </li>
      ))}
      {toast ? <Toast text={toast} onDone={() => setToast("")} /> : null}
    </ul>
  );
}
