import assert from "node:assert/strict";
import test from "node:test";
import { calculateInstallment, calculateLease, leaseScheduleProblem, parseLeaseSchedules, convertDownPayment, formatLeaseTerm, isValidLeaseTerm, leaseTermChoices, normalizeLeaseMaxMonths, salePrice } from "../app/lib/leasing.ts";

test("zero-rate lease preserves principal exactly", () => {
  const result = calculateLease({ price: 3_000_000, downPercent: 30, months: 84, annualRate: 0, fee: 0, method: "annuity" });
  assert.equal(result.down, 90_000_000);
  assert.equal(result.financed, 210_000_000);
  assert.equal(result.interest, 0);
  assert.equal(result.schedule.at(-1).balance, 0);
  assert.equal(result.schedule.reduce((sum, row) => sum + row.principal, 0), result.financed);
});

test("annuity schedule closes balance and includes interest", () => {
  const result = calculateLease({ price: 5_750_000, downPercent: 25, months: 60, annualRate: 16, fee: 25_000, method: "annuity" });
  assert.equal(result.schedule.length, 60);
  assert.equal(result.schedule.at(-1).balance, 0);
  assert.ok(result.interest > 0);
  assert.equal(result.total, result.down + result.fee + result.financed + result.interest);
});

test("differentiated payments decrease and sale discount is bounded", () => {
  const result = calculateLease({ price: 4_000_000, downPercent: 20, months: 36, annualRate: 12, fee: 0, method: "differentiated" });
  assert.ok(result.schedule[0].payment > result.schedule.at(-1).payment);
  assert.equal(result.schedule.at(-1).balance, 0);
  assert.equal(salePrice(4_000_000, 10), 3_600_000);
  assert.equal(salePrice(4_000_000, 150), 400_000);
});

test("invalid financial values are rejected", () => {
  assert.throws(() => calculateLease({ price: 0, downPercent: 20, months: 36, annualRate: 12, fee: 0, method: "annuity" }));
  assert.throws(() => calculateLease({ price: 1_000_000, downPercent: 20, months: 85, annualRate: 12, fee: 0, method: "annuity" }));
});

test("leasing calculator follows the configured business formula and zero-percent override",()=>{
  const result=calculateInstallment({price:4_000_000,options:[{name:"Ковш",price:150_000}],delivery:50_000,discount:200_000,downMode:"percent",downValue:25,months:24,markupPercent:12,annualRate:0,fixedCommission:20_000,commissionPercent:1,insurance:0,processingFee:5_000,includeDelivery:true,includeInsurance:false,includeCommission:true,discountOrder:"before",rounding:100,zeroPercent:false});
  assert.equal(result.downPayment,1_000_000);
  assert.equal(result.financed,3_000_000);
  assert.equal(result.contractTotal,3_415_000);
  assert.equal(result.schedule.at(-1).balance,0);
  const zero=calculateInstallment({price:4_000_000,options:[],delivery:0,discount:0,downMode:"amount",downValue:1_000_000,months:12,markupPercent:30,annualRate:20,fixedCommission:0,commissionPercent:0,insurance:0,processingFee:0,includeDelivery:false,includeInsurance:false,includeCommission:false,discountOrder:"before",rounding:1,zeroPercent:true});
  assert.equal(zero.markup,0);
  assert.equal(zero.overpayment,0);
  assert.equal(zero.contractTotal,3_000_000);
});

test("down-payment mode conversion preserves the selected economic value",()=>{
  const rules={price:4_375_000,minPercent:30,maxPercent:90,minAmount:500_000};
  const amount=convertDownPayment(40,"percent","amount",rules);
  assert.equal(amount,1_750_000);
  assert.equal(convertDownPayment(amount,"amount","percent",rules),40);
  assert.equal(convertDownPayment(1,"percent","amount",rules),1_312_500);
  assert.equal(convertDownPayment(99,"percent","amount",rules),3_937_500);
});

test("installment schedule never becomes negative and the final payment closes rounding",()=>{
  const result=calculateInstallment({price:4_321_987,options:[],delivery:0,discount:0,downMode:"percent",downValue:33.33,months:84,markupPercent:7.5,annualRate:11.7,fixedCommission:12345,commissionPercent:0.7,insurance:0,processingFee:2000,includeDelivery:false,includeInsurance:false,includeCommission:true,discountOrder:"before",rounding:100,zeroPercent:false});
  assert.equal(result.schedule.at(-1).balance,0);
  assert.ok(result.schedule.every(row=>row.payment>=0&&row.balance>=0));
  assert.equal(result.schedule.reduce((sum,row)=>sum+row.payment,0)+result.fees,result.contractTotal);
});

test("lease term follows the configured maximum with a hard cap of 120 months", () => {
  assert.equal(normalizeLeaseMaxMonths(undefined), 84);
  assert.equal(normalizeLeaseMaxMonths("96"), 96);
  assert.equal(normalizeLeaseMaxMonths(500), 120);
  assert.equal(normalizeLeaseMaxMonths(0), 84);
  assert.ok(isValidLeaseTerm(1, 84) && isValidLeaseTerm(84, 84));
  assert.ok(!isValidLeaseTerm(85, 84) && !isValidLeaseTerm(0, 84) && !isValidLeaseTerm(12.5, 84));
  assert.ok(isValidLeaseTerm(96, 96) && !isValidLeaseTerm(121, 500));
  assert.deepEqual(leaseTermChoices(84), [3, 6, 12, 24, 36, 48, 60, 84]);
  assert.deepEqual(leaseTermChoices(40), [3, 6, 12, 24, 36, 40]);
  assert.deepEqual(leaseTermChoices(96), [3, 6, 12, 24, 36, 48, 60, 84, 96]);
  assert.equal(formatLeaseTerm(84), "7 лет (84 месяца)");
  assert.equal(formatLeaseTerm(18), "18 месяцев");
  const lease = calculateLease({ price: 1_000_000, downPercent: 20, months: 96, annualRate: 12, fee: 0, method: "annuity" }, 96);
  assert.equal(lease.schedule.length, 96);
  assert.throws(() => calculateLease({ price: 1_000_000, downPercent: 20, months: 97, annualRate: 12, fee: 0, method: "annuity" }, 96), /до 96 месяцев/);
});

// Цифры с калькулятора АБанка («Гослизинг-3», 6% годовых): стоимость 1 400 000, взнос 10%, к финансированию 1 260 000.
const abank=(months,schedule="monthly")=>calculateInstallment({price:1_400_000,options:[],delivery:0,discount:0,downMode:"percent",downValue:10,months,markupPercent:0,annualRate:6,fixedCommission:0,commissionPercent:0,insurance:0,processingFee:0,includeDelivery:false,includeInsurance:false,includeCommission:false,discountOrder:"before",rounding:1,zeroPercent:false,schedule});
test("monthly and quarterly payments match the ABank calculator to the som",()=>{
  for(const [months,monthly] of [[12,108_444],[36,38_332],[60,24_359],[84,18_407]]){
    const r=abank(months);
    assert.equal(r.financed,1_260_000);
    assert.equal(r.monthly,monthly,`${months} мес.`);
    assert.equal(r.schedule.length,months);
    assert.equal(r.schedule.at(-1).balance,0);
    assert.equal(r.schedule.reduce((s,row)=>s+row.principal,0),1_260_000);
  }
  for(const [months,quarterly] of [[12,326_900],[36,115_517],[60,73_390],[84,55_441]]){
    const r=abank(months,"quarterly");
    assert.equal(r.monthly,quarterly,`квартал ${months} мес.`);
    assert.equal(r.schedule.length,months/3);
    assert.equal(r.schedule[0].month,3);
    assert.equal(r.periodMonths,3);
  }
});
test("interest is charged on the remaining debt, not on the whole sum for the whole term",()=>{
  const r=abank(84);
  assert.equal(r.schedule[0].interest,6_300);
  assert.ok(r.schedule[1].interest<r.schedule[0].interest);
  assert.ok(Math.abs(r.overpayment-286_188)<100,String(r.overpayment));
  assert.equal(r.contractTotal,r.financed+r.overpayment);
});
test("seasonal, grace and decreasing schedules close the debt",()=>{
  const half=abank(84,"semiannual"),grace=abank(84,"grace"),diff=abank(84,"differentiated"),monthly=abank(84);
  assert.equal(half.schedule.length,14);assert.equal(half.schedule.at(-1).balance,0);assert.equal(half.schedule[0].month,6);
  assert.deepEqual(grace.schedule.slice(0,6).map(r=>r.principal),[0,0,0,0,0,0]);
  assert.equal(grace.firstPayment,6_300);assert.ok(grace.monthly>monthly.monthly);assert.equal(grace.schedule.at(-1).balance,0);
  assert.ok(diff.firstPayment>diff.lastPayment);assert.ok(diff.overpayment<monthly.overpayment);assert.equal(diff.schedule.at(-1).balance,0);
  // срок не подходит: считаем каждый месяц
  assert.equal(abank(10,"quarterly").scheduleKind,"monthly");
  assert.equal(leaseScheduleProblem("semiannual",9),"Нужен срок, кратный 6 месяцам");
  assert.equal(leaseScheduleProblem("grace",6,6),"Нужен срок больше 6 мес.");
});
test("fees are paid once at signing and do not enter the monthly payment",()=>{
  const base=abank(36),withFee=calculateInstallment({...{price:1_400_000,options:[],delivery:0,discount:0,downMode:"percent",downValue:10,months:36,markupPercent:0,annualRate:6,fixedCommission:5_000,commissionPercent:1,insurance:0,processingFee:0,includeDelivery:false,includeInsurance:false,includeCommission:true,discountOrder:"before",rounding:1,zeroPercent:false}});
  assert.equal(withFee.monthly,base.monthly);
  assert.equal(withFee.fees,17_600);
  assert.equal(withFee.contractTotal,base.contractTotal+17_600);
});
test("bank schedule list from the admin always keeps the monthly option",()=>{
  assert.deepEqual(parseLeaseSchedules(""),["monthly","quarterly","semiannual","grace","differentiated"]);
  assert.deepEqual(parseLeaseSchedules("quarterly, grace"),["monthly","quarterly","grace"]);
  assert.deepEqual(parseLeaseSchedules("мусор"),["monthly","quarterly","semiannual","grace","differentiated"]);
});
