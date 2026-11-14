import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { baseline, feeFor, marketMetrics, replay, syntheticPrices, validateLedger, validDate, type Flow, type Trade, type Price } from "../../../lib/analysis";
import { DEMO_ACCOUNT_NAME, fullDemoScenario } from "../../../lib/demo";

import { research } from "../../../lib/research";

export const runtime = "edge";
const DB = env.DB!;
type Row = Record<string, any>;
const fail=(status:number,code:string,message:string)=>Response.json({error:{code,message}},{status});
const rows=async<T=Row>(sql:string,...args:any[]):Promise<T[]> => (await DB.prepare(sql).bind(...args).all()).results as T[];
const one=async<T=Row>(sql:string,...args:any[]):Promise<T|undefined> => (await DB.prepare(sql).bind(...args).first()) as T|undefined;
function int(v:any, min=1, max=1e12) {const x=Number(v);if(!Number.isSafeInteger(x)||x<min||x>max)throw new Error(`请输入 ${min} 至 ${max} 范围内的整数`);return x;}
function str(v:any, max=200) {if(typeof v!=="string")throw new Error("文本格式不正确");const x=v.trim();if(x.length>max)throw new Error(`文字不能超过 ${max} 字`);return x;}
function date(v:any) {if(!validDate(v))throw new Error("日期格式必须是 YYYY-MM-DD");return v;}
async function owner(accountId:number,userId:string) {const a=await one<Row>("SELECT * FROM accounts WHERE id=? AND owner_id=?",accountId,userId);if(!a)throw new Error("ACCOUNT_NOT_FOUND");return a;}
async function load(accountId:number) {
 const [flows,trades,notes]=await Promise.all([
  rows<Flow>("SELECT * FROM cash_flows WHERE account_id=? ORDER BY effective_date,sequence",accountId),
  rows<Trade>("SELECT * FROM trades WHERE account_id=? ORDER BY effective_date,sequence",accountId),
  rows<Row>("SELECT * FROM decision_notes WHERE account_id=? ORDER BY created_at DESC",accountId),
 ]);return {flows,trades,notes};
}
async function nextSequence(accountId:number) {const a=await one<{n:number}>("SELECT MAX(n) AS n FROM (SELECT COALESCE(MAX(sequence),0) n FROM cash_flows WHERE account_id=? UNION ALL SELECT COALESCE(MAX(sequence),0) n FROM trades WHERE account_id=?)",accountId,accountId);return (a?.n||0)+1;}
const now=()=>new Date().toISOString();
async function seedSyntheticPrices() {
 const data=syntheticPrices(),created=now();
 const stmts=[...data.instruments.map(i=>DB.prepare("INSERT OR IGNORE INTO instruments(symbol,name,currency,price_type,source,data_kind,imported_at) VALUES(?,?,?,?,?,?,?)").bind(i.symbol,i.name,"USD","synthetic_close","SYNTHETIC_DEMO","synthetic",created)),...data.prices.map(p=>DB.prepare("INSERT OR IGNORE INTO daily_prices(symbol,price_date,close_minor,source) VALUES(?,?,?,?)").bind(p.symbol,p.price_date,p.close_minor,p.source))];
 for(let k=0;k<stmts.length;k+=80)await DB.batch(stmts.slice(k,k+80));
 return data.prices.length;
}
export async function GET(request:Request) {
 const user=await getChatGPTUser();if(!user)return fail(401,"AUTH_REQUIRED","请先登录");
 try {
  const url=new URL(request.url), accountId=Number(url.searchParams.get("account"));
  const accounts=await rows<Row>("SELECT * FROM accounts WHERE owner_id=? ORDER BY id",user.userId);
  const instruments=await rows<Row>("SELECT * FROM instruments ORDER BY symbol");
  const prices=await rows<Price>("SELECT symbol,price_date,close_minor,source FROM daily_prices ORDER BY price_date,symbol");
  const selected=accounts.find(a=>a.id===accountId)||accounts[0]||null;
  if(accountId && !accounts.some(a=>a.id===accountId))return fail(404,"ACCOUNT_NOT_FOUND","没有这个账户");
  let ledger:null|ReturnType<typeof replay>=null, notes:Row[]=[], flows:Flow[]=[],trades:Trade[]=[];
  if(selected) {const data=await load(selected.id);notes=data.notes;flows=data.flows;trades=data.trades;ledger=replay(flows,trades,prices);}
  const symbol=url.searchParams.get("symbol")||instruments[0]?.symbol||"";
  const from=url.searchParams.get("from")||"",to=url.searchParams.get("to")||"9999-12-31";
  if(from&&!validDate(from))return fail(400,"BAD_DATE","开始日期错误");if(to!=="9999-12-31"&&!validDate(to))return fail(400,"BAD_DATE","结束日期错误");
  const market=Object.fromEntries(instruments.map(i=>[i.symbol,marketMetrics(prices.filter(p=>p.symbol===i.symbol&&p.price_date>=from&&p.price_date<=to).map(p=>({date:p.price_date,closeMinor:p.close_minor})))]));
  const target=instruments.find(i=>i.symbol===symbol);
  const bench=selected&&target?baseline(flows,prices,symbol):null;
  const actual=selected?replay(flows,trades,prices,true):[];
  const comparison=bench?{symbol,feeRule:"成交额的 0.1%，逐笔四舍五入到分；实际交易也按相同费率重算",error:bench.error,baseline:bench.series.filter(p=>p.date>=from&&p.date<=to),actual:actual.filter(p=>p.date>=from&&p.date<=to)}:null;
  return Response.json({research:research(prices,from,to),user:{name:user.displayName,email:user.email},accounts,selected,instruments,prices,market,flows,trades,notes,ledger:ledger?.filter(p=>p.date>=from&&p.date<=to)||[],comparison,asOf:prices.at(-1)?.price_date||null,methodVersion:"1.0",dataKind:!instruments.length?"empty":instruments.every(i=>i.data_kind==="synthetic")?"synthetic":"mixed_or_imported"});
 } catch(e:any) {return fail(500,"SERVER_ERROR",e?.message||"读取失败");}
}
export async function POST(request:Request) {
 const user=await getChatGPTUser();if(!user)return fail(401,"AUTH_REQUIRED","请先登录");
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return fail(403,"ORIGIN_MISMATCH","非法请求来源");
 let p:Row;try{p=await request.json();}catch{return fail(400,"BAD_JSON","请求必须是 JSON");}
 try {
  const action=str(p.action,50), accountId=p.accountId==null||p.accountId===0?0:int(p.accountId);
  if(action==="account.create") {const name=str(p.name,40);if(!name)throw new Error("账户名称不能为空");
   const r=await DB.prepare("INSERT INTO accounts(owner_id,name,currency,created_at) VALUES(?,?,?,?)").bind(user.userId,name,"USD",now()).run();return Response.json({id:r.meta.last_row_id});}
  if(action==="demo.seed") {const count=await seedSyntheticPrices();return Response.json({count,message:"合成演示行情已导入；不是实际证券价格"});}
  if(action==="demo.full"||action==="demo.account") {
   const existing=await one<{id:number}>("SELECT id FROM accounts WHERE owner_id=? AND name=? ORDER BY id LIMIT 1",user.userId,DEMO_ACCOUNT_NAME);
   if(existing)return Response.json({id:existing.id,message:"已切换到现有合成演示账户"});
   const scenario=fullDemoScenario();
   await seedSyntheticPrices();
   const created=now();const result=await DB.prepare("INSERT INTO accounts(owner_id,name,currency,created_at) VALUES(?,?,?,?)").bind(user.userId,DEMO_ACCOUNT_NAME,"USD",created).run();
   const id=result.meta.last_row_id;
   try {
    await DB.batch([
     ...scenario.flows.map(x=>DB.prepare("INSERT INTO cash_flows(account_id,effective_date,kind,amount_minor,memo,sequence,created_at) VALUES(?,?,?,?,?,?,?)").bind(id,x.effective_date,x.kind,x.amount_minor,x.memo,x.sequence,`${x.effective_date}T10:00:00.000Z`)),
     ...scenario.trades.map(x=>DB.prepare("INSERT INTO trades(account_id,effective_date,symbol,side,quantity,price_minor,fee_minor,sequence,created_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(id,x.effective_date,x.symbol,x.side,x.quantity,x.price_minor,x.fee_minor,x.sequence,`${x.effective_date}T11:00:00.000Z`)),
     ...scenario.notes.map(x=>DB.prepare("INSERT INTO decision_notes(account_id,trade_id,reason,expectation,review,created_at,updated_at,reviewed_at) VALUES(?,(SELECT id FROM trades WHERE account_id=? AND sequence=?),?,?,?,?,?,?)").bind(id,id,x.tradeSequence,x.reason,x.expectation,x.review,x.createdAt,x.reviewedAt||x.createdAt,x.reviewedAt)),
    ]);
   } catch(e) {await DB.prepare("DELETE FROM accounts WHERE id=? AND owner_id=?").bind(id,user.userId).run();throw e;}
   return Response.json({id,message:"已载入完整合成演示案例：3 个标的、10 笔资金及交易事件、3 条决策笔记"});
  }
  if(action==="market.import") {
   const symbol=str(p.symbol,24).toUpperCase(),name=str(p.name,50),source=str(p.source,100),csv=str(p.csv,100000);
   if(!/^[A-Z][A-Z0-9_.-]{1,23}$/.test(symbol)||!name||!source||source==="SYNTHETIC_DEMO")throw new Error("请填写有效代码、名称和可核实来源");
   const existing=await one("SELECT symbol FROM instruments WHERE symbol=?",symbol);if(existing)throw new Error("该代码已经存在；为防止混用价格口径，请用新代码导入");
   const lines=csv.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(lines[0]?.toLowerCase()==="date,close")lines.shift();if(lines.length<2||lines.length>1000)throw new Error("CSV 应有 2 至 1000 行 date,close 数据");
   const parsed=lines.map((line,i)=>{const cells=line.split(",").map(x=>x.trim());if(cells.length!==2||!validDate(cells[0])||!/^\d+(\.\d{1,2})?$/.test(cells[1]))throw new Error(`第 ${i+1} 行日期或价格无效`);const close=Math.round(Number(cells[1])*100);if(close<1||close>1e9)throw new Error(`第 ${i+1} 行价格超出范围`);return {date:cells[0],close};});
   const unique=new Set(parsed.map(x=>x.date));if(unique.size!==parsed.length)throw new Error("CSV 有重复日期");
   const stmts=[DB.prepare("INSERT INTO instruments(symbol,name,currency,price_type,source,data_kind,imported_at) VALUES(?,?,?,?,?,?,?)").bind(symbol,name,"USD",str(p.priceType,40)||"unadjusted_close",source,"imported",now()),...parsed.map(x=>DB.prepare("INSERT INTO daily_prices(symbol,price_date,close_minor,source) VALUES(?,?,?,?)").bind(symbol,x.date,x.close,source))];
   await DB.batch(stmts);return Response.json({symbol,count:parsed.length});
  }
  if(!accountId)throw new Error("请选择账户");await owner(accountId,user.userId);
  if(action==="flow.save"||action==="flow.delete") {
   const data=await load(accountId);let candidate=[...data.flows], stmt:any;
   if(action==="flow.delete") {const id=int(p.id);if(!candidate.some(x=>x.id===id))throw new Error("资金记录不存在");candidate=candidate.filter(x=>x.id!==id);stmt=DB.prepare("DELETE FROM cash_flows WHERE id=? AND account_id=?").bind(id,accountId);}
   else {const d=date(p.date),kind=p.kind;if(kind!=="deposit"&&kind!=="withdrawal")throw new Error("资金类型无效");const amount=int(p.amountMinor,1,1e11),memo=str(p.memo||"",200);
    if(p.id) {const id=int(p.id),old=candidate.find(x=>x.id===id);if(!old)throw new Error("资金记录不存在");candidate=candidate.map(x=>x.id===id?{...x,effective_date:d,kind,amount_minor:amount,memo}:x);stmt=DB.prepare("UPDATE cash_flows SET effective_date=?,kind=?,amount_minor=?,memo=? WHERE id=? AND account_id=?").bind(d,kind,amount,memo,id,accountId);}
    else {const seq=await nextSequence(accountId);candidate.push({id:0,account_id:accountId,effective_date:d,kind,amount_minor:amount,memo,sequence:seq,created_at:now()});stmt=DB.prepare("INSERT INTO cash_flows(account_id,effective_date,kind,amount_minor,memo,sequence,created_at) VALUES(?,?,?,?,?,?,?)").bind(accountId,d,kind,amount,memo,seq,now());}
   }
   const error=validateLedger(candidate,data.trades);if(error)throw new Error(error);
   await DB.batch([stmt,DB.prepare("UPDATE accounts SET version=version+1 WHERE id=? AND owner_id=?").bind(accountId,user.userId)]);return Response.json({ok:true});
  }
  if(action==="trade.save"||action==="trade.delete") {
   const data=await load(accountId);let candidate=[...data.trades],stmt:any,deleteNote:any=null;
   if(action==="trade.delete") {const id=int(p.id);if(!candidate.some(x=>x.id===id))throw new Error("交易不存在");candidate=candidate.filter(x=>x.id!==id);stmt=DB.prepare("DELETE FROM trades WHERE id=? AND account_id=?").bind(id,accountId);deleteNote=DB.prepare("DELETE FROM decision_notes WHERE trade_id=? AND account_id=?").bind(id,accountId);}
   else {const d=date(p.date),symbol=str(p.symbol,24).toUpperCase(),side=p.side,quantity=int(p.quantity,1,1e8),priceMinor=int(p.priceMinor,1,1e9),feeMinor=int(p.feeMinor??0,0,1e9);
    if(side!=="buy"&&side!=="sell")throw new Error("交易方向无效");const instrument=await one<Row>("SELECT * FROM instruments WHERE symbol=?",symbol);if(!instrument)throw new Error("请先导入标的价格");if(instrument.currency!=="USD")throw new Error("目前只支持 USD 账户");
    const exact=await one("SELECT id FROM daily_prices WHERE symbol=? AND price_date=?",symbol,d);if(!exact)throw new Error("该日期没有标的报价，不允许录入交易");
    if(p.id) {const id=int(p.id),old=candidate.find(x=>x.id===id);if(!old)throw new Error("交易不存在");candidate=candidate.map(x=>x.id===id?{...x,effective_date:d,symbol,side,quantity,price_minor:priceMinor,fee_minor:feeMinor}:x);stmt=DB.prepare("UPDATE trades SET effective_date=?,symbol=?,side=?,quantity=?,price_minor=?,fee_minor=? WHERE id=? AND account_id=?").bind(d,symbol,side,quantity,priceMinor,feeMinor,id,accountId);}
    else {const seq=await nextSequence(accountId);candidate.push({id:0,account_id:accountId,effective_date:d,symbol,side,quantity,price_minor:priceMinor,fee_minor:feeMinor,sequence:seq,created_at:now()});stmt=DB.prepare("INSERT INTO trades(account_id,effective_date,symbol,side,quantity,price_minor,fee_minor,sequence,created_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(accountId,d,symbol,side,quantity,priceMinor,feeMinor,seq,now());}
   }
   const error=validateLedger(data.flows,candidate);if(error)throw new Error(error);
   await DB.batch([...(deleteNote?[deleteNote]:[]),stmt,DB.prepare("UPDATE accounts SET version=version+1 WHERE id=? AND owner_id=?").bind(accountId,user.userId)]);return Response.json({ok:true});
  }
  if(action==="note.save"||action==="note.delete") {
   if(action==="note.delete") {const id=int(p.id);await DB.prepare("DELETE FROM decision_notes WHERE id=? AND account_id=?").bind(id,accountId).run();return Response.json({ok:true});}
   const reason=str(p.reason,1000),expectation=str(p.expectation||"",500),review=str(p.review||"",1000);if(!reason)throw new Error("请填写当时的理由");const tradeId=p.tradeId?int(p.tradeId):null;
   if(tradeId&&!await one("SELECT id FROM trades WHERE id=? AND account_id=?",tradeId,accountId))throw new Error("只能关联本账户交易");
   const reviewedAt=review?now():null;
   if(p.id){const id=int(p.id);if(!await one("SELECT id FROM decision_notes WHERE id=? AND account_id=?",id,accountId))throw new Error("日记不存在");await DB.prepare("UPDATE decision_notes SET trade_id=?,reason=?,expectation=?,review=?,updated_at=?,reviewed_at=? WHERE id=? AND account_id=?").bind(tradeId,reason,expectation,review,now(),reviewedAt,id,accountId).run();}
   else await DB.prepare("INSERT INTO decision_notes(account_id,trade_id,reason,expectation,review,created_at,updated_at,reviewed_at) VALUES(?,?,?,?,?,?,?,?)").bind(accountId,tradeId,reason,expectation,review,now(),now(),reviewedAt).run();
   return Response.json({ok:true});
  }
  return fail(400,"UNKNOWN_ACTION","未知操作");
 } catch(e:any) {return fail(e?.message==="ACCOUNT_NOT_FOUND"?404:400,"VALIDATION_ERROR",e?.message||"操作失败");}
}
