"use client";

import { PhoneInput } from "./PhoneInput";
import { LEASE_MONTHS, successMessage } from "../lib/customer-input";
import { managerWhatsAppUrl } from "../lib/whatsapp";
import Image from "next/image";
import {
  BadgePercent,
  Calculator,
  CalendarClock,
  Check,
  ChevronDown,
  FileText,
  Send,
} from "lucide-react";
import { FormEvent, useId, useRef, useState } from "react";
import {
  calculateInstallment,
  salePrice,
  type LeaseProgram,
  type LeasePublicConfig,
} from "../lib/leasing";
import type { Tractor } from "../types";
import { useSiteSettings } from "./SiteSettings";
import { useI18n } from "./I18n";

const emptyConfig: LeasePublicConfig = {
  programs: [],
  models: [],
  promotions: [],
};
const money = (value: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) +
  " сом";
export function FinanceCalculator({
  tractors = [],
  tractor,
  config = emptyConfig,
}: {
  tractors?: Tractor[];
  tractor?: Tractor;
  config?: LeasePublicConfig;
}) {
  const settings = useSiteSettings(),
    headingId = useId(),
    [slug, setSlug] = useState(tractor?.slug ?? tractors[0]?.slug ?? ""),
    [programId, setProgramId] = useState(config.programs[0]?.id ?? "default"),
    [downMode, setDownMode] = useState<"percent" | "amount">("percent"),
    [downValue, setDownValue] = useState(
      config.programs[0]?.minDownPercent ?? settings.downPercent,
    ),
    [chosen, setChosen] = useState<string[]>([]),
    [scheduleOpen, setScheduleOpen] = useState(false),
    [applicationOpen, setApplicationOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const { locale } = useI18n();
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const months = LEASE_MONTHS,
    requestKey = useRef(crypto.randomUUID());
  const selected = tractor ?? tractors.find((item) => item.slug === slug),
    fallback: LeaseProgram = {
      id: "default",
      name: "Стандартные условия",
      programType: "Лизинг",
      currency: "KGS",
      termsMonths: [LEASE_MONTHS],
      minDownPercent: settings.downPercent,
      maxDownPercent: 90,
      minDownAmount: 0,
      downPaymentMode: "Оба варианта",
      markupPercent: 0,
      annualRate: settings.annualRate ?? 0,
      fixedCommission: settings.fee,
      commissionPercent: 0,
      insurance: 0,
      processingFee: 0,
      delivery: 0,
      includeDelivery: true,
      includeInsurance: false,
      includeCommission: true,
      discountOrder: "before",
      rounding: 1,
      zeroPercent: (settings.annualRate ?? 0) === 0,
      options: [],
      notes: "",
    };
  const program =
      config.programs.find((item) => item.id === programId) ??
      config.programs[0] ??
      fallback,
    model = config.models.find((item) => item.tractorSlug === selected?.slug),
    promotion = config.promotions.find(
      (item) =>
        !item.tractorSlugs.length ||
        item.tractorSlugs.includes(selected?.slug ?? ""),
    );
  const publishedPrice =
      model?.price ??
      salePrice(selected?.price ?? null, selected?.discountPercent ?? 0),
    basePrice = publishedPrice ?? estimatedPrice,
    options = model?.options?.length ? model.options : program.options,
    selectedOptions = options.filter((item) => chosen.includes(item.name));
  const discount =
      model?.discount ??
      (promotion
        ? promotion.discountType === "percent"
          ? (basePrice * promotion.discount) / 100
          : promotion.discount
        : 0),
    minDown =
      promotion?.reducedDownPercent ??
      model?.minDownPercent ??
      program.minDownPercent,
    zeroPercent = Boolean(promotion?.zeroPercent || program.zeroPercent);
  let result: ReturnType<typeof calculateInstallment> | null = null,
    calculationError = "";
  try {
    if (basePrice > 0 && model?.enabled !== false)
      result = calculateInstallment({
        price: basePrice,
        options: selectedOptions,
        delivery: program.delivery,
        discount,
        downMode,
        downValue,
        months,
        markupPercent: model?.markupPercent ?? program.markupPercent,
        annualRate: model?.annualRate ?? program.annualRate,
        fixedCommission: model?.fixedCommission ?? program.fixedCommission,
        commissionPercent:
          model?.commissionPercent ?? program.commissionPercent,
        insurance: program.insurance,
        processingFee: program.processingFee,
        includeDelivery: program.includeDelivery,
        includeInsurance: program.includeInsurance,
        includeCommission: program.includeCommission,
        discountOrder: program.discountOrder,
        rounding: program.rounding,
        zeroPercent,
      });
  } catch (cause) {
    calculationError =
      cause instanceof Error ? cause.message : "Проверьте условия";
  }
  function chooseModel(value: string) {
    setSlug(value);
    setEstimatedPrice(0);
    setDownMode("percent");
    setChosen([]);
    const next = config.models.find((item) => item.tractorSlug === value);
    setDownValue(next?.minDownPercent ?? program.minDownPercent);
  }
  function toggleOption(name: string) {
    setChosen((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !result || busy) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/leasing-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestKey.current,
        },
        body: JSON.stringify({
          name: form.get("name"),
          phone: form.get("phone"),
          city: form.get("city"),
          comment: form.get("comment"),
          consent: form.get("consent") === "on",
          tractorSlug: selected.slug,
          programId: program.id,
          downMode,
          downValue,
          months,
          estimatedPrice: publishedPrice ? undefined : estimatedPrice,
          options: chosen,
          sourcePath: window.location.pathname,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(body.error || "Не удалось отправить заявку");
      setNotice(successMessage);
      setApplicationOpen(false);
      requestKey.current = crypto.randomUUID();
      window.location.assign(managerWhatsAppUrl(settings.phone, {
        name: String(form.get("name") || ""), phone: String(form.get("phone") || ""), model: selected.model,
        message: [`Лизинг на 7 лет. Первый взнос: ${money(result.downPayment)}.`, String(form.get("city") || ""), String(form.get("comment") || "")].filter(Boolean).join("\n"),
        path: window.location.href,
      }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Нет соединения. Попробуйте ещё раз.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="lease-workspace lease-workspace-pro"
      data-locale={locale}
      id={tractor ? "leasing" : undefined}
      aria-labelledby={headingId}
    >
      <header className="lease-heading">
        <span className="section-label">
          <Calculator size={18} />
          Лизинг и рассрочка
        </span>
        <h2 id={headingId}>
          {selected
            ? `Рассчитайте Changfa ${selected.model}`
            : "Предварительный расчёт"}
        </h2>
        <p>
          Лизинг на 7 лет. Двигайте ползунок первого взноса · платёж
          пересчитывается автоматически.
        </p>
      </header>
      <div className="lease-layout">
        <div className="lease-controls">
          {!tractor && tractors.length ? (
            <label>
              <span>Модель трактора</span>
              <select
                value={slug}
                onChange={(event) => chooseModel(event.target.value)}
              >
                {tractors.map((item) => (
                  <option value={item.slug} key={item.slug}>
                    Changfa {item.model} · {item.hp} л.с.
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {config.programs.length > 1 ? (
            <label>
              <span>Программа</span>
              <select
                value={program.id}
                onChange={(event) => {
                  const next = config.programs.find(
                    (item) => item.id === event.target.value,
                  );
                  setProgramId(event.target.value);
                  setDownMode("percent");
                  if (next) {
                    setDownValue(next.minDownPercent);
                    setChosen([]);
                  }
                }}
              >
                {config.programs.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name} · {item.programType}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {selected ? (
            <div className="lease-selected">
              <Image
                src={selected.image}
                alt={`Changfa ${selected.model}`}
                width={160}
                height={120}
              />
              <div>
                <small>Выбранная модель</small>
                <strong>Changfa {selected.model}</strong>
                <span>
                  {basePrice ? money(basePrice) : "Цена по запросу"} ·{" "}
                  {selected.inStock ? "в наличии" : "под заказ"}
                </span>
              </div>
            </div>
          ) : null}
          {!publishedPrice ? (
            <label className="lease-estimate">
              <span>Ориентировочная стоимость, сом</span>
              <input
                type="number"
                min="1"
                max="500000000"
                step="1000"
                value={estimatedPrice || ""}
                onChange={(event) =>
                  setEstimatedPrice(
                    Math.max(
                      0,
                      Math.min(500000000, Number(event.target.value) || 0),
                    ),
                  )
                }
                placeholder="Введите стоимость для расчёта"
              />
              <small>
                Цена модели по запросу. Введённая сумма используется только для
                предварительного расчёта.
              </small>
            </label>
          ) : null}
          {promotion ? (
            <div className="lease-promotion">
              <BadgePercent />
              <div>
                <strong>{promotion.name}</strong>
                <span>
                  {promotion.zeroPercent ? "0% рассрочка · " : ""}
                  {promotion.gift || `Скидка ${money(discount)}`}
                </span>
              </div>
            </div>
          ) : null}
          {!basePrice ? (
            <p className="lease-help">
              Цена этой модели пока не опубликована. Получите предложение
              менеджера.
            </p>
          ) : null}
          {model?.enabled === false ? (
            <p className="lease-help">
              Для этой модели программа сейчас недоступна.
            </p>
          ) : null}
          <fieldset className="lease-down">
            <legend>Первоначальный взнос</legend>
            <div className="lease-segmented">
              <button
                type="button"
                className={downMode === "percent" ? "active" : ""}
                onClick={() => {
                  setDownMode("percent");
                  setDownValue(minDown);
                }}
              >
                Процент
              </button>
              <button
                type="button"
                className={downMode === "amount" ? "active" : ""}
                onClick={() => {
                  setDownMode("amount");
                  setDownValue(
                    Math.max(
                      program.minDownAmount,
                      Math.ceil((basePrice * minDown) / 100),
                    ),
                  );
                }}
              >
                Сумма
              </button>
            </div>
            <label>
              <span>{downMode === "percent" ? "Взнос, %" : "Взнос, сом"}</span>
              <input
                type="number"
                min={
                  downMode === "percent"
                    ? minDown
                    : Math.max(
                        program.minDownAmount,
                        Math.ceil((basePrice * minDown) / 100),
                      )
                }
                max={
                  downMode === "percent"
                    ? program.maxDownPercent
                    : Math.floor((basePrice * program.maxDownPercent) / 100)
                }
                step={downMode === "percent" ? 1 : 1000}
                value={downValue}
                onChange={(event) => setDownValue(Number(event.target.value))}
              />
            </label>
            <input
              aria-label="Первоначальный взнос · ползунок"
              type="range"
              min={
                downMode === "percent"
                  ? minDown
                  : Math.max(
                      program.minDownAmount,
                      Math.ceil((basePrice * minDown) / 100),
                    )
              }
              max={
                downMode === "percent"
                  ? program.maxDownPercent
                  : Math.floor((basePrice * program.maxDownPercent) / 100)
              }
              step={downMode === "percent" ? 1 : 1}
              value={downValue}
              onChange={(event) => setDownValue(Number(event.target.value))}
            />
          </fieldset>
          <div className="lease-fixed-term">
            <CalendarClock />
            <span>
              Срок лизинга<strong>7 лет</strong>
            </span>
          </div>
          {options.length ? (
            <fieldset className="lease-options">
              <legend>Дополнительные опции</legend>
              {options.map((option) => (
                <label key={option.name}>
                  <input
                    type="checkbox"
                    checked={chosen.includes(option.name)}
                    onChange={() => toggleOption(option.name)}
                  />
                  <span>
                    {option.name}
                    <strong>+ {money(option.price)}</strong>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}
          {program.notes || model?.notes ? (
            <p className="lease-help">{model?.notes || program.notes}</p>
          ) : null}
        </div>
        <aside className="lease-summary" aria-live="polite">
          <span>Платёж в месяц</span>
          <strong>
            {result ? money(result.monthly) : "Н/Д"}
            <small>ежемесячно</small>
          </strong>
          <dl>
            <div>
              <dt>Цена трактора</dt>
              <dd>{basePrice ? money(basePrice) : "Н/Д"}</dd>
            </div>
            <div>
              <dt>Первый взнос</dt>
              <dd>{result ? money(result.downPayment) : "Н/Д"}</dd>
            </div>
            <div>
              <dt>К финансированию</dt>
              <dd>{result ? money(result.financed) : "Н/Д"}</dd>
            </div>
            <div>
              <dt>Общая переплата</dt>
              <dd>{result ? money(result.overpayment) : "Н/Д"}</dd>
            </div>
            <div>
              <dt>Всего по договору</dt>
              <dd>
                {result
                  ? money(result.contractTotal + result.downPayment)
                  : "Н/Д"}
              </dd>
            </div>
          </dl>
          <p>
            {!publishedPrice ? "Расчёт по указанной вами стоимости. " : ""}
            Расчёт является предварительным. Финальные условия, одобрение и
            договор подтверждаются менеджером.
          </p>
          <button
            className="primary-btn"
            type="button"
            disabled={!result}
            onClick={() => setApplicationOpen((value) => !value)}
          >
            <Send size={18} />
            Оставить заявку
          </button>
        </aside>
      </div>
      {applicationOpen && result ? (
        <form className="lease-application" onSubmit={submit}>
          <div>
            <span>Заявка на Changfa {selected?.model}</span>
            <h3>Контакты для заявки</h3>
          </div>
          <label>
            <span>Имя</span>
            <input name="name" required minLength={2} />
          </label>
          <PhoneInput />
          <label>
            <span>Город или район</span>
            <input name="city" required />
          </label>
          <label className="full">
            <span>Комментарий</span>
            <textarea name="comment" rows={3} />
          </label>
          <label className="lease-consent full">
            <input name="consent" type="checkbox" required />
            <span>Согласен на обработку данных для связи по заявке.</span>
          </label>
          <button className="primary-btn" disabled={busy} type="submit">
            <Send />
            {busy ? "Отправляем…" : "Отправить заявку"}
          </button>
        </form>
      ) : null}
      {notice ? (
        <p className="form-success" role="status">
          <Check />
          {notice}
        </p>
      ) : null}
      {error || calculationError ? (
        <p className="form-error" role="alert">
          {error || calculationError}
        </p>
      ) : null}
      {result ? (
        <div className="lease-schedule">
          <button
            type="button"
            aria-expanded={scheduleOpen}
            onClick={() => setScheduleOpen((value) => !value)}
          >
            <FileText />
            Предварительный график платежей
            <ChevronDown />
          </button>
          {scheduleOpen ? (
            <div
              className="table-scroll"
              role="region"
              aria-label="Предварительный график платежей"
            >
              <table>
                <thead>
                  <tr>
                    <th>Месяц</th>
                    <th>Платёж</th>
                    <th>Остаток</th>
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.map((row) => (
                    <tr key={row.month}>
                      <td>{row.month}</td>
                      <td>{money(row.payment)}</td>
                      <td>{money(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
