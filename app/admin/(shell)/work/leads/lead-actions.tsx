"use client";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ActionButton, ActionDialog, Field } from "../../../_ui/forms";
import { reopenLeadAction, rejectLeadAction, takeLeadAction } from "../../../_lib/sales-actions";

const REASONS: Record<string, string> = {
  price: "Дорого", financing: "Не одобрили лизинг / нет денег", competitor: "Купил у другого", timing: "Отложил покупку",
  no_contact: "Не дозвонились", model: "Нет нужной модели", duplicate: "Повторная заявка", other: "Другое",
};

export function LeadActions({ leadId, status, hasSale, phone }: { leadId: string; status: string; hasSale: boolean; phone: string }) {
  const wa = phone.replace(/\D/g, "");
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
      {status !== "closed" && wa.length >= 9 ? (
        <a className="ax-btn ax-btn-sm" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><MessageCircle size={16} aria-hidden />WhatsApp</a>
      ) : null}
      {status === "new" ? <ActionButton label="Взять в работу" className="ax-btn-sm" action={() => takeLeadAction(leadId)} /> : null}
      {status !== "closed" ? <Link className="ax-btn ax-btn-sm ax-btn-primary" href={`/admin/work/sales/new?lead=${leadId}`}>Оформить продажу</Link> : null}
      {status !== "closed" ? (
        <ActionDialog label="Отказ" triggerClass="ax-btn-sm" title="Закрыть заявку" description="Причина нужна для отчёта: почему клиенты не покупают." action={rejectLeadAction.bind(null, leadId)} submitLabel="Закрыть заявку" variant="danger">
          <Field label="Причина" htmlFor={`rr-${leadId}`}>
            <select id={`rr-${leadId}`} name="code" className="ax-input" required defaultValue="">
              <option value="" disabled>Выберите причину</option>
              {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Комментарий" htmlFor={`rn-${leadId}`}><input id={`rn-${leadId}`} name="note" className="ax-input" placeholder="Купил МТЗ у соседа" /></Field>
        </ActionDialog>
      ) : null}
      {status === "closed" && !hasSale ? <ActionButton label="Вернуть в работу" className="ax-btn-sm" action={() => reopenLeadAction(leadId)} /> : null}
    </div>
  );
}
