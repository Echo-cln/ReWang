import test from 'node:test';
import assert from 'node:assert/strict';
import {research} from '../lib/research.ts';
test('research uses filtered prices, known drawdown and aligned returns',()=>{
 const prices=[100,110,99,108].flatMap((v,i)=>['A','B'].map(symbol=>({symbol,price_date:`2026-01-0${i+1}`,close_minor:v*(symbol==='A'?100:200)})));
 const result=research(prices);
 assert.ok(Math.abs(result.series[0].returnPct-8)<1e-10);
 assert.ok(Math.abs(result.series[0].maxDrawdownPct+10)<1e-10);
 assert.ok(Math.abs(result.correlation[0].values[1].value-1)<1e-10);
 assert.equal(result.correlation[0].values[1].n,3);
 const limited=research(prices,'2026-01-03');
 assert.equal(limited.series[0].observations,2);
 assert.equal(limited.correlation[0].values[1].value,null);
 assert.equal(research([]).series.length,0);
});
