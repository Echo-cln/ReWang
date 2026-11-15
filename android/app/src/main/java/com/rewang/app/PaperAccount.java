package com.rewang.app;
import org.json.*;
/** Single-symbol, USD, integer-share paper account. Never places real orders. */
public final class PaperAccount {
 public String symbol,mode,date,start;public double cash=100000,cost=0,realized=0;public int quantity=0;public JSONArray orders=new JSONArray();
 public PaperAccount(String s,String m,String d){symbol=s;mode=m;date=d;start=d;}
 private static double round(double x){return Math.round(x*100)/100.0;}
 public void trade(boolean buy,int qty,double price,String at,String reason)throws Exception{if(qty<1||qty>1000000)throw new Exception("请输入 1 至 1,000,000 的整数股数");if(!Double.isFinite(price)||price<=0)throw new Exception("无有效报价");if(reason.trim().isEmpty()||reason.trim().length()>500)throw new Exception("请填写 1 至 500 字决策理由");if(at.compareTo(date)<0)throw new Exception("不能回到过去修改交易");if(!buy&&qty>quantity)throw new Exception("可卖持仓不足");double amount=round(qty*price),fee=round(Math.max(1,amount*.001));if(buy&&amount+fee>cash)throw new Exception("可用现金不足");double nextCost=buy?round(cost+amount+fee):round(cost*(1-qty/(double)quantity));if(!buy)realized=round(realized+amount-fee-cost*qty/quantity);cash=round(cash+(buy?-amount-fee:amount-fee));quantity+=buy?qty:-qty;cost=nextCost;date=at;orders.put(new JSONObject().put("date",at).put("side",buy?"buy":"sell").put("quantity",qty).put("price",price).put("fee",fee).put("reason",reason.trim()).put("cashAfter",cash));}
 public JSONObject json()throws JSONException{return new JSONObject().put("version",1).put("symbol",symbol).put("mode",mode).put("date",date).put("start",start).put("cash",cash).put("cost",cost).put("realized",realized).put("quantity",quantity).put("orders",orders);}
 public static PaperAccount from(JSONObject x){PaperAccount p=new PaperAccount(x.optString("symbol"),x.optString("mode"),x.optString("start"));p.date=x.optString("date");p.cash=x.optDouble("cash");p.cost=x.optDouble("cost");p.realized=x.optDouble("realized");p.quantity=x.optInt("quantity");p.orders=x.optJSONArray("orders");if(p.orders==null)p.orders=new JSONArray();return p;}
}
