"use client";
/**
 * Кнопки и диалоги действий. Правила (docs/admin-redesign/03-architecture.md §5):
 *  - кнопка блокируется до ответа сервера (нет двойного нажатия);
 *  - ошибка показывается рядом, с причиной; успех: короткое уведомление внизу;
 *  - опасные действия просят подтверждение.
 */
import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { CircleCheck, LoaderCircle, X } from "lucide-react";
import { cn } from "./ui";
import type { ActionResult } from "../_lib/sales-actions";

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="ax-toast" role="status" aria-live="polite">
      <CircleCheck size={18} aria-hidden /> {text}
    </div>
  );
}

type DialogProps = {
  label: ReactNode;
  title: string;
  description?: ReactNode;
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  submitLabel: string;
  variant?: "primary" | "danger" | "default";
  triggerClass?: string;
  disabled?: boolean;
  disabledReason?: string;
  children?: ReactNode;
};

/** Кнопка, открывающая диалог с формой. После успеха диалог закрывается и показывается уведомление. */
export function ActionDialog({ label, title, description, action, submitLabel, variant = "primary", triggerClass, disabled, disabledReason, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(action, null);
  const [transitionPending, startSubmit] = useTransition();
  const submitting = actionPending || transitionPending;
  const [toast, setToast] = useState("");
  const [shown, setShown] = useState<ActionResult | null>(null);
  if (state !== shown) {
    setShown(state);
    if (state?.ok) setToast(state.message ?? "Сохранено");
  }
  useEffect(() => {
    // после успеха закрываем и очищаем поля, чтобы следующая запись не унаследовала старые значения
    if (state?.ok) {
      ref.current?.close();
      formRef.current?.reset();
    }
  }, [state]);
  return (
    <>
      <button type="button" className={cn("ax-btn", triggerClass)} disabled={disabled} title={disabled ? disabledReason : undefined} aria-disabled={disabled} onClick={() => ref.current?.showModal()}>
        {label}
      </button>
      {disabled && disabledReason ? <span className="ax-sr">{disabledReason}</span> : null}
      {/* Закрытие по клику на затемнение; Esc закрывает <dialog> штатно. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog ref={ref} className="ax-sheet" aria-label={title} onClick={(e) => e.target === ref.current && ref.current?.close()}>
        <div className="ax-sheet-panel">
          <div className="ax-grip" aria-hidden />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <h2 style={{ flex: 1 }}>{title}</h2>
            <button type="button" className="ax-tap" onClick={() => ref.current?.close()} aria-label="Закрыть"><X size={20} aria-hidden /></button>
          </div>
          {description ? <div className="ax-small" style={{ marginBottom: 12 }}>{description}</div> : null}
          {/* Отправляем вручную: при ошибке введённые значения не сбрасываются (React по умолчанию очищает форму). */}
          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              startSubmit(() => formAction(data));
            }}
          >
            {children}
            {state && !state.ok ? <div className="ax-error" role="alert" style={{ marginBottom: 10 }}>{state.error}</div> : null}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
              <button type="button" className="ax-btn ax-btn-ghost" onClick={() => ref.current?.close()}>Отмена</button>
              <button type="submit" disabled={submitting} className={cn("ax-btn", variant === "primary" && "ax-btn-primary", variant === "danger" && "ax-btn-danger")}>
                {submitting ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}
                {submitLabel}
              </button>
            </div>
          </form>
        </div>
      </dialog>
      {toast ? <Toast text={toast} onDone={() => setToast("")} /> : null}
    </>
  );
}

/** Кнопка простого действия (без полей), с необязательным подтверждением. */
export function ActionButton({ action, label, confirm, variant = "default", disabled, disabledReason, className }: { action: () => Promise<ActionResult>; label: ReactNode; confirm?: string; variant?: "primary" | "danger" | "default"; disabled?: boolean; disabledReason?: string; className?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const confirmRef = useRef<HTMLDialogElement>(null);
  const run = () => {
    confirmRef.current?.close();
    setError("");
    start(async () => {
      const r = await action();
      if (r.ok) setToast(r.message ?? "Готово");
      else setError(r.error ?? "Не получилось");
    });
  };
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      {confirm ? (
        <dialog ref={confirmRef} className="ax-sheet" aria-label="Подтверждение">
          <div className="ax-sheet-panel">
            <div className="ax-grip" aria-hidden />
            <h2 style={{ marginBottom: 8 }}>Подтвердите действие</h2>
            <p style={{ margin: "0 0 16px" }}>{confirm}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="ax-btn ax-btn-ghost" onClick={() => confirmRef.current?.close()}>Отмена</button>
              <button type="button" className={cn("ax-btn", variant === "danger" ? "ax-btn-danger" : "ax-btn-primary")} onClick={run}>Да, выполнить</button>
            </div>
          </div>
        </dialog>
      ) : null}
      <button
        type="button"
        className={cn("ax-btn", variant === "primary" && "ax-btn-primary", variant === "danger" && "ax-btn-danger", className)}
        disabled={pending || disabled}
        title={disabled ? disabledReason : undefined}
        onClick={() => (confirm ? confirmRef.current?.showModal() : run())}
      >
        {pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}
        {label}
      </button>
      {disabled && disabledReason ? <span className="ax-small" style={{ maxWidth: 260 }}>{disabledReason}</span> : null}
      {error ? <span className="ax-error" role="alert" style={{ maxWidth: 320 }}>{error}</span> : null}
      {toast ? <Toast text={toast} onDone={() => setToast("")} /> : null}
    </span>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="ax-field">
      <label className="ax-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <div className="ax-hint">{hint}</div> : null}
    </div>
  );
}
