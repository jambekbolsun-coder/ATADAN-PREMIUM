import { approximateSomPrice, type UsdKgsRate } from "./exchange-rate";
import { calculateInstallment, normalizeDownPayment, normalizeLeaseMaxMonths, salePrice, type LeaseProgram, type LeasePublicConfig } from "./leasing";
import type { Tractor } from "../types";

export type LeasePreview = { monthly: number; downPercent: number; months: number; programId: string; total: number };

/** Цена трактора в сомах, как в калькуляторе: цена из лизинга, цена со скидкой или доллары по курсу НБКР. */
export function tractorSomPrice(tractor: Tractor, config: LeasePublicConfig, rate: UsdKgsRate | null) {
  const model = config.models.find((item) => item.tractorSlug === tractor.slug);
  return model?.price ?? salePrice(tractor.price, tractor.discountPercent ?? 0) ?? approximateSomPrice(tractor.approximatePriceUsd, rate) ?? 0;
}

/**
 * Платёж по одному банку на тех же правилах, что в калькуляторе:
 * минимальный взнос банка (или акции), максимальный срок, платёж каждый месяц, без опций.
 */
export function programPreview(tractor: Tractor, program: LeaseProgram, config: LeasePublicConfig, rate: UsdKgsRate | null): LeasePreview | null {
  const model = config.models.find((item) => item.tractorSlug === tractor.slug);
  if (model?.enabled === false) return null;
  const price = tractorSomPrice(tractor, config, rate);
  if (!price) return null;
  const promotion = config.promotions.find((item) => !item.tractorSlugs.length || item.tractorSlugs.includes(tractor.slug));
  const discount = model?.discount ?? (promotion ? (promotion.discountType === "percent" ? (price * promotion.discount) / 100 : promotion.discount) : 0);
  const minDown = promotion?.reducedDownPercent ?? model?.minDownPercent ?? program.minDownPercent;
  const months = normalizeLeaseMaxMonths(config.maxMonths);
  const downValue = normalizeDownPayment(minDown, "percent", { price, minPercent: minDown, maxPercent: program.maxDownPercent, minAmount: program.minDownAmount });
  try {
    const result = calculateInstallment({
      price, options: [], delivery: program.delivery, discount, downMode: "percent", downValue, months,
      markupPercent: model?.markupPercent ?? program.markupPercent, annualRate: model?.annualRate ?? program.annualRate,
      fixedCommission: model?.fixedCommission ?? program.fixedCommission, commissionPercent: model?.commissionPercent ?? program.commissionPercent,
      insurance: program.insurance, processingFee: program.processingFee, includeDelivery: program.includeDelivery, includeInsurance: program.includeInsurance,
      includeCommission: program.includeCommission, discountOrder: program.discountOrder, rounding: program.rounding,
      zeroPercent: Boolean(promotion?.zeroPercent || program.zeroPercent), schedule: "monthly",
    });
    return { monthly: result.monthly, downPercent: Math.round((result.downPayment / price) * 1000) / 10, months, programId: program.id, total: result.contractTotal + result.downPayment };
  } catch {
    return null;
  }
}

/** Банк, где за весь срок выходит меньше всего (взнос + договор). Нужен, чтобы калькулятор сразу открывался на выгодном банке. */
export function bestProgramId(tractor: Tractor | undefined, config: LeasePublicConfig, rate: UsdKgsRate | null) {
  if (!tractor || config.programs.length < 2) return config.programs[0]?.id;
  let best: LeasePreview | null = null;
  for (const program of config.programs) {
    const preview = programPreview(tractor, program, config, rate);
    if (preview && (!best || preview.total < best.total)) best = preview;
  }
  return best?.programId ?? config.programs[0]?.id;
}

/** Самый маленький платёж в месяц среди банков-партнёров («от … сом/мес»). Без банков: null. */
export function leasePreview(tractor: Tractor, config: LeasePublicConfig, rate: UsdKgsRate | null): LeasePreview | null {
  let best: LeasePreview | null = null;
  for (const program of config.programs) {
    const preview = programPreview(tractor, program, config, rate);
    if (preview && (!best || preview.monthly < best.monthly)) best = preview;
  }
  return best;
}
