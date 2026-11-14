export type Flow = { id: number; account_id: number; effective_date: string; kind: "deposit" | "withdrawal"; amount_minor: number; memo: string; sequence: number; created_at: string };
export type Trade = { id: number; account_id: number; effective_date: string; symbol: string; side: "buy" | "sell"; quantity: number; price_minor: number; fee_minor: number; sequence: number; created_at: string };
export type Price = { symbol: string; price_date: string; close_minor: number; source: string };
export type MarketPoint = { date: string; closeMinor: number };
export type LedgerPoint = { date: string; cashMinor: number; netContributionsMinor: number; assetsMinor: number | null; pnlMinor: number | null; holdings: Record<string, number>; prices: Record<string, { closeMinor: number; priceDate: string }> };

export function feeFor(notionalMinor: number) { return Math.round(notionalMinor * 0.001); }
export function validDate(s: unknown): s is string { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z")) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s; }
export function events(flows: Flow[], trades: Trade[]) {
  return [...flows.map(x => ({...x, eventType: "flow" as const})), ...trades.map(x => ({...x, eventType: "trade" as const}))].sort((a,b) => a.effective_date.localeCompare(b.effective_date) || a.sequence - b.sequence || a.id - b.id);
}
export function validateLedger(flows: Flow[], trades: Trade[]): string | null {
  let cash = 0; const units: Record<string, number> = {};
  for (const e of events(flows,trades)) {
    if (e.eventType === "flow") cash += e.kind === "deposit" ? e.amount_minor : -e.amount_minor;
    else {
      const total = e.quantity * e.price_minor;
      if (!Number.isSafeInteger(total) || !Number.isSafeInteger(cash + total)) return `${e.effective_date}：金额超出安全计算范围`;
      if (e.side === "buy") { cash -= total + e.fee_minor; units[e.symbol] = (units[e.symbol] || 0) + e.quantity; }
      else { units[e.symbol] = (units[e.symbol] || 0) - e.quantity; cash += total - e.fee_minor; }
      if (units[e.symbol] < 0) return `${e.effective_date}：${e.symbol} 卖出数量超过当时持仓`;
    }
    if (cash < 0) return `${e.effective_date}：资金不足，无法完成后续事件`;
  }
  return null;
}
export function replay(flows: Flow[], trades: Trade[], prices: Price[], uniformFee=false): LedgerPoint[] {
  const ev = events(flows,trades), px = [...prices].sort((a,b)=>a.price_date.localeCompare(b.price_date));
  const dates = [...new Set([...ev.map(e=>e.effective_date), ...px.map(p=>p.price_date)])].sort();
  let cash = 0, net = 0, ei=0, pi=0;
  const units: Record<string,number> = {}, known: Record<string,{closeMinor:number;priceDate:string}> = {};
  const out: LedgerPoint[] = [];
  for (const date of dates) {
    while (ei < ev.length && ev[ei].effective_date <= date) {
      const e=ev[ei++];
      if (e.eventType === "flow") { const n=e.kind==="deposit"?e.amount_minor:-e.amount_minor; cash+=n; net+=n; }
      else { const n=e.quantity*e.price_minor, fee=uniformFee?feeFor(n):e.fee_minor; cash += e.side==="buy" ? -n-fee:n-fee; units[e.symbol]=(units[e.symbol]||0)+(e.side==="buy"?e.quantity:-e.quantity); }
    }
    while (pi < px.length && px[pi].price_date <= date) {const p=px[pi++];known[p.symbol]={closeMinor:p.close_minor,priceDate:p.price_date};}
    let assets: number|null=cash;
    for (const [symbol, qty] of Object.entries(units)) if (qty>0) {
      if (!known[symbol]) {assets=null;break;}
      assets! += qty*known[symbol].closeMinor;
    }
    out.push({date,cashMinor:cash,netContributionsMinor:net,assetsMinor:assets,pnlMinor:assets===null?null:assets-net,holdings:{...units},prices:{...known}});
  }
  return out;
}
export function marketMetrics(series: MarketPoint[]) {
  const arr = [...series].sort((a,b)=>a.date.localeCompare(b.date)).filter(x=>x.closeMinor>0);
  const first=arr[0]?.closeMinor, last=arr.at(-1)?.closeMinor;
  const periodReturnPct=first && last && arr.length>1 ? (last/first-1)*100 : null;
  let peak=0, maxDd=0;
  for (const p of arr) {peak=Math.max(peak,p.closeMinor);maxDd=Math.max(maxDd,(peak-p.closeMinor)/peak);}
  const recent=arr.slice(-21); let volatilityPct: number|null=null;
  if (recent.length===21) {
    const returns=recent.slice(1).map((p,i)=>p.closeMinor/recent[i].closeMinor-1);
    const avg=returns.reduce((a,b)=>a+b,0)/returns.length;
    const variance=returns.reduce((a,b)=>a+(b-avg)**2,0)/(returns.length-1);
    volatilityPct=Math.sqrt(variance)*Math.sqrt(252)*100;
  }
  return {periodReturnPct,maxDrawdownPct:arr.length>1?maxDd*100:null,volatilityPct,observations:arr.length,firstDate:arr[0]?.date??null,lastDate:arr.at(-1)?.date??null};
}
export function baseline(flows: Flow[], prices: Price[], symbol: string): {series: LedgerPoint[]; error: string|null} {
  const target=prices.filter(p=>p.symbol===symbol).sort((a,b)=>a.price_date.localeCompare(b.price_date));
  const dates=[...new Set([...target.map(p=>p.price_date),...flows.map(f=>f.effective_date)])].sort();
  const ordered=[...flows].sort((a,b)=>a.effective_date.localeCompare(b.effective_date)||a.sequence-b.sequence);
  let cash=0, net=0, units=0, fi=0, pendingBuy=false; let last:{closeMinor:number;priceDate:string}|null=null;
  const out:LedgerPoint[]=[];
  for (const date of dates) {
    const today=target.find(p=>p.price_date===date);
    if (today) last={closeMinor:today.close_minor,priceDate:date};
    while(fi<ordered.length && ordered[fi].effective_date===date) {
      const f=ordered[fi++];
      if(f.kind==="deposit") {cash+=f.amount_minor;net+=f.amount_minor;pendingBuy=true;}
      else {
        net-=f.amount_minor;
        if(cash<f.amount_minor) {
          if(!today) return {series:out,error:`${date}：非交易日无法卖出基准标的满足出金`};
          const short=f.amount_minor-cash;
          const sell=Math.ceil(short/(today.close_minor*0.999));
          if(sell>units) return {series:out,error:`${date}：基准策略资产不足以出金`};
          units-=sell;cash+=sell*today.close_minor-feeFor(sell*today.close_minor);
        }
        cash-=f.amount_minor;
      }
    }
    if(today && pendingBuy && cash>=today.close_minor) {
      let buy=Math.floor(cash/(today.close_minor*1.001));
      while(buy>0 && buy*today.close_minor+feeFor(buy*today.close_minor)>cash) buy--;
      if(buy>0) {units+=buy;cash-=buy*today.close_minor+feeFor(buy*today.close_minor);}
    }
    if(today) pendingBuy=false;
    const assets=units && !last ? null : cash+units*(last?.closeMinor||0);
    out.push({date,cashMinor:cash,netContributionsMinor:net,assetsMinor:assets,pnlMinor:assets===null?null:assets-net,holdings:{[symbol]:units},prices:last?{[symbol]:last}:{}});
  }
  return {series:out,error:null};
}
export function syntheticPrices() {
  const names=[{symbol:"DEMO_A",name:"山岚指数（演示）",base:10200},{symbol:"DEMO_B",name:"潮汐稳健（演示）",base:8800},{symbol:"DEMO_C",name:"星河成长（演示）",base:13500}];
  const dates:string[]=[];
  for(let t=Date.parse("2026-08-17T00:00:00Z");t<=Date.parse("2026-11-06T00:00:00Z");t+=86400000) {
    const d=new Date(t);if(d.getUTCDay()!==0 && d.getUTCDay()!==6) dates.push(d.toISOString().slice(0,10));
  }
  return {instruments:names,prices:names.flatMap((n,j)=>dates.map((date,i)=>({symbol:n.symbol,price_date:date,close_minor:Math.max(100,Math.round(n.base*(1+i*(j===2?.0011:.00046)+.028*Math.sin(i*(.29+j*.07)+j)+.008*Math.sin(i*.77+j)))),source:"SYNTHETIC_DEMO"})))};
}
