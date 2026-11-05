"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { createLeadAction } from "../../../../_lib/sales-actions";
import { Field } from "../../../../_ui/forms";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="ax-btn ax-btn-primary" disabled={pending}>{pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Сохранить заявку</button>;
}

export function NewLeadForm({ models }: { models: { slug: string; label: string }[] }) {
  const [state, action] = useActionState(createLeadAction, null);
  return (
    <form action={action}>
      <div className="ax-grid ax-g2" style={{ gap: 12 }}>
        <Field label="Имя" htmlFor="ld-name"><input id="ld-name" name="name" className="ax-input" required minLength={2} /></Field>
        <Field label="Телефон" htmlFor="ld-phone"><input id="ld-phone" name="phone" className="ax-input" inputMode="tel" required placeholder="+996 555 12 34 56" /></Field>
        <Field label="Откуда" htmlFor="ld-src">
          <select id="ld-src" name="source" className="ax-input" defaultValue="phone">
            <option value="phone">Звонок</option><option value="office">Визит в офис</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option>
            <option value="exhibition">Выставка</option><option value="referral">Рекомендация</option><option value="lalafo">Lalafo</option><option value="other">Другое</option>
          </select>
        </Field>
        <Field label="Модель (если известна)" htmlFor="ld-model">
          <select id="ld-model" name="model" className="ax-input" defaultValue=""><option value="">Не выбрана</option>{models.map((m) => <option key={m.slug} value={m.slug}>{m.label}</option>)}</select>
        </Field>
      </div>
      <Field label="Комментарий" htmlFor="ld-comment"><textarea id="ld-comment" name="comment" className="ax-input" placeholder="Нужен трактор под 150 га, интересует лизинг" /></Field>
      {state && !state.ok ? <div className="ax-error" role="alert" style={{ marginBottom: 10 }}>{state.error}</div> : null}
      <Submit />
    </form>
  );
}
