"use client";

import { ChevronRight, MessageCircle, MessageCircleQuestionMark, Sparkles, X } from "lucide-react";
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
      "Да. Калькулятор показывает предварительный график на выбранный срок и по ставке выбранного банка, финальные условия подтверждает финансовый партнёр.",
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
      "Ооба. Калькулятор тандалган мөөнөткө жана банктын пайызына жараша болжолдуу графикти көрсөтөт, акыркы шарттарды каржы өнөктөшү бекитет.",
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
      "Yes. The calculator shows a preliminary schedule for the chosen term and bank rate; final terms come from the finance partner.",
      "Yes. ATADAN helps with machinery maintenance and diagnostics.",
    ],
    ask: "Message a manager",
  },
} as const;
const regionKeys: Record<(typeof regions)[number], string> = {
  "Баткенская область": "ui.region.batken",
  "Джалал-Абадская область": "ui.region.jalalabad",
  "Иссык-Кульская область": "ui.region.issykkul",
  "Нарынская область": "ui.region.naryn",
  "Ошская область": "ui.region.osh",
  "Таласская область": "ui.region.talas",
  "Чуйская область": "ui.region.chuy",
  "г. Бишкек": "ui.region.bishkekCity",
  "г. Ош": "ui.region.oshCity",
};
export type SiteFaq = {
  id: string;
  question: string;
  answer: string;
  buttonLabel?: string;
  buttonUrl?: string;
};
export type LeaseSummary = { banks: string[]; minDown: number; maxMonths: number };

type Topic = "leasing" | "price" | "choose" | "service" | "more";
type TopicItem = { id: string; question: string; answer: string; href?: string; label?: string };

/** Готовые вопросы по темам. Цифры лизинга берутся из админки (банки, минимальный взнос, срок). */
function topicItems(t: (key: string, values?: Record<string, string | number>) => string, lease: LeaseSummary | null): Record<Exclude<Topic, "more">, TopicItem[]> {
  const item = (id: string, values?: Record<string, string | number>, href?: string, label?: string): TopicItem => ({ id, question: t(`ui.chat.${id}q`), answer: t(`ui.chat.${id}a`, values), href, label });
  const banks = lease?.banks.length ? lease.banks.join(", ") : "";
  const leasing = [
    banks ? item("l1", { banks }, "/finance", t("ui.fin.calc")) : { ...item("l1"), answer: t("ui.chat.l1a0"), href: "/finance", label: t("ui.fin.calc") },
    ...(lease?.minDown ? [item("l2", { down: lease.minDown }, "/finance", t("ui.fin.calc"))] : []),
    ...(lease?.maxMonths ? [item("l3", { months: lease.maxMonths })] : []),
    item("l4"),
    item("l5"),
  ];
  return {
    leasing,
    price: [item("p1"), item("p2", undefined, "/catalog", t("home.allModels")), item("p3", undefined, "/catalog", t("home.allModels")), item("p4")],
    choose: [item("c1", undefined, "/catalog", t("home.allModels")), item("c2"), item("c3", undefined, "/catalog", t("home.allModels")), item("c4", undefined, "/contacts", t("nav.contacts"))],
    service: [item("s1", undefined, "/service", t("nav.service")), item("s2", undefined, "/parts", t("nav.parts")), item("s3"), item("s4")],
  };
}

export function SiteAssist({ faqs = [], lease = null }: { faqs?: SiteFaq[]; lease?: LeaseSummary | null }) {
  const { locale, t } = useI18n(),
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
  const [faq, setFaq] = useState<string | null>(null);
  const [topic, setTopic] = useState<Topic>("leasing");
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

  const byTopic = topicItems(t, lease);
  const extra: TopicItem[] = faqs.map((item) => ({ id: `faq-${item.id}`, question: item.question, answer: item.answer, href: item.buttonUrl, label: item.buttonLabel }));
  const topics: Topic[] = ["leasing", "price", "choose", "service", ...(extra.length ? ["more" as const] : [])];
  const questions: TopicItem[] = topic === "more" ? extra : byTopic[topic];
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
                <span className="assist-head-icon"><MessageCircleQuestionMark aria-hidden="true" /><i aria-hidden="true" /></span>
                <span>
                  <strong>{l.faq}</strong>
                  <small>{l.faqText}</small>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAssistant(false)}
                aria-label={t("ui.common.close")}
              >
                <X />
              </button>
            </header>
            <nav className="assist-topics" aria-label={l.faq}>
              {topics.map((id) => (
                <button key={id} type="button" aria-pressed={topic === id} onClick={() => { setTopic(id); setFaq(null); }}>{t(`ui.chat.topic.${id}`)}</button>
              ))}
            </nav>
            <div>
              {questions.map((item) => (
                <article key={item.id}>
                  <button type="button" aria-expanded={faq === item.id} onClick={() => setFaq(faq === item.id ? null : item.id)}>
                    {item.question}
                    <ChevronRight />
                  </button>
                  {faq === item.id ? (
                    <p>
                      {item.answer}
                      {item.href ? (
                        <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noreferrer" : undefined}>
                          {item.label || t("product.details")}
                        </a>
                      ) : null}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
            <p className="assist-notfound">{t("ui.chat.notFound")}</p>
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
            <MessageCircleQuestionMark aria-hidden="true" />
          </span>
          <span className="assist-bot-label" aria-hidden="true">{t("ui.chat.button")}</span>
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
              aria-label={t("ui.quiz.step", { current: step + 1, total: 2 })}
            >
              <i style={{ width: `${(step + 1) * 50}%` }} />
            </div>
            <p>{t("ui.quiz.step", { current: step + 1, total: 2 })}</p>
            <h2 id="quiz-title">
              {step === 0 ? t("ui.quiz.power") : t("ui.quiz.region")}
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
                      {range.max >= 999
                        ? `${range.min}+ ${t("common.hp")}`
                        : `${range.min}–${range.max} ${t("common.hp")}`}
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
                      {t(regionKeys[region])}
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
