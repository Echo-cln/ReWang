import assert from 'node:assert/strict';
import {quotes,selectQuotes,sectorStats,demoHistory} from '../lib/quote-catalog.ts';
assert.equal(quotes.length,44);assert.equal(new Set(quotes.map(x=>x.id)).size,44);
for(const market of ['A股','港股','美股']){const a=selectQuotes({market});assert.ok(a.length>=6);assert.equal(new Set(a.map(x=>x.currency)).size,1);const ranked=a.filter(x=>x.status!=='停牌');for(let i=1;i<ranked.length;i++)assert.ok(ranked[i-1].changePct>=ranked[i].changePct);const reverse=selectQuotes({market,ascending:true}).filter(x=>x.status!=='停牌');for(let i=1;i<reverse.length;i++)assert.ok(reverse[i-1].changePct<=reverse[i].changePct);const sum=sectorStats(market).reduce((n,x)=>n+x.count,0);assert.equal(sum,a.length);}
assert.equal(selectQuotes({market:'A股',query:'gzmt'})[0].name,'贵州茅台');assert.equal(selectQuotes({market:'A股',query:'600519'})[0].name,'贵州茅台');assert.equal(selectQuotes({market:'美股',query:'Apple'})[0].code,'AAPL');assert.equal(selectQuotes({market:'A股',query:'不存在'}).length,0);
assert.equal(selectQuotes({market:'港股',watchOnly:true,watch:['00700.HK']})[0].name,'腾讯控股');assert.equal(selectQuotes({market:'A股',watchOnly:true,watch:[]}).length,0);
for(const board of ['沪市主板','深市主板','创业板','科创板'])assert.ok(selectQuotes({market:'A股',board}).length>0);
for(const row of quotes){assert.ok(row.high>=Math.max(row.open,row.price));assert.ok(row.low<=Math.min(row.open,row.price));assert.ok(Math.abs(row.changePct-(row.price/row.previous-1)*100)<.006);const h=demoHistory(row);assert.equal(h.at(-1).close,row.price);assert.ok(h.every((x,i)=>!i||x.date>h[i-1].date));if(row.status==='停牌'){assert.equal(row.volume,0);assert.equal(row.amount,0)}}
assert.ok(quotes.some(x=>x.status==='涨停'));assert.ok(quotes.some(x=>x.status==='跌停'));assert.ok(quotes.some(x=>x.status==='停牌'));assert.ok(quotes.some(x=>x.changePct===0));
console.log('PASS: 44 identities, 3 markets, 4 A-share boards, sector coverage, search, watchlist, rankings, OHLC and chart consistency');
