/** Real security identifiers, entirely synthetic quotes. Never an exchange snapshot. */
export type Market='A股'|'港股'|'美股';
export type Security={id:string;code:string;name:string;en:string;initials:string;market:Market;board:string;sector:string;currency:'CNY'|'HKD'|'USD';base:number};
export type Quote=Security&{price:number;previous:number;change:number;changePct:number;amount:number;volume:number;turnover:number;amplitude:number;open:number;high:number;low:number;status:'交易'|'涨停'|'跌停'|'停牌';trend:number[]};
export const DEMO_AS_OF='2026-11-13';
const a=(code:string,name:string,initials:string,sector:string,base:number):Security=>({id:code+(code[0]==='6'?'.SH':'.SZ'),code,name,initials,en:'',sector,base,market:'A股',board:code.startsWith('688')?'科创板':code.startsWith('300')?'创业板':code[0]==='6'?'沪市主板':'深市主板',currency:'CNY'});
const h=(code:string,name:string,initials:string,en:string,sector:string,base:number):Security=>({id:code+'.HK',code,name,initials,en,sector,base,market:'港股',board:'港股主板',currency:'HKD'});
const u=(code:string,name:string,en:string,sector:string,base:number):Security=>({id:code,code,name,en,initials:code,sector,base,market:'美股',board:'纳斯达克',currency:'USD'});
export const securities:Security[]=[
 a('600036','招商银行','zsyh','金融',38),a('601318','中国平安','zgpa','金融',52),a('601398','工商银行','gsyh','金融',6.3),a('600030','中信证券','zxzq','金融',27),a('300059','东方财富','dfcf','金融',24),
 a('688981','中芯国际','zxgj','科技',92),a('002371','北方华创','bfhc','科技',385),a('688041','海光信息','hgxx','科技',138),a('688256','寒武纪','hwj','科技',645),a('002230','科大讯飞','kdxf','科技',49),
 a('300750','宁德时代','ndsd','新能源',260),a('002594','比亚迪','byd','新能源',98),a('601012','隆基绿能','ljln','新能源',19),a('300274','阳光电源','ygdy','新能源',108),
 a('600519','贵州茅台','gzmt','消费',1490),a('000858','五粮液','wly','消费',126),a('600887','伊利股份','ylgf','消费',28),a('000333','美的集团','mdjt','消费',72),
 a('600276','恒瑞医药','hryy','医药',58),a('603259','药明康德','ymkd','医药',74),a('300760','迈瑞医疗','mryl','医药',218),
 a('601857','中国石油','zgsy','能源资源',8.4),a('601088','中国神华','zgsh','能源资源',42),a('600900','长江电力','cjdl','能源资源',29),a('601899','紫金矿业','zjky','能源资源',24),
 a('600031','三一重工','syzg','先进制造',21),a('300124','汇川技术','hcjs','先进制造',69),a('601668','中国建筑','zgjz','先进制造',6.1),
 a('600941','中国移动','zgyd','通信',106),a('601728','中国电信','zgdx','通信',7.4),a('300308','中际旭创','zjxc','通信',196),a('000725','京东方A','jdfa','科技',4.6),
 h('00700','腾讯控股','txkg','Tencent','科技',510),h('09988','阿里巴巴-W','albb','Alibaba','科技',132),h('03690','美团-W','mt','Meituan','消费',114),h('01810','小米集团-W','xmjt','Xiaomi','科技',46),h('09618','京东集团-SW','jdjt','JD.com','消费',126),h('00388','香港交易所','xgjys','HKEX','金融',402),
 u('AAPL','苹果','Apple','科技',218),u('MSFT','微软','Microsoft','科技',426),u('NVDA','英伟达','NVIDIA','科技',138),u('AMZN','亚马逊','Amazon','消费',226),u('GOOGL','谷歌','Alphabet Google','科技',184),u('TSLA','特斯拉','Tesla','新能源',285),
];
const round=(n:number)=>Math.round(n*100)/100;
export const quotes:Quote[]=securities.map((s,i)=>{
 const cycle=[3.28,-2.14,0,5.76,-.87,1.42,-3.53,2.06,-1.25,4.31,-4.62,.68];
 let pct=cycle[i%cycle.length],status:Quote['status']='交易';const limit=['创业板','科创板'].includes(s.board)?20:10;
 if(i===0||i===7){pct=limit;status='涨停';}if(i===2||i===12){pct=-limit;status='跌停';}if(i===17){pct=0;status='停牌';}
 const previous=s.base,price=round(previous*(1+pct/100));pct=round((price/previous-1)*100);
 const turnover=status==='停牌'?0:round(.38+(i*17%119)/10),volume=status==='停牌'?0:(80000+(i*1733911)%76000000);
 const open=status==='停牌'?previous:round(previous*(1+Math.min(1,Math.max(-1,pct*.24))/100));
 const high=round(Math.max(price,open,previous)*(1+(status==='停牌'?0:status==='涨停'?0:.004+i%5*.002))),low=round(Math.min(price,open,previous)*(1-(status==='停牌'?0:status==='跌停'?0:.003+i%4*.002)));
 const trend=Array.from({length:32},(_,n)=>round(previous+(price-previous)*n/31+(status==='停牌'?0:Math.sin(n*.63+i)*previous*.003*Math.sin(Math.PI*n/31))));
 return {...s,previous,price,change:round(price-previous),changePct:pct,amount:round(volume*(price+open)/2),volume,turnover,open,high,low,amplitude:round((high-low)/previous*100),status,trend};
});
export const industries=[...new Set(securities.map(s=>s.sector))];
export type SortKey='changePct'|'price'|'amount'|'turnover'|'amplitude'|'code';
export function selectQuotes({market,board='全部',sector='全部',query='',watchOnly=false,watch=[],sort='changePct',ascending=false}:{market:Market;board?:string;sector?:string;query?:string;watchOnly?:boolean;watch?:string[];sort?:SortKey;ascending?:boolean}){
 const q=query.trim().toLowerCase().replace(/\s/g,'');return quotes.filter(s=>s.market===market&&(board==='全部'||s.board===board)&&(sector==='全部'||s.sector===sector)&&(!watchOnly||watch.includes(s.id))&&(!q||[s.name,s.code,s.id,s.initials,s.en].join(' ').toLowerCase().includes(q))).sort((a,b)=>{if(a.status==='停牌'&&b.status!=='停牌')return 1;if(b.status==='停牌'&&a.status!=='停牌')return -1;const x=sort==='code'?a.code.localeCompare(b.code):Number(a[sort])-Number(b[sort]);return (ascending?x:-x)||a.id.localeCompare(b.id);});
}
export function sectorStats(market:Market){return industries.map(name=>{const all=quotes.filter(s=>s.market===market&&s.sector===name),active=all.filter(s=>s.status!=='停牌'),mean=active.length?active.reduce((a,s)=>a+s.changePct,0)/active.length:0;return {name,count:all.length,changePct:round(mean),amount:all.reduce((a,s)=>a+s.amount,0),leader:[...active].sort((a,b)=>b.changePct-a.changePct)[0]};}).filter(x=>x.count).sort((a,b)=>b.changePct-a.changePct);}
export function demoHistory(stock:Security){const end=Date.parse(DEMO_AS_OF+'T00:00:00Z'),days:string[]=[];for(let t=end;t>end-130*86400000;t-=86400000){const d=new Date(t);if(d.getUTCDay()!==0&&d.getUTCDay()!==6)days.unshift(d.toISOString().slice(0,10));}const seed=securities.findIndex(s=>s.id===stock.id)+1,latest=quotes.find(q=>q.id===stock.id)!;const raw=days.map((date,i)=>({date,v:1+i*.0007+Math.sin(i*.18+seed)*.045+Math.sin(i*.57)*.014})),factor=latest.previous/raw.at(-2)!.v;return raw.map((b,i)=>{const close=i===raw.length-1?latest.price:round(b.v*factor),previous=i?round(raw[i-1].v*factor):close,open=i===raw.length-1?latest.open:round(previous*(1+Math.sin(i+seed)*.004));return {date:b.date,close,open,high:i===raw.length-1?latest.high:round(Math.max(close,open)*1.008),low:i===raw.length-1?latest.low:round(Math.min(close,open)*.992),volume:latest.volume,time:Date.parse(b.date)/1000};});}
export const CURRENCY:Record<string,string>={CNY:'¥',HKD:'HK$',USD:'US$'};
export function amountLabel(n:number){return n>=1e8?(n/1e8).toFixed(2)+'亿':n>=1e4?(n/1e4).toFixed(2)+'万':n.toFixed(2);}
