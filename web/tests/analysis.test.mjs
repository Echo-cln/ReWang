import test from 'node:test';
import assert from 'node:assert/strict';
import { replay, baseline, validateLedger, feeFor } from '../lib/analysis.ts';
const flow = (id, date, kind, amount, sequence=id) => ({ id, account_id:1, effective_date:date, kind, amount_minor:amount, memo:'', sequence, created_at:'' });
const trade = (id, date, side, quantity, price, fee, sequence=id) => ({ id, account_id:1, effective_date:date, symbol:'A', side, quantity, price_minor:price, fee_minor:fee, sequence, created_at:'' });
const prices = [{symbol:'A',price_date:'2026-01-01',close_minor:1000,source:'FIXTURE'}, {symbol:'A',price_date:'2026-01-02',close_minor:1200,source:'FIXTURE'}, {symbol:'A',price_date:'2026-01-03',close_minor:1100,source:'FIXTURE'}];
test('event replay matches hand-calculated 3-day fixture',()=>{
 const f=[flow(1,'2026-01-01','deposit',10000,1)];
 const t=[trade(1,'2026-01-01','buy',5,1000,100,2),trade(2,'2026-01-03','sell',2,1100,100,3)];
 assert.equal(validateLedger(f,t),null);
 assert.deepEqual(replay(f,t,prices).map(x=>[x.cashMinor,x.assetsMinor,x.pnlMinor]),[[4900,9900,-100],[4900,10900,900],[7000,10300,300]]);
 assert.equal(replay(f,t,prices,true).at(-1).assetsMinor,10493);
 assert.equal(baseline(f,prices,'A').series.at(-1).assetsMinor,10891);
});
test('historical edits are rejected if a later event overdrafts cash or holdings',()=>{
 const f=[flow(1,'2026-01-01','deposit',10000,1)];
 const t=[trade(2,'2026-01-01','buy',5,1000,0,2),trade(3,'2026-01-03','sell',5,1100,0,3)];
 assert.match(validateLedger([flow(1,'2026-01-01','deposit',4000,1)],t),/资金不足/);
 assert.match(validateLedger(f,[t[0],trade(3,'2026-01-03','sell',6,1100,0,3)]),/超过当时持仓/);
});
test('fixed rule buys only after deposit, preserves cash on later price dates',()=>{
 const f=[flow(1,'2026-01-01','deposit',1999,1)];
 const p=[...prices,{symbol:'A',price_date:'2026-01-04',close_minor:900,source:'FIXTURE'}];
 const s=baseline(f,p,'A').series;
 assert.equal(s[0].holdings.A,1);
 assert.equal(s.at(-1).holdings.A,1);
 assert.equal(s.at(-1).cashMinor,998);
 assert.equal(feeFor(1000),1);
});
