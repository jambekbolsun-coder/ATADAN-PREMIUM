"use client";

import { Bot, ChevronRight, MessageCircle, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { powerRanges, regions } from "../lib/customer-input";
import { useRouter } from "next/navigation";
import { useI18n } from "./I18n";
import { useSiteSettings } from "./SiteSettings";
import { Instagram, WhatsApp } from "./BrandIcons";
import { PRIVACY_CHOICE_EVENT, PRIVACY_CHOICE_KEY } from "./CookieConsent";

const ui = {
  ru: {
    title: "Подберём трактор за минуту",
    text: "Ответьте на два коротких вопроса, и мы покажем подходящую мощность.",
    start: "Начать подбор",
    later: "Не сейчас",
    area: "Какая площадь хозяйства?",
    work: "Какие работы главные?",
    priority: "Что важнее всего?",
    back: "Назад",
    result: "Подходящий диапазон",
    show: "Показать модели",
    faq: "Помощник ATADAN",
    faqText: "Короткие ответы перед разговором с менеджером.",
    q: ["Есть гарантия?", "Можно оформить лизинг?", "Есть сервисное обслуживание?"],
    a: [
      "Да, условия гарантии фиксируются для выбранной модели и комплектации.",
      "Да. Калькулятор показывает предварительный график на 7 лет, финальные условия подтверждает финансовый партнёр.",
      "Да. ATADAN помогает с обслуживанием и диагностикой техники.",
    ],
    ask: "Написать менеджеру",
  },
  ky: {
    title: "Тракторду бир мүнөттө тандайбыз",
    text: "Эки кыска суроого жооп бериңиз, биз ылайыктуу кубаттуулукту көрсөтөбүз.",
    start: "Тандоону баштоо",
    later: "Азыр эмес",
    area: "Чарбанын аянты канча?",
    work: "Негизги жумуш кайсы?",
    priority: "Эмнеси маанилүү?",
    back: "Артка",
    result: "Ылайыктуу диапазон",
    show: "Моделдерди көрүү",
    faq: "ATADAN жардамчысы",
    faqText: "Менеджерге чейин кыска жооптор.",
    q: ["Кепилдик барбы?", "Лизинг барбы?", "Сервистик тейлөө барбы?"],
    a: [
      "Ооба, кепилдик шарттары тандалган модель жана комплектация үчүн бекитилет.",
      "Ооба. Калькулятор 7 жылдык болжолдуу графикти көрсөтөт, акыркы шарттарды каржы өнөктөшү бекитет.",
      "Ооба. ATADAN техниканы тейлөөгө жана диагностикалоого жардам берет.",
    ],
    ask: "Менеджерге жазуу",
  },
  en: {
    title: "Find your tractor in a minute",
    text: "Answer two short questions and see a suitable power range.",
    start: "Start selection",
    later: "Not now",
    area: "How large is the farm?",
    work: "What is the main job?",
    priority: "What matters most?",
    back: "Back",
    result: "Suggested power range",
    show: "View models",
    faq: "ATADAN assistant",
    faqText: "Quick answers before you speak with a manager.",
    q: [
      "Is there a warranty?",
      "Is leasing available?",
      "Do you provide maintenance service?",
    ],
    a: [
      "Yes. Warranty terms are confirmed for the selected model and configuration.",
      "Yes. The calculator shows a preliminary schedule over 7 years; final terms come from the finance partner.",
      "Yes. ATADAN helps with machinery maintenance and diagnostics.",
    ],
    ask: "Message a manager",
  },
} as const;
export type SiteFaq = {
  id: string;
  question: string;
  answer: string;
  buttonLabel?: string;
  buttonUrl?: string;
};
export function SiteAssist({ faqs = [] }: { faqs?: SiteFaq[] }) {
  const { locale } = useI18n(),
    l = ui[locale],
    settings = useSiteSettings();
  const [quiz, setQuiz] = useState(false),
    [assistant, setAssistant] = useState(false),
    [step, setStep] = useState(0);
  const quizRef = useRef<HTMLElement>(null);
  const assistantRef = useRef<HTMLElement>(null);
  const assistantTrigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const [powerIndex, setPowerIndex] = useState(0);
  const [faq, setFaq] = useState<number | null>(null);
  useEffect(() => {
    if (!assistant) return;
    const trigger = assistantTrigger.current;
    assistantRef.current
      ?.querySelector<HTMLButtonElement>("header button")
      ?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAssistant(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [assistant]);
  useEffect(() => {
    let timer: number | undefined;
    const schedule = () => {
      if (
        !window.localStorage.getItem(PRIVACY_CHOICE_KEY) ||
        window.sessionStorage.getItem("atadan-quiz-seen")
      )
        return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!document.querySelector('[aria-modal="true"]')) setQuiz(true);
      }, 7000);
    };
    const dismiss = () => {
      window.clearTimeout(timer);
      window.sessionStorage.setItem("atadan-quiz-seen", "1");
      setQuiz(false);
    };
    schedule();
    window.addEventListener(PRIVACY_CHOICE_EVENT, schedule);
    window.addEventListener("atadan:dialog-open", dismiss);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(PRIVACY_CHOICE_EVENT, schedule);
      window.removeEventListener("atadan:dialog-open", dismiss);
    };
  }, []);
  useEffect(() => {
    if (!quiz) return;
    const dialog = quizRef.current,
      previous =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(
      () => dialog?.querySelector<HTMLElement>("button,a")?.focus(),
      0,
    );
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeQuiz();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>("button:not([disabled]),a[href]"),
      );
      const first = controls[0],
        last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [quiz]);
  function closeQuiz() {
    sessionStorage.setItem("atadan-quiz-seen", "1");
    setQuiz(false);
  }
  const whatsapp = "https://wa.me/" + settings.phone.replace(/\D/g, "");

  const questions: SiteFaq[] = faqs.length
    ? faqs
    : l.q.map((question, index) => ({
        id: `default-${index}`,
        question,
        answer: l.a[index],
      }));
  return (
    <>
      <div className="site-assist">
        {assistant ? (
          <section
            className="assist-panel"
            ref={assistantRef}
            data-lenis-prevent
            id="atadan-assistant"
            role="dialog"
            aria-label={l.faq}
          >
            <header>
              <div>
                <Bot aria-hidden="true" />
                <span>
                  <strong>{l.faq}</strong>
                  <small>{l.faqText}</small>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAssistant(false)}
                aria-label="Закрыть"
              >
                <X />
              </button>
            </header>
            <div>
              {questions.map((item, index) => (
                <article key={item.id}>
                  <button
                    type="button"
                    aria-expanded={faq === index}
                    onClick={() => setFaq(faq === index ? null : index)}
                  >
                    {item.question}
                    <ChevronRight />
                  </button>
                  {faq === index ? (
                    <p>
                      {item.answer}
                      {item.buttonUrl ? (
                        <a
                          href={item.buttonUrl}
                          target={
                            item.buttonUrl.startsWith("http")
                              ? "_blank"
                              : undefined
                          }
                          rel={
                            item.buttonUrl.startsWith("http")
                              ? "noreferrer"
                              : undefined
                          }
                        >
                          {item.buttonLabel || "Подробнее"}
                        </a>
                      ) : null}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
            <a href={whatsapp} target="_blank" rel="noreferrer">
              <MessageCircle />
              {l.ask}
            </a>
          </section>
        ) : null}
        <a
          className="assist-instagram"
          href={settings.instagram}
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram ATADAN"
        >
          <Instagram size={21} />
        </a>
        <a
          className="assist-whatsapp"
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
        >
          <WhatsApp size={22} />
        </a>
        <button
          className="assist-bot"
          ref={assistantTrigger}
          type="button"
          aria-label={l.faq}
          aria-expanded={assistant}
          aria-controls="atadan-assistant"
          onClick={() => setAssistant((v) => !v)}
        >
          <span className="assist-bot-symbol">
            <Bot aria-hidden="true" />
            <Sparkles aria-hidden="true" />
          </span>
        </button>
      </div>
      {quiz ? (
        <div className="quiz-overlay">
          <button
            className="quiz-backdrop"
            tabIndex={-1}
            type="button"
            onClick={closeQuiz}
            aria-label={l.later}
          />
          <section
            ref={quizRef}
            className="tractor-quiz"
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-title"
          >
            <button
              className="quiz-close"
              type="button"
              onClick={closeQuiz}
              aria-label={l.later}
            >
              <X />
            </button>
            <span className="quiz-icon">
              <Sparkles />
            </span>
            <div
              className="quiz-progress"
              aria-label={`Вопрос ${step + 1} из 2`}
            >
              <i style={{ width: `${(step + 1) * 50}%` }} />
            </div>
            <p>Вопрос {step + 1} из 2</p>
            <h2 id="quiz-title">
              {step === 0
                ? "Какой мощности трактор вам нужен?"
                : "Из какого вы региона?"}
            </h2>
            <div className="quiz-options">
              {step === 0
                ? powerRanges.map((range, index) => (
                    <button
                      type="button"
                      key={range.label}
                      onClick={() => {
                        setPowerIndex(index);
                        setStep(1);
                      }}
                    >
                      {range.label}
                      <ChevronRight />
                    </button>
                  ))
                : regions.map((region) => (
                    <button
                      type="button"
                      key={region}
                      onClick={() => {
                        sessionStorage.setItem("atadan-region", region);
                        window.dispatchEvent(new Event("atadan:region"));
                        closeQuiz();
                        router.push(
                          `/catalog?power=${powerRanges[powerIndex].query}`,
                        );
                      }}
                    >
                      {region}
                      <ChevronRight />
                    </button>
                  ))}
            </div>
            {step === 1 ? (
              <button
                className="quiz-later"
                type="button"
                onClick={() => setStep(0)}
              >
                {l.back}
              </button>
            ) : (
              <button className="quiz-later" type="button" onClick={closeQuiz}>
                {l.later}
              </button>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
