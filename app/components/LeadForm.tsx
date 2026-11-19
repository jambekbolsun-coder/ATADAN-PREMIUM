"use client";

import { CheckCircle2, LoaderCircle, MessageCircle } from "lucide-react";
import { FormEvent, useState } from "react";
import { PhoneInput } from "./PhoneInput";
import { useSiteSettings } from "./SiteSettings";
import { managerWhatsAppUrl } from "../lib/whatsapp";
import { useI18n } from "./I18n";
import { Link } from "./SiteLink";

const consentCopy = {
  ru: {
    start: "Я согласен(на) на обработку данных согласно",
    link: "политике конфиденциальности",
    error: "Подтвердите согласие на обработку данных",
    whatsapp: "Продолжить в WhatsApp",
  },
  ky: {
    start: "Маалыматтарды иштетүүгө макулмун:",
    link: "купуялык саясаты",
    error: "Маалыматтарды иштетүүгө макулдукту ырастаңыз",
    whatsapp: "WhatsAppта улантуу",
  },
  en: {
    start: "I agree to data processing under the",
    link: "privacy policy",
    error: "Please confirm your consent to data processing",
    whatsapp: "Continue in WhatsApp",
  },
} as const;

export function LeadForm({
  tractorSlug,
  tractorModel,
  compact = false,
  defaultMessage = "",
  manager = false,
}: {
  tractorSlug?: string;
  tractorModel?: string;
  compact?: boolean;
  defaultMessage?: string;
  manager?: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const settings = useSiteSettings();
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [error, setError] = useState("");
  const [requestKey] = useState(() => crypto.randomUUID());
  const { t, locale } = useI18n();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "loading") return;
    setState("loading");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (form.get("consent") !== "on") {
      setError(consentCopy[locale].error);
      setState("error");
      return;
    }
    const query = new URLSearchParams(window.location.search);
    const payload = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      message: String(form.get("message") ?? ""),
      tractorSlug,
      tractorModel,
      locale,
      website: String(form.get("website") ?? ""),
      consent: true,
      consentVersion: "2026-09-09",
      consentedAt: new Date().toISOString(),
      sourcePath: window.location.pathname,
      utmSource: query.get("utm_source") || "",
      utmMedium: query.get("utm_medium") || "",
      utmCampaign: query.get("utm_campaign") || "",
      utmContent: query.get("utm_content") || "",
      utmTerm: query.get("utm_term") || "",
      region: sessionStorage.getItem("atadan-region") || "",
    };
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestKey,
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(locale === "ru" && data.error ? data.error : t("ui.lead.error"));
        setState("error");
        return;
      }
      const url = managerWhatsAppUrl(settings.phone, {
        ...payload,
        model: tractorModel,
        path: window.location.href,
      });
      setWhatsappUrl(url);
      setState("success");
      formElement.reset();
      window.location.assign(url);
    } catch {
      setError(t("ui.lead.error"));
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="form-success" role="status">
        <CheckCircle2 />
        <div>
          <strong>{t("ui.lead.successManager")}</strong>
          <a className="lead-whatsapp" href={whatsappUrl}>
            {consentCopy[locale].whatsapp}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form
      className={`lead-form ${compact ? "compact" : ""} ${state === "loading" ? "is-sending" : ""}`}
      onSubmit={submit}
      aria-busy={state === "loading"}
    >
      <label className="honeypot" aria-hidden="true">
        <span>Website</span>
        <input
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
      </label>
      <label>
        <span>{manager ? t("ui.lead.fullName") : t("lead.name")}</span>
        <input
          name="name"
          minLength={2}
          maxLength={120}
          required
          placeholder={
            manager ? t("ui.lead.fullNamePlaceholder") : t("lead.namePlaceholder")
          }
          autoComplete="name"
        />
      </label>
      <PhoneInput />
      {!compact ? (
        <label className="wide">
          <span>{manager ? t("ui.lead.description") : t("lead.message")}</span>
          <textarea
            name="message"
            maxLength={1000}
            rows={3}
            placeholder={t("lead.messagePlaceholder")}
            defaultValue={defaultMessage}
          />
        </label>
      ) : null}
      <label className="consent wide">
        <input type="checkbox" name="consent" required />
        <span>
          {consentCopy[locale].start}{" "}
          <Link href="/privacy" target="_blank">
            {consentCopy[locale].link}
          </Link>
          .
        </span>
      </label>
      {state === "error" ? (
        <p className="form-error wide" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="primary-btn wide submit-lead"
        type="submit"
        disabled={state === "loading"}
      >
        {state === "loading" ? (
          <LoaderCircle className="spin" size={19} />
        ) : (
          <MessageCircle size={19} />
        )}
        {state === "loading"
          ? t("lead.sending")
          : manager
            ? t("contacts.manager")
            : t("lead.send")}
      </button>
      <p className="lead-handoff-note wide">
        {t("ui.lead.handoff")}
      </p>
    </form>
  );
}
