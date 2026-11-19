/**
 * Срок лизинга на сайте: клиент выбирает от 1 месяца до максимума.
 * Максимум задают в админке (Маркетинг → Страницы сайта → Банки и ставки), по умолчанию 84,
 * жёсткий предел 120 месяцев.
 */
export const LEASE_TERM_DEFAULT_MAX = 84;
export const LEASE_TERM_HARD_MAX = 120;
export const LEASE_QUICK_TERMS = [3, 6, 12, 24, 36, 48, 60, 84] as const;

/** Максимальный срок из настроек: целое от 1 до 120, при пустом или неверном значении 84. */
export function normalizeLeaseMaxMonths(value: unknown) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 1 ? Math.min(LEASE_TERM_HARD_MAX, n) : LEASE_TERM_DEFAULT_MAX;
}

export function isValidLeaseTerm(months: number, maxMonths: number = LEASE_TERM_DEFAULT_MAX) {
  return Number.isInteger(months) && months >= 1 && months <= normalizeLeaseMaxMonths(maxMonths);
}

/** Быстрые кнопки срока: стандартные сроки не больше максимума, плюс сам максимум. */
export function leaseTermChoices(maxMonths: number = LEASE_TERM_DEFAULT_MAX) {
  const max = normalizeLeaseMaxMonths(maxMonths);
  const list: number[] = LEASE_QUICK_TERMS.filter((m) => m <= max);
  if (!list.includes(max)) list.push(max);
  return list;
}

function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}
type TermLocale = "ru" | "ky" | "en";
/** «84 месяца» / «84 ай» / «84 months». */
export function formatMonths(months: number, locale: TermLocale = "ru") {
  if (locale === "ky") return `${months} ай`;
  if (locale === "en") return `${months} ${months === 1 ? "month" : "months"}`;
  return `${months} ${plural(months, "месяц", "месяца", "месяцев")}`;
}
/** Годы: «7 лет» / «7 жыл» / «7 years». */
export function formatYearCount(years: number, locale: TermLocale = "ru") {
  if (locale === "ky") return `${years} жыл`;
  if (locale === "en") return `${years} ${years === 1 ? "year" : "years"}`;
  return `${years} ${plural(years, "год", "года", "лет")}`;
}
/** «7 лет» для срока, кратного году, иначе пустая строка. */
export function formatYears(months: number, locale: TermLocale = "ru") {
  if (months < 12 || months % 12 !== 0) return "";
  return formatYearCount(months / 12, locale);
}
/** «7 лет (84 месяца)», «1 год (12 месяцев)», «18 месяцев». */
export function formatLeaseTerm(months: number, locale: TermLocale = "ru") {
  const years = formatYears(months, locale);
  return years ? `${years} (${formatMonths(months, locale)})` : formatMonths(months, locale);
}

export type LeaseInput = { price: number; downPercent: number; months: number; annualRate: number; fee: number; method: "annuity" | "differentiated" };
export type LeasePayment = { month: number; principal: number; interest: number; payment: number; balance: number };
// All amounts in the schedule are integer tyiyn. The final payment closes the balance exactly.
export function calculateLease(input: LeaseInput, maxMonths: number = LEASE_TERM_DEFAULT_MAX) {
  const { price, downPercent, months, annualRate, fee, method } = input;
  const max = normalizeLeaseMaxMonths(maxMonths);
  if (![price, downPercent, months, annualRate, fee].every(Number.isFinite)
    || price <= 0 || price > 1_000_000_000 || downPercent < 0 || downPercent > 100
    || !isValidLeaseTerm(months, max) || annualRate < 0 || annualRate > 100
    || fee < 0 || fee > price || !["annuity", "differentiated"].includes(method)) throw new Error(`Проверьте стоимость, взнос, ставку и срок от 1 до ${max} месяцев.`);
  const priceMinor = Math.round(price * 100);
  const downMinor = Math.round(priceMinor * downPercent / 100);
  const financed = priceMinor - downMinor;
  const monthlyRate = annualRate / 1200;
  const annuity = monthlyRate ? financed * monthlyRate / -Math.expm1(-months * Math.log1p(monthlyRate)) : financed / months;
  let balance = financed;
  const schedule: LeasePayment[] = [];
  for (let month = 1; month <= months; month++) {
    const interest = Math.round(balance * monthlyRate);
    const principal = month === months ? balance : Math.min(balance, Math.max(0, Math.round(method === "annuity" ? annuity - interest : financed / months)));
    balance -= principal;
    schedule.push({ month, principal, interest, payment: principal + interest, balance });
  }
  const interest = schedule.reduce((sum, row) => sum + row.interest, 0);
  const feeMinor = Math.round(fee * 100);
  return { price: priceMinor, down: downMinor, financed, fee: feeMinor, interest, total: priceMinor + interest + feeMinor, schedule, monthly: schedule[0]?.payment ?? 0 };
}

export function salePrice(price: number | null, discount = 0) {
  if (price === null) return null;
  return Math.round(price * 100 * (1 - Math.min(90, Math.max(0, discount)) / 100)) / 100;
}

export type LeaseOption={name:string;price:number};
/**
 * Как платить: каждый месяц равными частями (аннуитет), раз в квартал, 2 раза в год,
 * льготный период (первые месяцы только проценты), убывающий платёж (долг равными частями + проценты с остатка).
 */
export const LEASE_SCHEDULES=["monthly","quarterly","semiannual","grace","differentiated"] as const;
export type LeaseSchedule=typeof LEASE_SCHEDULES[number];
export const LEASE_SCHEDULE_INFO:Record<LeaseSchedule,{title:string;hint:string;period:1|3|6}>={
  monthly:{title:"Каждый месяц",hint:"Одинаковый платёж каждый месяц",period:1},
  quarterly:{title:"Раз в квартал",hint:"Платёж раз в 3 месяца",period:3},
  semiannual:{title:"2 раза в год",hint:"Например, после урожая",period:6},
  grace:{title:"Льготный период",hint:"Сначала только проценты",period:1},
  differentiated:{title:"Убывающий платёж",hint:"Каждый месяц платёж меньше",period:1},
};
export const LEASE_GRACE_DEFAULT=6;
export const normalizeGraceMonths=(value:unknown)=>{const n=Math.round(Number(value));return Number.isFinite(n)&&n>=1?Math.min(24,n):LEASE_GRACE_DEFAULT};
export function isLeaseSchedule(value:unknown):value is LeaseSchedule{return typeof value==="string"&&(LEASE_SCHEDULES as readonly string[]).includes(value)}
/** Список вариантов из админки («monthly, quarterly»); пусто или мусор: все варианты. Каждый месяц есть всегда. */
export function parseLeaseSchedules(value:unknown):LeaseSchedule[]{
  const list=String(value??"").split(/[,;\s]+/).filter(isLeaseSchedule);
  if(!list.length)return [...LEASE_SCHEDULES];
  return LEASE_SCHEDULES.filter(item=>item==="monthly"||list.includes(item));
}
/** Почему вариант нельзя выбрать на этот срок; пустая строка: можно. */
export function leaseScheduleProblem(schedule:LeaseSchedule,months:number,graceMonths:number=LEASE_GRACE_DEFAULT){
  if(schedule==="quarterly"&&(months<3||months%3))return "Нужен срок, кратный 3 месяцам";
  if(schedule==="semiannual"&&(months<6||months%6))return "Нужен срок, кратный 6 месяцам";
  if(schedule==="grace"&&months<=normalizeGraceMonths(graceMonths))return `Нужен срок больше ${normalizeGraceMonths(graceMonths)} мес.`;
  return "";
}
/** logo: картинка банка (/api/media, /images или https), website: официальный сайт банка; пусто, если не указаны. */
export type LeaseProgram={id:string;name:string;logo?:string;website?:string;programType:string;currency:string;termsMonths:number[];minDownPercent:number;maxDownPercent:number;minDownAmount:number;downPaymentMode:string;markupPercent:number;annualRate:number;fixedCommission:number;commissionPercent:number;insurance:number;processingFee:number;delivery:number;includeDelivery:boolean;includeInsurance:boolean;includeCommission:boolean;discountOrder:"before"|"after";rounding:1|10|100;zeroPercent:boolean;options:LeaseOption[];notes:string;schedules?:LeaseSchedule[];graceMonths?:number};
export type LeaseModelTerms={tractorSlug:string;enabled:boolean;price?:number;minDownPercent?:number;termsMonths?:number[];markupPercent?:number;annualRate?:number;fixedCommission?:number;commissionPercent?:number;discount?:number;maxFinancing?:number;options?:LeaseOption[];notes?:string};
export type LeasePromotion={id:string;name:string;tractorSlugs:string[];discountType:"percent"|"amount";discount:number;reducedDownPercent?:number;zeroPercent:boolean;gift:string;startsAt:string;endsAt:string};
/** maxMonths: максимальный срок лизинга на сайте (клиент выбирает от 1 до maxMonths). */
export type LeasePublicConfig={programs:LeaseProgram[];models:LeaseModelTerms[];promotions:LeasePromotion[];maxMonths:number};
export type InstallmentInput={price:number;options:LeaseOption[];delivery:number;discount:number;downMode:"percent"|"amount";downValue:number;months:number;markupPercent:number;annualRate:number;fixedCommission:number;commissionPercent:number;insurance:number;processingFee:number;includeDelivery:boolean;includeInsurance:boolean;includeCommission:boolean;discountOrder:"before"|"after";rounding:1|10|100;zeroPercent:boolean;schedule?:LeaseSchedule;graceMonths?:number};
/** Строка графика: month = номер месяца, в котором платёж (для квартала 3, 6, 9...). */
export type InstallmentRow={month:number;payment:number;principal:number;interest:number;balance:number};

export type DownPaymentRules={price:number;minPercent:number;maxPercent:number;minAmount:number};

export function downPaymentLimits(rules:DownPaymentRules,mode:"percent"|"amount"){
  const price=Math.max(0,Number(rules.price)||0);
  const minPercent=Math.max(0,Math.min(100,Number(rules.minPercent)||0));
  const maxPercent=Math.max(minPercent,Math.min(100,Number(rules.maxPercent)||100));
  if(mode==="percent")return {min:minPercent,max:maxPercent};
  const max=Math.floor(price*maxPercent/100);
  const min=Math.min(max,Math.max(0,Number(rules.minAmount)||0,Math.ceil(price*minPercent/100)));
  return {min,max};
}

export function normalizeDownPayment(value:number,mode:"percent"|"amount",rules:DownPaymentRules){
  const {min,max}=downPaymentLimits(rules,mode);
  const numeric=Number.isFinite(value)?value:min;
  const rounded=mode==="percent"?Math.round(numeric*100)/100:Math.round(numeric);
  return Math.max(min,Math.min(max,rounded));
}

export function convertDownPayment(
  value:number,
  from:"percent"|"amount",
  to:"percent"|"amount",
  rules:DownPaymentRules,
){
  const normalized=normalizeDownPayment(value,from,rules);
  if(from===to)return normalized;
  if(to==="amount")return normalizeDownPayment(rules.price*normalized/100,"amount",rules);
  return normalizeDownPayment(rules.price>0?normalized/rules.price*100:rules.minPercent,"percent",rules);
}

const clampMoney=(value:number)=>Math.max(0,Math.min(1_000_000_000,Number(value)||0));
export function calculateInstallment(input:InstallmentInput){
  if(!Number.isFinite(input.price)||input.price<=0||!Number.isFinite(input.downValue)||!Number.isFinite(input.months))throw new Error("Проверьте стоимость, первый взнос и срок.");
  const months=Math.max(1,Math.min(LEASE_TERM_HARD_MAX,Math.round(input.months))),price=Math.round(clampMoney(input.price)),optionsTotal=Math.round(input.options.reduce((sum,item)=>sum+clampMoney(item.price),0)),delivery=input.includeDelivery?Math.round(clampMoney(input.delivery)):0,discount=Math.round(Math.min(price+optionsTotal+delivery,clampMoney(input.discount)));
  const downBase=input.discountOrder==="before"?price+optionsTotal+delivery-discount:price+optionsTotal+delivery;
  const downPayment=Math.round(Math.min(price+optionsTotal+delivery-discount,input.downMode==="percent"?downBase*Math.max(0,Math.min(100,input.downValue))/100:clampMoney(input.downValue)));
  const financed=Math.round(Math.max(0,price+optionsTotal+delivery-discount-downPayment));
  // Удорожание (наценка программы) разово добавляется к долгу; проценты банк берёт только с остатка долга.
  const markup=Math.round(input.zeroPercent?0:financed*Math.max(0,input.markupPercent)/100),debt=financed+markup;
  const commission=Math.round(input.includeCommission?clampMoney(input.fixedCommission)+financed*Math.max(0,input.commissionPercent)/100:0);
  // Комиссия, страховка и оформление платятся один раз при оформлении, в ежемесячный платёж не входят.
  const insurance=Math.round(input.includeInsurance?clampMoney(input.insurance):0),processingFee=Math.round(clampMoney(input.processingFee)),fees=commission+insurance+processingFee;
  const step=[1,10,100].includes(input.rounding)?input.rounding:1,graceMonths=normalizeGraceMonths(input.graceMonths);
  const kind:LeaseSchedule=isLeaseSchedule(input.schedule)&&!leaseScheduleProblem(input.schedule,months,graceMonths)?input.schedule:"monthly";
  const schedule=amortize(debt,input.zeroPercent?0:Math.max(0,Math.min(100,input.annualRate||0)),months,kind,graceMonths,step);
  const interest=schedule.reduce((sum,row)=>sum+row.interest,0),paid=schedule.reduce((sum,row)=>sum+row.payment,0);
  const graceCount=kind==="grace"?graceMonths:0,regular=schedule[Math.min(graceCount,schedule.length-1)];
  return {price,optionsTotal,delivery,discount,downPayment,financed,markup,debt,commission,insurance,processingFee,fees,interest,overpayment:markup+interest+fees,contractTotal:paid+fees,
    /** Обычный платёж за период: для квартала за квартал; для льготного периода платёж после льготы; для убывающего первый (самый большой). */
    monthly:regular?.payment??0,firstPayment:schedule[0]?.payment??0,lastPayment:schedule.at(-1)?.payment??0,periodMonths:LEASE_SCHEDULE_INFO[kind].period,scheduleKind:kind,graceMonths:graceCount,schedule};
}

/**
 * График как в банке: ставка за период = годовая / 12 × месяцев в периоде, процент начисляется на остаток долга.
 * Аннуитет: платёж = долг × i / (1 − (1 + i)^−n); сверено с калькулятором АБанка до сома.
 * Суммы в целых сомах, последний платёж закрывает остаток копеечных округлений.
 */
function amortize(debt:number,annualRate:number,months:number,kind:LeaseSchedule,graceMonths:number,step:number):InstallmentRow[]{
  const period=LEASE_SCHEDULE_INFO[kind].period,count=Math.max(1,Math.round(months/period)),rate=annualRate/100*period/12;
  const grace=kind==="grace"?Math.min(graceMonths,count-1):0,amortCount=count-grace;
  const annuity=rate?debt*rate/-Math.expm1(-amortCount*Math.log1p(rate)):debt/amortCount;
  const regular=step===1?Math.round(annuity):Math.ceil(annuity/step)*step,equalPrincipal=Math.round(debt/count);
  const rows:InstallmentRow[]=[];let balance=debt;
  for(let k=1;k<=count;k++){
    const interest=Math.round(balance*rate);
    const principal=k<=grace?0:k===count?balance:Math.max(0,Math.min(balance,kind==="differentiated"?equalPrincipal:regular-interest));
    balance-=principal;
    rows.push({month:k*period,payment:principal+interest,principal,interest,balance});
  }
  return rows;
}
