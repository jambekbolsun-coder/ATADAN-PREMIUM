"use client";
import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { saveSiteAction } from "../../../_lib/marketing-actions";
import { Field, Toast } from "../../../_ui/forms";

type S = { phone: string; address: string; instagram: string; email?: string; workingHours?: string; annualRate: number | null; downPercent: number; fee: number; method: string };

export function SiteForm({ settings, version, canEdit }: { settings: S; version: number; canEdit: boolean }) {
  const [state, action, pending] = useActionState(saveSiteAction, null);
  const [shown, setShown] = useState(state);
  const [toast, setToast] = useState("");
  if (state !== shown) { setShown(state); if (state?.ok) setToast(state.message ?? "Сохранено"); }
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); }} className="ax-grid" style={{ gap: 14 }}>
      <input type="hidden" name="version" value={version} />
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 14 }}>
        <section className="ax-card">
          <h3 className="ax-card-h">Контакты на сайте</h3>
          <div className="ax-grid ax-g2" style={{ gap: 12 }}>
            <Field label="Телефон" htmlFor="s-phone"><input id="s-phone" name="phone" className="ax-input" defaultValue={settings.phone} required /></Field>
            <Field label="Email" htmlFor="s-email"><input id="s-email" name="email" className="ax-input" defaultValue={settings.email ?? ""} inputMode="email" /></Field>
            <Field label="Адрес" htmlFor="s-addr"><input id="s-addr" name="address" className="ax-input" defaultValue={settings.address} required /></Field>
            <Field label="Часы работы" htmlFor="s-hours"><input id="s-hours" name="workingHours" className="ax-input" defaultValue={settings.workingHours ?? ""} placeholder="Пн-Сб 9:00-18:00" /></Field>
          </div>
          <Field label="Instagram" htmlFor="s-ig"><input id="s-ig" name="instagram" className="ax-input" defaultValue={settings.instagram} required /></Field>
        </section>
        <section className="ax-card">
          <h3 className="ax-card-h">Калькулятор по умолчанию</h3>
          <p className="ax-small" style={{ marginTop: 0 }}>Используется, только если на вкладке <Link href="/admin/marketing/pages?tab=banks">«Банки и ставки»</Link> нет включённых банков. Срок лизинга задаётся там же.</p>
          <div className="ax-grid ax-g2" style={{ gap: 12 }}>
            <Field label="Годовая ставка, %" htmlFor="s-rate" hint="Пусто: калькулятор без ставки"><input id="s-rate" name="annualRate" className="ax-input num" inputMode="decimal" defaultValue={settings.annualRate ?? ""} /></Field>
            <Field label="Первый взнос, %" htmlFor="s-down"><input id="s-down" name="downPercent" className="ax-input num" inputMode="decimal" defaultValue={settings.downPercent} required /></Field>
            <Field label="Комиссия, сом" htmlFor="s-fee"><input id="s-fee" name="fee" className="ax-input num" inputMode="decimal" defaultValue={settings.fee} /></Field>
            <Field label="Способ расчёта" htmlFor="s-method"><select id="s-method" name="method" className="ax-input" defaultValue={settings.method}><option value="annuity">Равные платежи</option><option value="differentiated">Убывающие платежи</option></select></Field>
          </div>
        </section>
      </fieldset>
      {state && !state.ok ? <div className="ax-error" role="alert">{state.error}</div> : null}
      {canEdit ? <div><button className="ax-btn ax-btn-primary" disabled={pending}>{pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Сохранить</button></div> : <p className="ax-small">Менять контакты может владелец, директор или сотрудник с доступом «Настройки сайта».</p>}
      {toast ? <Toast text={toast} onDone={() => setToast("")} /> : null}
    </form>
  );
}
