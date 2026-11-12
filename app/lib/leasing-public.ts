import { getPublishedRecords, type PublicRecord } from "./public-records";
import { leaseTermChoices, normalizeLeaseMaxMonths, LEASE_TERM_DEFAULT_MAX, type LeaseModelTerms, type LeaseOption, type LeaseProgram, type LeasePromotion, type LeasePublicConfig } from "./leasing";

/**
 * Настройки срока лизинга: site_settings key='leasing', value {"maxMonths":84}.
 * Отдельная строка, чтобы её не затирало сохранение контактов сайта. Нет строки: 84 месяца.
 */
export async function getLeaseTermSettings():Promise<{maxMonths:number;version:number}>{
  try{
    const {ensureDb,getRawDb}=await import("../../db");await ensureDb();
    const row=await getRawDb().prepare("SELECT value,version FROM site_settings WHERE key='leasing'").first<{value:string;version:number}>();
    if(!row)return {maxMonths:LEASE_TERM_DEFAULT_MAX,version:0};
    let value:{maxMonths?:unknown}={};try{value=JSON.parse(row.value)}catch{/* битое значение: срок по умолчанию */}
    return {maxMonths:normalizeLeaseMaxMonths(value.maxMonths),version:row.version};
  }catch{return {maxMonths:LEASE_TERM_DEFAULT_MAX,version:0}}
}

const num=(value:unknown,fallback=0)=>Number.isFinite(Number(value))?Math.max(0,Number(value)):fallback;
const yes=(value:unknown,fallback=false)=>value==="Да"||value===true||value==="true"||(value==null?fallback:false);
const list=(value:unknown)=>String(value||"").split(/[,;\n]/).map(item=>item.trim()).filter(Boolean);
const options=(value:unknown):LeaseOption[]=>String(value||"").split(/\r?\n/).map(line=>{const [name,price]=line.split("|");return {name:(name||"").trim(),price:num(price)}}).filter(item=>item.name);
const alive=(row:PublicRecord)=>{const now=new Date().toISOString().slice(0,10),start=row.data.startsAt,end=row.data.endsAt;return (!start||start<=now)&&(!end||end>=now)};

export async function getLeasingPublicConfig():Promise<LeasePublicConfig>{
  const [programRows,modelRows,promotionRows,{maxMonths}]=await Promise.all([getPublishedRecords("leasing_terms"),getPublishedRecords("leasing_model_terms"),getPublishedRecords("promotions"),getLeaseTermSettings()]);
  const terms=leaseTermChoices(maxMonths);
  const programs:LeaseProgram[]=programRows.filter(alive).map(row=>({id:row.id,name:row.title,programType:row.data.programType||"Рассрочка",currency:row.data.currency||"KGS",termsMonths:terms,minDownPercent:num(row.data.minDownPercent,20),maxDownPercent:num(row.data.maxDownPercent,90),minDownAmount:num(row.data.minDownAmount),downPaymentMode:row.data.downPaymentMode||"Оба варианта",markupPercent:num(row.data.markupPercent),annualRate:num(row.data.annualRate),fixedCommission:num(row.data.fixedCommission),commissionPercent:num(row.data.commissionPercent),insurance:num(row.data.insurance),processingFee:num(row.data.processingFee),delivery:num(row.data.delivery),includeDelivery:yes(row.data.includeDelivery,true),includeInsurance:yes(row.data.includeInsurance),includeCommission:yes(row.data.includeCommission,true),discountOrder:row.data.discountOrder==="После первого взноса"?"after":"before",rounding:([1,10,100].includes(num(row.data.rounding))?num(row.data.rounding):1) as 1|10|100,zeroPercent:yes(row.data.zeroPercent),options:options(row.data.options),notes:row.data.notes||row.subtitle}));
  const models:LeaseModelTerms[]=modelRows.map(row=>({tractorSlug:row.data.tractorSlug,enabled:yes(row.data.enabled,true),price:row.data.price?num(row.data.price):undefined,minDownPercent:row.data.minDownPercent?num(row.data.minDownPercent):undefined,termsMonths:terms,markupPercent:row.data.markupPercent?num(row.data.markupPercent):undefined,annualRate:row.data.annualRate?num(row.data.annualRate):undefined,fixedCommission:row.data.fixedCommission?num(row.data.fixedCommission):undefined,commissionPercent:row.data.commissionPercent?num(row.data.commissionPercent):undefined,discount:row.data.discount?num(row.data.discount):undefined,maxFinancing:row.data.maxFinancing?num(row.data.maxFinancing):undefined,options:row.data.options?options(row.data.options):undefined,notes:row.data.notes||row.subtitle})).filter(row=>row.tractorSlug);
  const promotions:LeasePromotion[]=promotionRows.filter(alive).map(row=>({id:row.id,name:row.title,tractorSlugs:list(row.data.tractorSlugs),discountType:row.data.discountType==="Сумма"?"amount":"percent",discount:num(row.data.discount),reducedDownPercent:row.data.reducedDownPercent?num(row.data.reducedDownPercent):undefined,zeroPercent:yes(row.data.zeroPercent),gift:row.data.gift||"",startsAt:row.data.startsAt||"",endsAt:row.data.endsAt||""}));
  return {programs,models,promotions,maxMonths};
}
