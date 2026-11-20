"use client";

import { PhoneInput } from "./PhoneInput";
import { successMessage } from "../lib/customer-input";
import { managerWhatsAppUrl } from "../lib/whatsapp";
import Image from "next/image";
import {
  BadgePercent,
  Calculator,
  CalendarClock,
  CalendarRange,
  Check,
  ChevronDown,
  Coins,
  ExternalLink,
  FileText,
  Landmark,
  MessageCircle,
  PiggyBank,
  Scale,
  Sprout,
} from "lucide-react";
import { FormEvent, useId, useRef, useState } from "react";
import {
  calculateInstallment,
  convertDownPayment,
  LEASE_SCHEDULE_INFO,
  LEASE_SCHEDULES,
  leaseScheduleProblem,
  type InstallmentInput,
  type LeaseSchedule,
  downPaymentLimits,
  formatLeaseTerm,
  formatMonths,
  formatYearCount,
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
import { bestProgramId } from "../lib/lease-preview";

const emptyConfig: LeasePublicConfig = {
  programs: [],
  models: [],
  promotions: [],
  maxMonths: LEASE_TERM_DEFAULT_MAX,
};
// Сообщение менеджеру в WhatsApp всегда на русском (его читают менеджеры), поэтому здесь свои русские форматтеры.
const ruPercent = (value: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value) + "%";
const ruMoney = (value: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) +
  " сом";
type Installment = ReturnType<typeof calculateInstallment>;
/** Обычный платёж (для льготного периода: первый после льготы). */
const regularRow = (r: Installment) => r.schedule[Math.min(r.graceMonths, r.schedule.length - 1)];
function ruPaymentText(r: Installment) {
  if (r.scheduleKind === "grace") return `${r.graceMonths} мес. по ${ruMoney(r.firstPayment)}, потом ${ruMoney(r.monthly)}`;
  if (r.scheduleKind === "differentiated") return `от ${ruMoney(r.firstPayment)} до ${ruMoney(r.lastPayment)}`;
  return `${ruMoney(r.monthly)} ${r.periodMonths === 3 ? "раз в квартал" : r.periodMonths === 6 ? "раз в полгода" : "в месяц"}`;
}

/** Логотип банка; без картинки: кружок с первой буквой названия. */
function BankLogo({ program }: { program: LeaseProgram }) {
  return program.logo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className="lease-bank-logo" src={program.logo} alt="" width={40} height={40} loading="lazy" decoding="async" />
    : <span className="lease-bank-logo is-letter" aria-hidden>{program.name.trim().charAt(0).toUpperCase()}</span>;
}
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
    banksId = useId(),
    [slug, setSlug] = useState(tractor?.slug ?? tractors[0]?.slug ?? ""),
    // Сразу открываем самый выгодный банк (меньше всего заплатить за весь срок).
    [programId, setProgramId] = useState(() => bestProgramId(tractor ?? tractors[0], config, usdKgsRate) ?? "default"),
    [downMode, setDownMode] = useState<"percent" | "amount">("percent"),
    [downValue, setDownValue] = useState(() => {
      const first = config.programs.find((p) => p.id === bestProgramId(tractor ?? tractors[0], config, usdKgsRate)) ?? config.programs[0];
      return first?.minDownPercent ?? settings.downPercent;
    }),
    [chosen, setChosen] = useState<string[]>([]),
    [schedule, setSchedule] = useState<LeaseSchedule>("monthly"),
    [hectarePrice, setHectarePrice] = useState(1500),
    [scheduleOpen, setScheduleOpen] = useState(false),
    [applicationOpen, setApplicationOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const { locale, t } = useI18n();
  // Числа и подписи на языке сайта: ru и ky с пробелами (1 033 398 сом), en через запятую (1,033,398 som).
  const numberLocale = locale === "en" ? "en-US" : "ru-RU";
  const percent = (value: number) => new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 2 }).format(value) + "%";
  const money = (value: number) => `${new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 0 }).format(value)} ${t("lease.som")}`;
  const perPeriod = (period: number) => t(period === 3 ? "lease.per.quarter" : period === 6 ? "lease.per.half" : "lease.per.month");
  const perPeriodShort = (period: number) => t(period === 3 ? "lease.perShort.quarter" : period === 6 ? "lease.perShort.half" : "lease.perShort.month");
  const monthsText = (n: number) => formatMonths(n, locale);
  const termText = (n: number) => formatYears(n, locale) || formatMonths(n, locale);
  /** Как выглядит платёж по варианту: «18 407 сом в месяц», «6 мес. по 6 300, потом 19 550». */
  const paymentText = (r: Installment) =>
    r.scheduleKind === "grace"
      ? t("lease.pay.grace", { n: r.graceMonths, first: money(r.firstPayment), regular: money(r.monthly) })
      : r.scheduleKind === "differentiated"
        ? t("lease.pay.diff", { first: money(r.firstPayment), last: money(r.lastPayment) })
        : `${money(r.monthly)} ${perPeriod(r.periodMonths)}`;
  const rateText = (p: { zeroPercent: boolean; rate: number }) => (p.zeroPercent ? t("lease.noInterest") : t("lease.yearRate", { rate: percent(p.rate) }));
  const scheduleProblemText = (kind: LeaseSchedule, problem: string) =>
    !problem ? "" : kind === "quarterly" ? t("lease.problem.multiple3") : kind === "semiannual" ? t("lease.problem.multiple6") : t("lease.problem.grace", { n: graceMonthsFor(program) });
  const graceMonthsFor = (p: LeaseProgram) => p.graceMonths ?? 6;
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
  // Как платить: только варианты, которые даёт банк; если вариант не подходит к сроку, считаем «каждый месяц».
  const allowedSchedules = program.schedules ?? [...LEASE_SCHEDULES],
    graceMonths = program.graceMonths ?? 6,
    activeSchedule: LeaseSchedule = allowedSchedules.includes(schedule) && !leaseScheduleProblem(schedule, months, graceMonths) ? schedule : "monthly";
  const canCalculate = basePrice > 0 && model?.enabled !== false;
  /**
   * Те же цена, скидка, опции, взнос и срок по любому банку. Если у банка минимальный взнос выше, берётся его минимум.
   * over: другой срок, взнос или вариант оплаты (для сравнения сроков, подсказки по взносу и вариантов оплаты).
   */
  function inputFor(p: LeaseProgram, over: { months?: number; downValue?: number; schedule?: LeaseSchedule } = {}): InstallmentInput {
    const pMinDown = promotion?.reducedDownPercent ?? model?.minDownPercent ?? p.minDownPercent;
    const rules = { price: basePrice, minPercent: pMinDown, maxPercent: p.maxDownPercent, minAmount: p.minDownAmount };
    const pOptions = model?.options?.length ? model.options : p.options;
    const wanted = over.schedule ?? activeSchedule;
    return {
      price: basePrice, options: pOptions.filter((item) => chosen.includes(item.name)), delivery: p.delivery, discount,
      downMode, downValue: normalizeDownPayment(over.downValue ?? downValue, downMode, rules), months: over.months ?? months,
      markupPercent: model?.markupPercent ?? p.markupPercent, annualRate: model?.annualRate ?? p.annualRate,
      fixedCommission: model?.fixedCommission ?? p.fixedCommission, commissionPercent: model?.commissionPercent ?? p.commissionPercent,
      insurance: p.insurance, processingFee: p.processingFee, includeDelivery: p.includeDelivery, includeInsurance: p.includeInsurance,
      includeCommission: p.includeCommission, discountOrder: p.discountOrder, rounding: p.rounding, zeroPercent: Boolean(promotion?.zeroPercent || p.zeroPercent),
      schedule: (p.schedules ?? [...LEASE_SCHEDULES]).includes(wanted) ? wanted : "monthly", graceMonths: p.graceMonths,
    };
  }
  function calc(p: LeaseProgram, over: Parameters<typeof inputFor>[1] = {}) {
    if (!canCalculate) return null;
    try {
      return calculateInstallment(inputFor(p, over));
    } catch {
      return null;
    }
  }
  let result: Installment | null = null,
    calculationError = "";
  try {
    if (canCalculate) result = calculateInstallment(inputFor(program));
  } catch {
    calculationError = t("lease.err.check");
  }
  /** Платёж по другому банку для строк сравнения банков под калькулятором. */
  function quote(p: LeaseProgram) {
    const r = calc(p);
    return r ? { minDown: promotion?.reducedDownPercent ?? model?.minDownPercent ?? p.minDownPercent, result: r } : null;
  }
  // Варианты оплаты по выбранному банку
  const variants = allowedSchedules.map((kind) => {
    const problem = leaseScheduleProblem(kind, months, graceMonths);
    return { kind, problem, result: problem ? null : calc(program, { schedule: kind }) };
  });
  // Сравнение сроков: 3 года, 5 лет, максимум и текущий срок
  const compareTerms = [...new Set([36, 60, maxMonths, months].filter((m) => m >= 1 && m <= maxMonths))].sort((a, b) => a - b);
  const termRows = compareTerms.map((m) => ({ months: m, result: calc(program, { months: m }) })).filter((row) => row.result);
  // Подсказка: взнос на 10% больше
  const downPercentNow = result && basePrice ? (result.downPayment / basePrice) * 100 : 0;
  const nextDownPercent = Math.round(downPercentNow + 10);
  const nextDownValue = downMode === "percent" ? nextDownPercent : Math.round((basePrice * nextDownPercent) / 100);
  const nextDown = result && nextDownPercent <= program.maxDownPercent ? calc(program, { downValue: nextDownValue }) : null;
  // Остаток долга на конец каждого года и дата, когда трактор полностью ваш
  const yearBalances = result
    ? Array.from({ length: Math.floor((months - 1) / 12) }, (_, i) => {
        const end = (i + 1) * 12,
          row = [...result!.schedule].reverse().find((item) => item.month <= end);
        return { year: i + 1, balance: row ? row.balance : result!.debt };
      })
    : [];
  const ownDate = new Date();
  ownDate.setMonth(ownDate.getMonth() + months);
  // Кыргызский формат собираем сами: не во всех браузерах есть кыргызские названия месяцев.
  const KY_MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
  const ownText = locale === "ky"
    ? `${ownDate.getFullYear()}-жылдын ${KY_MONTHS[ownDate.getMonth()]} айы`
    : ownDate.toLocaleDateString(locale === "en" ? "en-US" : "ru-RU", { month: "long", year: "numeric" });
  const quotes = config.programs.map((p) => ({ program: p, quote: p.id === program.id && result ? { minDown, result } : quote(p) }));
  // «Выгоднее»: меньше всего заплатить за весь срок (взнос + договор), только если банков несколько и лучший один
  const totals = quotes.filter((x) => x.quote).map((x) => x.quote!.result.contractTotal + x.quote!.result.downPayment);
  const bestTotal = totals.length > 1 ? Math.min(...totals) : null;
  const bestId = bestTotal !== null && totals.filter((t) => t === bestTotal).length === 1 ? quotes.find((x) => x.quote && x.quote.result.contractTotal + x.quote.result.downPayment === bestTotal)?.program.id : undefined;
  function chooseProgram(id: string) {
    const next = config.programs.find((item) => item.id === id);
    if (!next) return;
    setProgramId(id);
    const nextMin = promotion?.reducedDownPercent ?? model?.minDownPercent ?? next.minDownPercent;
    // взнос клиента сохраняем, если банк его допускает; иначе поднимаем до минимума банка
    setDownValue(normalizeDownPayment(downValue, downMode, { price: basePrice, minPercent: nextMin, maxPercent: next.maxDownPercent, minAmount: next.minDownAmount }));
    setChosen((current) => current.filter((name) => (model?.options?.length ? model.options : next.options).some((o) => o.name === name)));
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
          schedule: result.scheduleKind,
          sourcePath: window.location.pathname,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(body.error || t("lease.err.send"));
      setNotice(successMessage);
      setApplicationOpen(false);
      requestKey.current = crypto.randomUUID();
      const downPercent = basePrice ? (result.downPayment / basePrice) * 100 : 0;
      const city = String(form.get("city") || "").trim(), comment = String(form.get("comment") || "").trim();
      window.location.assign(managerWhatsAppUrl(settings.phone, {
        name: String(form.get("name") || ""), phone: String(form.get("phone") || ""),
        headline: `Хочу Changfa ${selected.model}${selected.hp ? ` (${selected.hp} л.с.)` : ""} в лизинг.`,
        message: [
          config.programs.length ? `Банк: ${program.name}, ${zeroPercent ? "без процентов" : `${ruPercent(effectiveRate)} годовых`}` : "",
          `Цена: ${publishedPrice ? ruMoney(basePrice) : `≈ ${ruMoney(basePrice)} (ориентировочно)`}`,
          `Первый взнос: ${ruPercent(Math.round(downPercent * 10) / 10)} (${ruMoney(result.downPayment)})`,
          `Срок: ${formatLeaseTerm(months)}`,
          `Как платить: ${LEASE_SCHEDULE_INFO[result.scheduleKind].title.toLowerCase()}`,
          `Платёж: ≈ ${ruPaymentText(result)}`,
          selectedOptions.length ? `Опции: ${selectedOptions.map((o) => o.name).join(", ")}` : "",
          termsUnconfirmed ? "Ставку и комиссии нужно уточнить." : `Переплата: ≈ ${ruMoney(result.overpayment)}`,
          termsUnconfirmed ? "" : `Всего по договору: ≈ ${ruMoney(result.contractTotal + result.downPayment)}`,
          city ? `Город: ${city}` : "",
          comment,
        ].filter(Boolean).join("\n"),
        path: window.location.href,
      }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("lease.err.network"),
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
          {t("lease.label")}
        </span>
        <h2 id={headingId}>
          {selected
            ? t("lease.titleModel", { model: selected.model })
            : t("lease.titleNone")}
        </h2>
        <p>{t(config.programs.length ? "lease.introBanks" : "lease.intro", { max: maxMonths })}</p>
      </header>
      <div className="lease-layout">
        <div className="lease-controls">
          {!tractor && tractors.length ? (
            <label>
              <span>{t("lease.model")}</span>
              <select
                value={slug}
                onChange={(event) => chooseModel(event.target.value)}
              >
                {tractors.map((item) => (
                  <option value={item.slug} key={item.slug}>
                    Changfa {item.model} · {item.hp} {t("lease.hp")}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {config.programs.length ? (
            <div className="lease-bank-current">
              <BankLogo program={program} />
              <span>
                <small>{t("lease.bank")}</small>
                <strong>{program.name}</strong>
                <em>
                  {[rateText({ zeroPercent, rate: effectiveRate }), t("lease.downFrom", { p: percent(minDown) }), effectiveCommission > 0 ? t("lease.commission", { p: percent(effectiveCommission) }) : ""].filter(Boolean).join(" · ")}
                </em>
              </span>
              {config.programs.length > 1 ? <a href={`#${banksId}`}>{t("lease.compareBanks")}</a> : null}
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
                <small>{t("lease.selected")}</small>
                <strong>Changfa {selected.model}</strong>
                <span>
                  {publishedPrice
                    ? money(publishedPrice)
                    : selected.approximatePriceUsd
                      ? `${formatApproximateUsdPrice(selected.approximatePriceUsd)} · ${basePrice ? `≈ ${money(basePrice)}` : t("lease.enterSomPrice")}`
                      : basePrice ? `≈ ${money(basePrice)}` : t("lease.priceOnRequest")} ·{" "}
                  {selected.inStock ? t("lease.inStock") : t("lease.onOrder")}
                </span>
              </div>
            </div>
          ) : null}
          {!publishedPrice && convertedEstimate && usdKgsRate ? (
            <p className="lease-rate-note">
              {t("lease.rateNote", { date: usdKgsRate.date, rate: new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 4 }).format(usdKgsRate.value) })}{" "}
              <a href="https://www.nbkr.kg/index1.jsp?item=1562&lang=RUS" target="_blank" rel="noreferrer">{t("lease.rateSource")}</a>
            </p>
          ) : null}
          {!publishedPrice && !convertedEstimate ? (
            <label className="lease-estimate">
              <span>{t("lease.estimateLabel")}</span>
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
                placeholder={t("lease.estimatePlaceholder")}
              />
              <small>
                {selected?.approximatePriceUsd ? t("lease.estimateNoRate", { usd: formatApproximateUsdPrice(selected.approximatePriceUsd) }) : t("lease.estimateHelp")}
              </small>
            </label>
          ) : null}
          {promotion ? (
            <div className="lease-promotion">
              <BadgePercent />
              <div>
                <strong>{promotion.name}</strong>
                <span>
                  {promotion.zeroPercent ? `${t("lease.zeroPromo")} · ` : ""}
                  {promotion.gift || t("lease.discount", { sum: money(discount) })}
                </span>
              </div>
            </div>
          ) : null}
          {!basePrice ? (
            <p className="lease-help">{t("lease.needPrice")}</p>
          ) : null}
          {model?.enabled === false ? (
            <p className="lease-help">{t("lease.modelUnavailable")}</p>
          ) : null}
          <fieldset className="lease-down">
            <legend>{t("lease.down")}</legend>
            <div className="lease-segmented">
              <button
                type="button"
                className={downMode === "percent" ? "active" : ""}
                onClick={() => {
                  setDownValue(convertDownPayment(downValue, downMode, "percent", downRules));
                  setDownMode("percent");
                }}
              >
                {t("lease.downPercent")}
              </button>
              <button
                type="button"
                className={downMode === "amount" ? "active" : ""}
                onClick={() => {
                  setDownValue(convertDownPayment(downValue, downMode, "amount", downRules));
                  setDownMode("amount");
                }}
              >
                {t("lease.downAmount")}
              </button>
            </div>
            <label>
              <span>{t(downMode === "percent" ? "lease.downPercentLabel" : "lease.downAmountLabel")}</span>
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
              aria-label={t("lease.downSlider")}
              type="range"
              min={downLimits.min}
              max={downLimits.max}
              step={downMode === "percent" ? 0.01 : 1}
              value={downValue}
              onChange={(event) => setDownValue(normalizeDownPayment(Number(event.target.value), downMode, downRules))}
            />
          </fieldset>
          <fieldset className="lease-term">
            <legend>{t("lease.term")}</legend>
            <div className="lease-term-value" aria-live="polite">
              <CalendarClock aria-hidden />
              <span>
                <strong>{monthsText(months)}</strong>
                <small>
                  {formatYears(months, locale) || t("lease.termRange", { max: maxMonths })}
                </small>
              </span>
            </div>
            <div className="lease-term-quick" role="group" aria-label={t("lease.termQuick")}>
              {termChoices.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={value === months ? "active" : ""}
                  aria-pressed={value === months}
                  onClick={() => setChosenMonths(value)}
                >
                  {t("lease.monthShort", { n: value })}
                </button>
              ))}
            </div>
            <input
              aria-label={t("lease.termSlider")}
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
              <span>{t("lease.monthShort", { n: 1 })}</span>
              <span>{t("lease.monthShort", { n: maxMonths })}</span>
            </div>
          </fieldset>
          {result && !termsUnconfirmed && variants.length > 1 ? (
            <fieldset className="lease-plans">
              <legend>{t("lease.plans")}</legend>
              {variants.map((v) => {
                const active = v.kind === activeSchedule;
                return (
                  <button
                    key={v.kind}
                    type="button"
                    className={active ? "active" : ""}
                    aria-pressed={active}
                    disabled={!v.result}
                    onClick={() => setSchedule(v.kind)}
                  >
                    <span>
                      <strong>{t(`lease.plan.${v.kind}`)}</strong>
                      <small>{v.kind === "grace" ? t("lease.plan.graceHint", { n: graceMonths }) : t(`lease.plan.${v.kind}Hint`)}</small>
                    </span>
                    <span className="lease-plan-pay">
                      {v.result ? (
                        <>
                          <strong>{paymentText(v.result)}</strong>
                          <small>{t("lease.overpay", { sum: money(v.result.overpayment) })}</small>
                        </>
                      ) : (
                        <small>{scheduleProblemText(v.kind, v.problem)}</small>
                      )}
                    </span>
                  </button>
                );
              })}
              <p>{t("lease.plansNote")}</p>
            </fieldset>
          ) : null}
          {options.length ? (
            <fieldset className="lease-options">
              <legend>{t("lease.options")}</legend>
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
          {model?.notes ? <p className="lease-help">{model.notes}</p> : null}
          {!config.programs.length && program.notes ? <p className="lease-help">{program.notes}</p> : null}
        </div>
        <div className="lease-side">
        {config.programs.length ? (
          <section className="lease-banks lease-banks-side" id={banksId} aria-labelledby={`${banksId}-t`}>
            <div className="lease-banks-head">
              <strong id={`${banksId}-t`}><Landmark size={17} aria-hidden /> {t("lease.banks.title")}</strong>
              <span>{t("ui.bank.sub", { term: monthsText(months) })}</span>
            </div>
            <ul>
              {quotes.map(({ program: p, quote: q }) => {
                const active = p.id === program.id;
                return (
                  <li key={p.id} className={`lease-bank-tile${active ? " active" : ""}`}>
                    <button type="button" aria-pressed={active} onClick={() => chooseProgram(p.id)}>
                      <BankLogo program={p} />
                      <span className="lease-bank-name">
                        <strong>{p.name}</strong>
                        <small>{[rateText({ zeroPercent: p.zeroPercent, rate: p.annualRate }), t("lease.downFrom", { p: percent(q?.minDown ?? p.minDownPercent) })].join(" · ")}</small>
                        {p.id === bestId ? <em className="lease-bank-best">{t("lease.banks.best")}</em> : null}
                      </span>
                      <span className="lease-bank-pay">
                        <strong>{q ? new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 0 }).format(q.result.monthly) : "–"}</strong>
                        <small>{q ? t(q.result.periodMonths === 3 ? "ui.bank.som.quarter" : q.result.periodMonths === 6 ? "ui.bank.som.half" : "ui.bank.som.month") : t("lease.banks.needPrice")}</small>
                      </span>
                    </button>
                    {active && (p.notes || p.website) ? (
                      <div className="lease-bank-extra">
                        {p.notes ? <details><summary>{t("ui.bank.about")}<ChevronDown size={15} aria-hidden /></summary><p>{p.notes}</p></details> : null}
                        {p.website ? <a className="lease-bank-site" href={p.website} target="_blank" rel="noopener noreferrer nofollow">{t("lease.banks.site")} <ExternalLink size={13} aria-hidden /></a> : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <p>{t("ui.bank.tap")}</p>
          </section>
        ) : null}
        <aside className="lease-summary" aria-live="polite">
          <span>
            {termsUnconfirmed
              ? t("lease.sum.basePerMonth")
              : result?.scheduleKind === "grace"
                ? t("lease.sum.afterGrace")
                : result?.scheduleKind === "differentiated"
                  ? t("lease.sum.first")
                  : t("lease.sum.payment", { per: perPeriod(result?.periodMonths ?? 1) })}
          </span>
          <strong>
            {result ? money(result.monthly) : t("lease.sum.na")}
            <small>
              {termsUnconfirmed
                ? t("lease.sum.noRate")
                : result
                  ? [
                      result.scheduleKind === "grace" ? t("lease.sum.graceFirst", { n: result.graceMonths, sum: money(result.firstPayment) }) : "",
                      result.scheduleKind === "differentiated" ? t("lease.sum.diffLast", { sum: money(result.lastPayment) }) : "",
                      t("lease.sum.perDay", { sum: money(Math.round(result.monthly / (result.periodMonths * 30))) }),
                    ].filter(Boolean).join(" · ")
                  : t("lease.sum.monthly")}
            </small>
          </strong>
          <dl>
            <div>
              <dt>{t("lease.sum.price")}</dt>
              <dd>{basePrice ? money(basePrice) : t("lease.sum.na")}</dd>
            </div>
            {config.programs.length ? (
              <div>
                <dt>{t("lease.bank")}</dt>
                <dd>{program.name}</dd>
              </div>
            ) : null}
            <div>
              <dt>{t("lease.sum.term")}</dt>
              <dd>{monthsText(months)}</dd>
            </div>
            <div>
              <dt>{t("lease.sum.down")}</dt>
              <dd>{result ? money(result.downPayment) : t("lease.sum.na")}</dd>
            </div>
            <div>
              <dt>{t("lease.sum.financed")}</dt>
              <dd>{result ? money(result.financed) : t("lease.sum.na")}</dd>
            </div>
            {!termsUnconfirmed && result && result.interest > 0 ? <div>
              <dt>{t("lease.sum.interest")}</dt>
              <dd>{money(result.interest)}</dd>
            </div> : null}
            {!termsUnconfirmed && result && result.fees > 0 ? <div>
              <dt>{t("lease.sum.fees")}</dt>
              <dd>{money(result.fees)}</dd>
            </div> : null}
            {!termsUnconfirmed ? <div>
              <dt>{t("lease.sum.overpay")}</dt>
              <dd>{result ? money(result.overpayment) : t("lease.sum.na")}</dd>
            </div> : null}
            <div>
              <dt>{t(termsUnconfirmed ? "lease.sum.baseTotal" : "lease.sum.total")}</dt>
              <dd>
                {result
                  ? money(result.contractTotal + result.downPayment)
                  : t("lease.sum.na")}
              </dd>
            </div>
          </dl>
          <p>
            {termsUnconfirmed
              ? t("lease.sum.noteUnconfirmed", { term: monthsText(months) })
              : `${!publishedPrice ? `${t("lease.sum.noteEstimate")} ` : ""}${t("lease.sum.note")}`}
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
            <MessageCircle size={18} />
            {t("lease.writeManager")}
          </button>
        </aside>
        </div>
      </div>
      {applicationOpen && result ? (
        <form className="lease-application" onSubmit={submit}>
          <div>
            <span>Changfa {selected?.model}{config.programs.length ? ` · ${program.name}` : ""} · {monthsText(months)} · ≈ {paymentText(result)}</span>
            <h3>{t("lease.app.title")}</h3>
            <p className="lease-application-note">{t("lease.app.note")}</p>
          </div>
          <label>
            <span>{t("lease.app.name")}</span>
            <input name="name" required minLength={2} autoComplete="name" />
          </label>
          <PhoneInput />
          <details className="lease-application-more full">
            <summary>{t("lease.app.more")}</summary>
            <label>
              <span>{t("lease.app.city")}</span>
              <input name="city" />
            </label>
            <label>
              <span>{t("lease.app.comment")}</span>
              <textarea name="comment" rows={2} />
            </label>
          </details>
          <label className="lease-consent full">
            <input name="consent" type="checkbox" required />
            <span>{t("lease.app.consent")}</span>
          </label>
          <button className="primary-btn" disabled={busy} type="submit">
            <MessageCircle />
            {busy ? t("lease.app.busy") : t("lease.app.submit")}
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
      {result && !termsUnconfirmed ? (
        <section className="lease-insights" aria-label={t("lease.ins.aria")}>
          <article>
            <h3><Coins size={17} aria-hidden /> {t("lease.ins.split")}</h3>
            {result.interest > 0 ? (() => {
              const row = regularRow(result),
                share = row.payment ? Math.round((row.principal / row.payment) * 100) : 100;
              return (
                <>
                  <p className="lease-insight-lead">{t("lease.ins.from", { sum: money(row.payment) })}</p>
                  <div className="lease-split" aria-hidden>
                    <span style={{ width: `${share}%` }} />
                  </div>
                  <ul className="lease-split-legend">
                    <li><i className="is-debt" /> {t("lease.ins.debt", { sum: money(row.principal) })}</li>
                    <li><i /> {t("lease.ins.interest", { sum: money(row.interest) })}</li>
                  </ul>
                  <p className="lease-insight-note">{t("lease.ins.less", { sum: money(result.schedule.at(-1)!.interest) })}</p>
                </>
              );
            })() : <p className="lease-insight-note">{t("lease.ins.zero")}</p>}
          </article>
          <article>
            <h3><CalendarRange size={17} aria-hidden /> {t("lease.ins.years")}</h3>
            {yearBalances.length ? (
              <ul className="lease-years">
                {yearBalances.map((row) => (
                  <li key={row.year}>
                    <span>{t("lease.ins.after", { years: formatYearCount(row.year, locale) })}</span>
                    <i aria-hidden><b style={{ width: `${result.debt ? Math.max(2, Math.round((row.balance / result.debt) * 100)) : 0}%` }} /></i>
                    <strong>{money(row.balance)}</strong>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="lease-own">{t("lease.ins.own")} <strong>{ownText}</strong></p>
          </article>
          <article>
            <h3><Scale size={17} aria-hidden /> {t("lease.ins.terms")}</h3>
            <table className="lease-terms-table">
              <thead>
                <tr><th>{t("lease.ins.colTerm")}</th><th>{t("lease.ins.colPay")}</th><th>{t("lease.ins.colOver")}</th></tr>
              </thead>
              <tbody>
                {termRows.map((row) => (
                  <tr key={row.months} className={row.months === months ? "active" : ""}>
                    <td>
                      <button type="button" onClick={() => setChosenMonths(row.months)} aria-pressed={row.months === months}>
                        {termText(row.months)}
                      </button>
                    </td>
                    <td>{money(row.result!.monthly)}</td>
                    <td>{money(row.result!.overpayment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="lease-insight-note">{t("lease.ins.termsNote")}</p>
          </article>
          <article>
            <h3><PiggyBank size={17} aria-hidden /> {t("lease.ins.more")}</h3>
            {nextDown && nextDown.monthly < result.monthly ? (
              <>
                <p className="lease-insight-lead">
                  {t("lease.ins.moreLead", { next: nextDownPercent, sum: money(nextDown.downPayment), cur: Math.round(downPercentNow) })}
                </p>
                <ul className="lease-split-legend is-text">
                  <li>{t("lease.ins.morePay", { pay: money(nextDown.monthly), diff: money(result.monthly - nextDown.monthly) })}</li>
                  <li>{t("lease.ins.moreOver", { sum: money(result.overpayment - nextDown.overpayment) })}</li>
                </ul>
                <button type="button" className="lease-insight-action" onClick={() => setDownValue(nextDownValue)}>
                  {t("lease.ins.moreBtn", { p: nextDownPercent })}
                </button>
              </>
            ) : (
              <p className="lease-insight-note">{t("lease.ins.maxDown")}</p>
            )}
          </article>
          <article className="lease-payback">
            <h3><Sprout size={17} aria-hidden /> {t("lease.ins.payback")}</h3>
            <label>
              <span>{t("lease.ins.hectare")}</span>
              <input
                type="number"
                min={100}
                max={100000}
                step={100}
                value={hectarePrice || ""}
                onChange={(event) => setHectarePrice(Math.max(0, Math.min(100000, Math.round(Number(event.target.value)) || 0)))}
              />
            </label>
            {hectarePrice >= 100 ? (
              <p className="lease-insight-lead">
                {t("lease.ins.paybackText", { per: perPeriodShort(result.periodMonths), n: Math.ceil(regularRow(result).payment / hectarePrice) })}
              </p>
            ) : (
              <p className="lease-insight-note">{t("lease.ins.enterPrice")}</p>
            )}
            <p className="lease-insight-note">{t("lease.ins.paybackNote")}</p>
          </article>
        </section>
      ) : null}
      {result ? (
        <div className="lease-schedule">
          <button
            type="button"
            aria-expanded={scheduleOpen}
            onClick={() => setScheduleOpen((value) => !value)}
          >
            <FileText />
            {t("lease.schedule")}
            <ChevronDown />
          </button>
          {scheduleOpen ? (
            <div
              className="table-scroll"
              role="region"
              aria-label={t("lease.schedule")}
            >
              <table>
                <thead>
                  <tr>
                    <th>{t("lease.sch.month")}</th>
                    <th>{t("lease.sch.payment")}</th>
                    <th>{t("lease.sch.interest")}</th>
                    <th>{t("lease.sch.debt")}</th>
                    <th>{t("lease.sch.balance")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.map((row) => (
                    <tr key={row.month}>
                      <td>{row.month}</td>
                      <td>{money(row.payment)}</td>
                      <td>{money(row.interest)}</td>
                      <td>{money(row.principal)}</td>
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
