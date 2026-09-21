import test from 'node:test';
import assert from 'node:assert/strict';
import { validPublicPhone, phoneCountries, powerRanges, regions, LEASE_MONTHS } from '../app/lib/customer-input.ts';
import { calculateInstallment } from '../app/lib/leasing.ts';
test('customer phones accept all supported prefixes and reject incomplete numbers',()=>{
 for(const phone of ['+996 700 123 456','+7 999 123 45 67','+7 701 123 45 67','+998 90 123 45 67','+992 90 123 45 67'])assert.equal(validPublicPhone(phone),true,phone);
 for(const phone of ['+996','700123456','+99670012345','+9967001234567','+441234567890','+996abc700123456'])assert.equal(validPublicPhone(phone),false,phone);
 assert.equal(phoneCountries.length,5);
});
test('quiz ranges include both boundary models and all nine Kyrgyz regions/cities',()=>{
 assert.equal(regions.length,9);assert.equal(new Set(regions).size,9);
 for(const [index,power] of [[0,50],[0,90],[1,90],[1,140],[2,140],[2,180],[3,180],[3,240]])assert.ok(power>=powerRanges[index].min&&power<=powerRanges[index].max);
});
test('seven-year payment schedule preserves total with rounded last payment',()=>{
 assert.equal(LEASE_MONTHS,84);
 const input={price:2500000,options:[],delivery:0,discount:0,downMode:'percent',downValue:30,months:LEASE_MONTHS,markupPercent:0,annualRate:6,fixedCommission:0,commissionPercent:0,insurance:0,processingFee:0,includeDelivery:true,includeInsurance:false,includeCommission:true,discountOrder:'before',rounding:100,zeroPercent:false};
 const result=calculateInstallment(input),larger=calculateInstallment({...input,downValue:50});
 assert.equal(result.schedule.length,84);assert.equal(result.schedule.at(-1).balance,0);assert.ok(Math.abs(result.schedule.reduce((sum,row)=>sum+row.payment,0)-result.contractTotal)<0.01);assert.ok(larger.monthly<result.monthly);
});
