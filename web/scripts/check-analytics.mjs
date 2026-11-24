/** Run meaningful accounting, cutoff and model evaluation checks without a browser. */
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'rewang-analytics-'));
try{execFileSync('./node_modules/.bin/tsc',['lib/portfolio-analysis.ts','lib/quote-catalog.ts','lib/temporal-model.ts','--outDir',dir,'--module','commonjs','--target','ES2022','--skipLibCheck']);writeFileSync(join(dir,'package.json'),'{"type":"commonjs"}');const require=createRequire(import.meta.url),a=require(join(dir,'portfolio-analysis.js')),{trainTemporal}=require(join(dir,'temporal-model.js'));let checks=0;function check(fn){fn();checks++}
const p=a.exampleAccount(),r=a.accountAnalysis(p);
check(()=>assert(Math.abs(r.rows.reduce((s,x)=>s+x.total,0)-r.pnl)<1e-7));
check(()=>assert.equal(r.curve.at(-1).assets,r.assets));
check(()=>assert(r.curve.every(x=>x.date<=a.analysisDays[p.cursor])));
check(()=>assert.equal(r.curve.length,p.cursor-p.start+1));
check(()=>assert.equal(a.marketAnalysis(a.analysisDays[15],60)[0].n,16));
const d=a.orderReview(p.orders[0],p.orders[0].index+5);
check(()=>assert.notEqual(d.horizons[0].value,null));check(()=>assert.equal(d.horizons[1].value,null));
const closed={...p,orders:[...p.orders,{...p.orders[0],id:99,side:'sell',index:20,quantity:100,price:a.histories['300750.SZ'][20].close,fee:5}]},c=a.accountAnalysis(closed);
check(()=>assert.equal(c.rows.find(x=>x.symbol==='300750.SZ').quantity,0));
check(()=>assert(Math.abs(c.rows.reduce((s,x)=>s+x.total,0)-c.pnl)<1e-7));
const changed=a.accountAnalysis({...p,orders:p.orders.slice(1)});
check(()=>assert.deepEqual(changed.curve.map(x=>x.hold),r.curve.map(x=>x.hold)));
const model=trainTemporal('300750.SZ',['5日收益','20日波动'],'2026-11-13');
check(()=>assert.equal(model.tp+model.tn+model.fp+model.fn,model.test.n));
check(()=>assert(model.train.to<model.validation.from&&model.validation.to<model.test.from));
check(()=>assert(model.predictions.every(x=>x.labelDate<=model.asOf)));
check(()=>assert.throws(()=>trainTemporal('300750.SZ',['5日收益'],'2026-08-11')));
const cutoff='2026-10-30',before=trainTemporal('300750.SZ',['5日收益'],cutoff),last=a.histories['300750.SZ'].at(-1),original=last.close;last.close*=2;const after=trainTemporal('300750.SZ',['5日收益'],cutoff);last.close=original;
check(()=>assert.deepEqual(before,after));
check(()=>assert.equal(a.marketAnalysis(a.analysisDays[25],20).length,32));
console.log(JSON.stringify({status:'passed',checks,sample:{assets:r.assets,pnl:r.pnl,fees:r.fees,asOf:a.analysisDays[p.cursor]},modelTestSamples:model.test.n},null,2));
}finally{rmSync(dir,{recursive:true,force:true})}
