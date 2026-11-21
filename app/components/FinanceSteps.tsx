"use client";

import { ArrowRight, Building2, FileSignature, KeyRound, MessageCircle, Tractor } from "lucide-react";
import { useI18n } from "./I18n";
import { useSiteSettings } from "./SiteSettings";
import { ScrollReveal } from "./ScrollReveal";

const STEPS = [
  { id: 1, Icon: Tractor },
  { id: 2, Icon: Building2 },
  { id: 3, Icon: FileSignature },
  { id: 4, Icon: KeyRound },
] as const;

/** Четыре шага покупки на странице «Лизинг»: дорожка заполняется при прокрутке, в каждом шаге «Вы» и «Мы». */
export function FinanceSteps() {
  const { t } = useI18n();
  const settings = useSiteSettings();
  const whatsapp = `https://wa.me/${settings.phone.replace(/\D/g, "")}?text=${encodeURIComponent("Здравствуйте! Хочу узнать про лизинг трактора Changfa. Модель: ")}`;
  return (
    <ScrollReveal as="section" className="fin-steps-v5" aria-labelledby="fin-steps-title">
      <div className="fin-steps-head">
        <div><span className="section-label">{t("ui.fin.label")}</span><h2 id="fin-steps-title">{t("ui.fin.title")}</h2></div>
        <div className="fin-steps-cta">
          <a className="primary-btn" href="#finance-calculator">{t("ui.fin.calc")}<ArrowRight size={18} aria-hidden /></a>
          <a className="ghost-btn" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden />{t("ui.fin.ask")}</a>
        </div>
      </div>
      <div className="fin-steps-track" aria-hidden><i /></div>
      <ol>
        {STEPS.map(({ id, Icon }) => (
          <li key={id} data-reveal style={{ "--step": id - 1 } as React.CSSProperties}>
            <div className="fin-step-top"><span className="fin-step-icon"><Icon size={24} aria-hidden /></span><small>{String(id).padStart(2, "0")}</small></div>
            <h3>{t(`ui.fin.s${id}`)}</h3>
            <dl>
              <div><dt>{t("ui.fin.you")}</dt><dd>{t(`ui.fin.s${id}you`)}</dd></div>
              <div><dt>{t("ui.fin.we")}</dt><dd>{t(`ui.fin.s${id}we`)}</dd></div>
            </dl>
          </li>
        ))}
      </ol>
    </ScrollReveal>
  );
}
