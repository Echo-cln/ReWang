import snapshots from './filings-snapshot.json';
// Public read-only market adapter. Fixed upstream allowlist; no client-supplied URLs.
export const instruments = [
 {symbol:'AAPL',name:'Apple',sector:'消费科技',cik:'0000320193'},
 {symbol:'MSFT',name:'Microsoft',sector:'软件服务',cik:'0000789019'},
 {symbol:'NVDA',name:'NVIDIA',sector:'半导体',cik:'0001045810'},
 {symbol:'AMZN',name:'Amazon',sector:'零售与云',cik:'0001018724'},
 {symbol:'GOOGL',name:'Alphabet',sector:'互联网',cik:'0001652044'},
 {symbol:'TSLA',name:'Tesla',sector:'汽车',cik:'0001318605'},
];
export type Bar={date:string;time:number;close:number;volume:number|null};
const cache=new Map<string,{at:number;data:unknown}>();
const pending=new Map<string,Promise<unknown>>();
async function cached(key:string,ttl:number,load:()=>Promise<unknown>){
 const hit=cache.get(key);if(hit&&Date.now()-hit.at<ttl)return {...hit.data as object,cached:true};
 if(pending.has(key))return pending.get(key);
 const work=load().then(data=>{cache.set(key,{at:Date.now(),data});return data}).finally(()=>pending.delete(key));pending.set(key,work);return work;
}
async function upstream(url:string){const r=await fetch(url,{headers:{'User-Agent':'ReWang/1.0 (academic research; https://github.com/Echo-cln/ReWang)','Accept':'application/json, application/rss+xml, application/xml;q=0.9'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error(`数据源返回 HTTP ${r.status}`);return r;}
export function clean(s:string){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();}
export function rssItems(xml:string){return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0,12).flatMap(m=>{const field=(k:string)=>clean(m[1].match(new RegExp(`<${k}[^>]*>([\\s\\S]*?)<\\/${k}>`,'i'))?.[1]||'');const url=field('link'),title=field('title');if(!title||!url.startsWith('https://'))return [];const at=Date.parse(field('pubDate'));return [{title,url,publishedAt:Number.isFinite(at)?new Date(at).toISOString():null,source:'Yahoo Finance RSS · 原文来源见链接'}];});}
export function atomItems(xml:string){return [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].slice(0,12).flatMap(m=>{const title=clean(m[1].match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||''),url=m[1].match(/<link[^>]*href=["']([^"']+)/i)?.[1]||'',published=clean(m[1].match(/<(?:published|updated)[^>]*>([\s\S]*?)<\/(?:published|updated)>/i)?.[1]||'');return title&&url.startsWith('https://')?[{title,url,publishedAt:published,source:'公司官网 · 官方发布'}]:[];});}
const issuerFeeds:Record<string,{url:string;name:string}>={AAPL:{url:'https://www.apple.com/newsroom/rss-feed.rss',name:'Apple Newsroom'},MSFT:{url:'https://news.microsoft.com/feed/',name:'Microsoft News'},NVDA:{url:'https://nvidianews.nvidia.com/releases.xml',name:'NVIDIA Newsroom'}};
async function fallbackDisclosures(symbol:string,error:string){const issuer=issuerFeeds[symbol];if(issuer){try{const xml=await(await upstream(issuer.url)).text();const items=(xml.includes('<entry')?atomItems(xml):rssItems(xml)).map(i=>({...i,source:issuer.name+' · 公司官网发布'}));if(!items.length)throw new Error('公司源暂无条目');return {symbol,items,source:issuer.name,fetchedAt:new Date().toISOString(),cached:false,sourceMode:'issuer',warning:'SEC 在线读取受限；当前展示公司官网发布，包含产品与经营动态，不等同于监管申报。'};}catch{}}
 const snapshot=snapshots[symbol as keyof typeof snapshots];return {...snapshot,sourceMode:'verified_snapshot',attemptedAt:new Date().toISOString(),warning:`SEC 在线读取受限（${error}）。当前为真实采集快照，请以采集时间和原文为准；不代表实时同步。`};}
export async function marketFeed(symbol:string,section:string,range:string){
 const stock=instruments.find(x=>x.symbol===symbol);if(!stock)throw new Error('不支持的股票代码');
 const fetched=()=>new Date().toISOString();
 if(section==='prices')return cached(`${symbol}:${range}`,60000,async()=>{
  const json=await (await upstream(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=1d&events=div%2Csplits`)).json() as any;
  const x=json.chart?.result?.[0];if(!x||json.chart?.error)throw new Error('行情数据格式不完整');
  const bars:Bar[]=(x.timestamp||[]).flatMap((t:number,i:number)=>{const p=x.indicators?.quote?.[0]?.close?.[i];return typeof p==='number'&&p>0?[{date:new Date(t*1000).toISOString().slice(0,10),time:t,close:p,volume:x.indicators?.quote?.[0]?.volume?.[i]??null}]:[]});
  if(!bars.length)throw new Error('暂无有效行情');const meta=x.meta;
  return {symbol,name:stock.name,sector:stock.sector,currency:meta.currency,exchange:meta.fullExchangeName||meta.exchangeName,timezone:meta.exchangeTimezoneName,price:meta.regularMarketPrice,quoteAt:new Date(meta.regularMarketTime*1000).toISOString(),bars,corporateActions:{splits:x.events?.splits||{},dividends:x.events?.dividends||{}},source:'Yahoo Finance · Chart',priceBasis:'未复权日收盘价；当日可能尚未收盘',delay:'公开数据源可能延迟；非交易所直连',fetchedAt:fetched(),cached:false};
 });
 if(section==='news')return cached(`${symbol}:news`,600000,async()=>{const xml=await (await upstream(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}&region=US&lang=en-US`)).text();return {symbol,items:rssItems(xml),source:'Yahoo Finance RSS',fetchedAt:fetched(),cached:false};});
 if(section==='filings')return cached(`${symbol}:filings`,1800000,async()=>{try{const j=await(await upstream(`https://data.sec.gov/submissions/CIK${stock.cik}.json`)).json() as any;const a=j.filings?.recent;if(!a)throw new Error('暂无披露数据');const items=(a.form||[]).flatMap((form:string,i:number)=>['10-K','10-Q','8-K','6-K','20-F'].includes(form)?[{title:`${stock.name} · ${form}`,form,publishedAt:a.acceptanceDateTime?.[i]||a.filingDate[i],date:a.filingDate[i],url:`https://www.sec.gov/Archives/edgar/data/${Number(stock.cik)}/${a.accessionNumber[i].replaceAll('-','')}/${a.primaryDocument[i]}`,source:'SEC EDGAR · 官方披露'}]:[]).slice(0,12);return {symbol,items,source:'SEC EDGAR Submissions',fetchedAt:fetched(),cached:false,sourceMode:'sec_live'};}catch(e){return fallbackDisclosures(symbol,e instanceof Error?e.message:'来源不可用');}});
 throw new Error('未知数据类型');
}
