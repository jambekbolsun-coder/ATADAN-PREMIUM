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
