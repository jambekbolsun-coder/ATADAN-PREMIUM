export type LeaseInput = { price: number; downPercent: number; months: number; annualRate: number; fee: number; method: "annuity" | "differentiated" };
export type LeasePayment = { month: number; principal: number; interest: number; payment: number; balance: number };
// All amounts in the schedule are integer tyiyn. The final payment closes the balance exactly.
export function calculateLease(input: LeaseInput) {
  const { price, downPercent, months, annualRate, fee, method } = input;
  if (![price, downPercent, months, annualRate, fee].every(Number.isFinite)
    || price <= 0 || price > 1_000_000_000 || downPercent < 0 || downPercent > 100
    || !Number.isInteger(months) || months < 1 || months > 84 || annualRate < 0 || annualRate > 100
    || fee < 0 || fee > price || !["annuity", "differentiated"].includes(method)) throw new Error("Проверьте стоимость, взнос, ставку и срок от 1 до 84 месяцев.");
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
export type LeaseProgram={id:string;name:string;programType:string;currency:string;termsMonths:number[];minDownPercent:number;maxDownPercent:number;minDownAmount:number;downPaymentMode:string;markupPercent:number;annualRate:number;fixedCommission:number;commissionPercent:number;insurance:number;processingFee:number;delivery:number;includeDelivery:boolean;includeInsurance:boolean;includeCommission:boolean;discountOrder:"before"|"after";rounding:1|10|100;zeroPercent:boolean;options:LeaseOption[];notes:string};
export type LeaseModelTerms={tractorSlug:string;enabled:boolean;price?:number;minDownPercent?:number;termsMonths?:number[];markupPercent?:number;annualRate?:number;fixedCommission?:number;commissionPercent?:number;discount?:number;maxFinancing?:number;options?:LeaseOption[];notes?:string};
export type LeasePromotion={id:string;name:string;tractorSlugs:string[];discountType:"percent"|"amount";discount:number;reducedDownPercent?:number;zeroPercent:boolean;gift:string;startsAt:string;endsAt:string};
export type LeasePublicConfig={programs:LeaseProgram[];models:LeaseModelTerms[];promotions:LeasePromotion[]};
export type InstallmentInput={price:number;options:LeaseOption[];delivery:number;discount:number;downMode:"percent"|"amount";downValue:number;months:number;markupPercent:number;annualRate:number;fixedCommission:number;commissionPercent:number;insurance:number;processingFee:number;includeDelivery:boolean;includeInsurance:boolean;includeCommission:boolean;discountOrder:"before"|"after";rounding:1|10|100;zeroPercent:boolean};

const clampMoney=(value:number)=>Math.max(0,Math.min(1_000_000_000,Number(value)||0));
export function calculateInstallment(input:InstallmentInput){
  const months=Math.max(1,Math.min(120,Math.round(input.months))),price=clampMoney(input.price),optionsTotal=input.options.reduce((sum,item)=>sum+clampMoney(item.price),0),delivery=input.includeDelivery?clampMoney(input.delivery):0,discount=Math.min(price+optionsTotal+delivery,clampMoney(input.discount));
  const downBase=input.discountOrder==="before"?price+optionsTotal+delivery-discount:price+optionsTotal+delivery;
  const downPayment=Math.min(price+optionsTotal+delivery-discount,input.downMode==="percent"?downBase*Math.max(0,Math.min(100,input.downValue))/100:clampMoney(input.downValue));
  const financed=Math.max(0,price+optionsTotal+delivery-discount-downPayment);
  const rateMarkup=input.zeroPercent?0:financed*(Math.max(0,input.markupPercent)+Math.max(0,input.annualRate)*months/12)/100;
  const commission=input.includeCommission?clampMoney(input.fixedCommission)+financed*Math.max(0,input.commissionPercent)/100:0;
  const insurance=input.includeInsurance?clampMoney(input.insurance):0,fees=commission+insurance+clampMoney(input.processingFee);
  const contractTotal=financed+rateMarkup+fees,step=[1,10,100].includes(input.rounding)?input.rounding:1,monthly=Math.ceil(contractTotal/months/step)*step;
  let balance=contractTotal;const schedule=Array.from({length:months},(_,index)=>{const payment=index===months-1?balance:Math.min(balance,monthly);balance=Math.max(0,balance-payment);return {month:index+1,payment,balance}});
  return {price,optionsTotal,delivery,discount,downPayment,financed,markup:rateMarkup,commission,insurance,processingFee:clampMoney(input.processingFee),overpayment:rateMarkup+fees,contractTotal,monthly,schedule};
}
