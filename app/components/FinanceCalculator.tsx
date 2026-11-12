"use client";

import { PhoneInput } from "./PhoneInput";
import { successMessage } from "../lib/customer-input";
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
  convertDownPayment,
  downPaymentLimits,
  formatLeaseTerm,
  formatMonths,
  formatYears,
  LEASE_TERM_DEFAULT_MAX,
  leaseTermChoices,
  normalizeLeaseMaxMonths,
  normalizeDownPayment,
  salePrice,
  type LeaseProgram,
  type LeasePublicConfig,
} from "../lib/leasing";
import type { Tractor } from "../types";
import { useSiteSettings } from "./SiteSettings";
import { useI18n } from "./I18n";
import { approximateSomPrice, type UsdKgsRate } from "../lib/exchange-rate";
import { formatApproximateUsdPrice } from "../lib/format";
import { trackAnalyticsEvent } from "../lib/analytics-client";

const emptyConfig: LeasePublicConfig = {
  programs: [],
  models: [],
  promotions: [],
  maxMonths: LEASE_TERM_DEFAULT_MAX,
};
const percent = (value: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value) + "%";
const money = (value: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) +
  " сом";
export function FinanceCalculator({
  tractors = [],
  tractor,
  config = emptyConfig,
  usdKgsRate = null,
}: {
  tractors?: Tractor[];
  tractor?: Tractor;
  config?: LeasePublicConfig;
  usdKgsRate?: UsdKgsRate | null;
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
  // Срок: от 1 месяца до максимума из админки (по умолчанию 84). Изначально выбран максимум.
  const maxMonths = normalizeLeaseMaxMonths(config.maxMonths),
    termChoices = leaseTermChoices(maxMonths),
    [chosenMonths, setChosenMonths] = useState(maxMonths),
    months = Math.max(1, Math.min(maxMonths, chosenMonths)),
    requestKey = useRef(crypto.randomUUID());
  const selected = tractor ?? tractors.find((item) => item.slug === slug),
    fallback: LeaseProgram = {
      id: "default",
      name: "Предварительный расчёт",
      programType: "Лизинг",
      currency: "KGS",
      termsMonths: termChoices,
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
      zeroPercent: false,
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
    convertedEstimate = approximateSomPrice(selected?.approximatePriceUsd, usdKgsRate),
    basePrice = publishedPrice ?? convertedEstimate ?? estimatedPrice,
    termsUnconfirmed = !config.programs.length && settings.annualRate === null,
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
    zeroPercent = Boolean(promotion?.zeroPercent || program.zeroPercent),
    effectiveRate = model?.annualRate ?? program.annualRate,
    effectiveCommission = model?.commissionPercent ?? program.commissionPercent;
  const downRules = {
    price: basePrice,
    minPercent: minDown,
    maxPercent: program.maxDownPercent,
    minAmount: program.minDownAmount,
  };
  const downLimits = downPaymentLimits(downRules, downMode);
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
        annualRate: effectiveRate,
        fixedCommission: model?.fixedCommission ?? program.fixedCommission,
        commissionPercent: effectiveCommission,
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
          estimatedPrice: publishedPrice ? undefined : basePrice,
          priceBasis: publishedPrice ? "confirmed_som" : convertedEstimate ? "official_usd" : "manual_som",
          exchangeRate: convertedEstimate ? usdKgsRate?.value : undefined,
          exchangeRateDate: convertedEstimate ? usdKgsRate?.date : undefined,
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
        message: [`Лизинг на ${formatLeaseTerm(months)}.${config.programs.length ? ` Банк: ${program.name}.` : ""} Предварительная стоимость: ${money(basePrice)}. Первый взнос: ${money(result.downPayment)}. Платёж в месяц: ${money(result.monthly)}.`, termsUnconfirmed ? "Ставку и комиссии требуется уточнить." : "", String(form.get("city") || ""), String(form.get("comment") || "")].filter(Boolean).join("\n"),
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
          Срок лизинга от 1 до {maxMonths} месяцев. Выберите
          {config.programs.length ? " банк," : ""} срок и первый взнос ·
          платёж пересчитывается автоматически.
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
          {config.programs.length ? (
            <div className="lease-bank">
              <label>
                <span>Банк</span>
                <select
                  value={program.id}
                  onChange={(event) => {
                    const next = config.programs.find(
                      (item) => item.id === event.target.value,
                    );
                    setProgramId(event.target.value);
                    setDownMode("percent");
                    if (next) {
                      setDownValue(
                        promotion?.reducedDownPercent ??
                          model?.minDownPercent ??
                          next.minDownPercent,
                      );
                      setChosen([]);
                    }
                  }}
                >
                  {config.programs.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name} · {item.zeroPercent ? "0%" : `${percent(item.annualRate)} годовых`}
                    </option>
                  ))}
                </select>
              </label>
              <p className="lease-bank-terms">
                {zeroPercent ? "Без процентов" : `Ставка ${percent(effectiveRate)} годовых`}
                {" · "}первый взнос от {percent(minDown)}
                {" · "}
                {effectiveCommission > 0 ? `комиссия ${percent(effectiveCommission)}` : "без комиссии в %"}
              </p>
            </div>
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
                  {publishedPrice
                    ? money(publishedPrice)
                    : selected.approximatePriceUsd
                      ? `${formatApproximateUsdPrice(selected.approximatePriceUsd)} · ${basePrice ? `≈ ${money(basePrice)}` : "укажите стоимость в сомах"}`
                      : basePrice ? `≈ ${money(basePrice)}` : "Цена по запросу"} ·{" "}
                  {selected.inStock ? "в наличии" : "под заказ"}
                </span>
              </div>
            </div>
          ) : null}
          {!publishedPrice && convertedEstimate && usdKgsRate ? (
            <p className="lease-rate-note">
              Ориентировочная цена пересчитана по <a href="https://www.nbkr.kg/index1.jsp?item=1562&lang=RUS" target="_blank" rel="noreferrer">официальному курсу НБКР</a> на {usdKgsRate.date}: 1 $ = {new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 4 }).format(usdKgsRate.value)} сом. Курс и итоговая цена могут измениться.
            </p>
          ) : null}
          {!publishedPrice && !convertedEstimate ? (
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
                {selected?.approximatePriceUsd ? `${formatApproximateUsdPrice(selected.approximatePriceUsd)}. Курс сейчас недоступен: введите стоимость в сомах для предварительного расчёта.` : "Введите ориентировочную стоимость для предварительного расчёта."}
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
              Укажите стоимость в сомах, чтобы увидеть предварительный платёж,
              или запросите предложение менеджера.
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
                  setDownValue(convertDownPayment(downValue, downMode, "percent", downRules));
                  setDownMode("percent");
                }}
              >
                Процент
              </button>
              <button
                type="button"
                className={downMode === "amount" ? "active" : ""}
                onClick={() => {
                  setDownValue(convertDownPayment(downValue, downMode, "amount", downRules));
                  setDownMode("amount");
                }}
              >
                Сумма
              </button>
            </div>
            <label>
              <span>{downMode === "percent" ? "Взнос, %" : "Взнос, сом"}</span>
              <input
                type="number"
                min={downLimits.min}
                max={downLimits.max}
                step={downMode === "percent" ? 0.01 : 1}
                value={downValue}
                onChange={(event) => setDownValue(normalizeDownPayment(Number(event.target.value), downMode, downRules))}
              />
            </label>
            <input
              aria-label="Первоначальный взнос · ползунок"
              type="range"
              min={downLimits.min}
              max={downLimits.max}
              step={downMode === "percent" ? 0.01 : 1}
              value={downValue}
              onChange={(event) => setDownValue(normalizeDownPayment(Number(event.target.value), downMode, downRules))}
            />
          </fieldset>
          <fieldset className="lease-term">
            <legend>Срок лизинга</legend>
            <div className="lease-term-value" aria-live="polite">
              <CalendarClock aria-hidden />
              <span>
                <strong>{formatMonths(months)}</strong>
                <small>
                  {formatYears(months) || `можно от 1 до ${maxMonths} мес.`}
                </small>
              </span>
            </div>
            <div className="lease-term-quick" role="group" aria-label="Быстрый выбор срока">
              {termChoices.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={value === months ? "active" : ""}
                  aria-pressed={value === months}
                  onClick={() => setChosenMonths(value)}
                >
                  {value} мес.
                </button>
              ))}
            </div>
            <input
              aria-label="Срок лизинга в месяцах · ползунок"
              type="range"
              min={1}
              max={maxMonths}
              step={1}
              value={months}
              onChange={(event) =>
                setChosenMonths(
                  Math.max(1, Math.min(maxMonths, Math.round(Number(event.target.value)) || 1)),
                )
              }
            />
            <div className="lease-term-scale" aria-hidden>
              <span>1 мес.</span>
              <span>{maxMonths} мес.</span>
            </div>
          </fieldset>
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
          <span>{termsUnconfirmed ? "Базовый платёж в месяц" : "Платёж в месяц"}</span>
          <strong>
            {result ? money(result.monthly) : "Н/Д"}
            <small>{termsUnconfirmed ? "без ставки и комиссий" : "ежемесячно"}</small>
          </strong>
          <dl>
            <div>
              <dt>Цена трактора</dt>
              <dd>{basePrice ? money(basePrice) : "Н/Д"}</dd>
            </div>
            {config.programs.length ? (
              <div>
                <dt>Банк</dt>
                <dd>{program.name}</dd>
              </div>
            ) : null}
            <div>
              <dt>Срок</dt>
              <dd>{formatMonths(months)}</dd>
            </div>
            <div>
              <dt>Первый взнос</dt>
              <dd>{result ? money(result.downPayment) : "Н/Д"}</dd>
            </div>
            <div>
              <dt>К финансированию</dt>
              <dd>{result ? money(result.financed) : "Н/Д"}</dd>
            </div>
            {!termsUnconfirmed ? <div>
              <dt>Общая переплата</dt>
              <dd>{result ? money(result.overpayment) : "Н/Д"}</dd>
            </div> : null}
            <div>
              <dt>{termsUnconfirmed ? "Базовая стоимость" : "Всего по договору"}</dt>
              <dd>
                {result
                  ? money(result.contractTotal + result.downPayment)
                  : "Н/Д"}
              </dd>
            </div>
          </dl>
          <p>
            {termsUnconfirmed
              ? `Это деление ориентировочной стоимости после первого взноса на выбранный срок: ${formatMonths(months)}. Ставка, комиссии, график и итоговая сумма будут согласованы с менеджером.`
              : `${!publishedPrice ? "Расчёт по ориентировочной стоимости. " : ""}Расчёт предварительный. Финальные условия, одобрение и договор подтверждаются менеджером.`}
          </p>
          <button
            className="primary-btn"
            type="button"
            disabled={!result}
            onClick={() => {
              if (!applicationOpen && selected) trackAnalyticsEvent({ path: window.location.pathname, tractorSlug: selected.slug, eventType: "model_interest" });
              setApplicationOpen((value) => !value);
            }}
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
