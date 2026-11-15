import type {Bar} from './market-feed';
export type Order={id:string;date:string;side:'buy'|'sell';quantity:number;price:number;fee:number;reason:string;cashAfter:number};
export type Paper={version:1;symbol:string;mode:'history'|'latest';start:string;cursor:string;cash:number;quantity:number;cost:number;realized:number;orders:Order[]};
const cents=(n:number)=>Math.round(n*100)/100;
export function startPaper(symbol:string,mode:Paper['mode'],date:string):Paper{return {version:1,symbol,mode,start:date,cursor:date,cash:100000,quantity:0,cost:0,realized:0,orders:[]};}
export function execute(p:Paper,side:Order['side'],qty:number,price:number,date:string,reason:string):Paper{
 if(!Number.isSafeInteger(qty)||qty<1||qty>1000000)throw new Error('请输入 1 至 1,000,000 的整数股数');
 if(!Number.isFinite(price)||price<=0)throw new Error('没有可用报价，交易未执行');
 if(!reason.trim()||reason.trim().length>500)throw new Error('请填写 1 至 500 字决策理由');
 if(date<p.cursor)throw new Error('不能使用过去日期修改已发生交易');
 if(side==='sell'&&qty>p.quantity)throw new Error('可卖持仓不足');
 const amount=cents(qty*price),fee=cents(Math.max(1,amount*.001));
 if(side==='buy'&&amount+fee>p.cash)throw new Error('可用现金不足，交易未执行');
 const cost=side==='buy'?cents(p.cost+amount+fee):cents(p.cost*(1-qty/p.quantity));
 const realized=side==='sell'?cents(p.realized+amount-fee-p.cost*qty/p.quantity):p.realized;
 const cash=cents(p.cash+(side==='buy'?-amount-fee:amount-fee));
 return {...p,cursor:date,cash,quantity:p.quantity+(side==='buy'?qty:-qty),cost,realized,orders:[...p.orders,{id:crypto.randomUUID(),date,side,quantity:qty,price,fee,reason:reason.trim(),cashAfter:cash}]};
}
export function paperStats(p:Paper,price:number){const value=cents(p.quantity*price);return {value,assets:cents(p.cash+value),pnl:cents(p.cash+value-100000),unrealized:cents(value-p.cost),realized:p.realized};}
export function historicalBars(bars:Bar[],cursor:string){return bars.filter(b=>b.date<=cursor);}
export function riskProfile(bars:Bar[]){if(bars.length<2)return null;const changes=bars.slice(1).map((b,i)=>b.close/bars[i].close-1),mean=changes.reduce((a,b)=>a+b,0)/changes.length,variance=changes.length>1?changes.reduce((a,b)=>a+(b-mean)**2,0)/(changes.length-1):0;let peak=bars[0].close,drawdown=0;for(const b of bars){peak=Math.max(peak,b.close);drawdown=Math.min(drawdown,b.close/peak-1);}return {returnPct:(bars.at(-1)!.close/bars[0].close-1)*100,volatilityPct:Math.sqrt(variance*252)*100,drawdownPct:drawdown*100,observations:bars.length};}
