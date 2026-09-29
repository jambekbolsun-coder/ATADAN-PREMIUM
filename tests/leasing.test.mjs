import assert from "node:assert/strict";
import test from "node:test";
import { calculateInstallment, calculateLease, convertDownPayment, salePrice } from "../app/lib/leasing.ts";

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
  assert.equal(result.schedule.reduce((sum,row)=>sum+row.payment,0),result.contractTotal);
});
