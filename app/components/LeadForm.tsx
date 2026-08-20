"use client";

import { CheckCircle2, LoaderCircle, MessageCircle } from "lucide-react";
import { FormEvent, useState } from "react";

export function LeadForm({ tractorSlug, tractorModel, compact = false }: { tractorSlug?: string; tractorModel?: string; compact?: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      message: String(form.get("message") ?? ""),
      tractorSlug,
      tractorModel,
    };
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Не удалось отправить заявку");
      setState("success");
      const text = [`Здравствуйте! Меня зовут ${payload.name}.`, tractorModel ? `Интересует трактор Changfa ${tractorModel}.` : "Хочу подобрать трактор Changfa.", payload.message].filter(Boolean).join(" ");
      window.open(`https://wa.me/996706131404?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      formElement.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось отправить заявку");
      setState("error");
    }
  }

  if (state === "success") {
    return <div className="form-success" role="status"><CheckCircle2 /><div><strong>Заявка принята</strong><p>Мы сохранили ваши контакты и открыли WhatsApp для быстрого сообщения.</p></div></div>;
  }

  return (
    <form className={`lead-form ${compact ? "compact" : ""}`} onSubmit={submit}>
      <label><span>Ваше имя</span><input name="name" minLength={2} maxLength={120} required placeholder="Например, Азамат" autoComplete="name" /></label>
      <label><span>Телефон</span><input name="phone" required placeholder="+996 ___ ___ ___" autoComplete="tel" inputMode="tel" /></label>
      {!compact ? <label className="wide"><span>Комментарий</span><textarea name="message" maxLength={1000} rows={3} placeholder="Площадь хозяйства, задачи или интересующая модель" /></label> : null}
      <label className="consent wide"><input type="checkbox" required /><span>Согласен на обработку контактных данных</span></label>
      {state === "error" ? <p className="form-error wide" role="alert">{error}</p> : null}
      <button className="primary-btn wide" type="submit" disabled={state === "loading"}>
        {state === "loading" ? <LoaderCircle className="spin" size={19} /> : <MessageCircle size={19} />}
        {state === "loading" ? "Отправляем…" : "Отправить заявку"}
      </button>
    </form>
  );
}
