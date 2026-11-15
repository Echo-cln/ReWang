package com.rewang.app;
import org.junit.Test;import static org.junit.Assert.*;
public class PaperAccountTest {
 @Test public void cashFeesAndRealizedPnl()throws Exception{PaperAccount p=new PaperAccount("AAPL","history","2025-01-02");p.trade(true,10,100,"2025-01-02","Entry");assertEquals(98999,p.cash,.001);assertEquals(1001,p.cost,.001);p.trade(false,5,120,"2025-01-03","Exit half");assertEquals(99598,p.cash,.001);assertEquals(500.5,p.cost,.001);assertEquals(98.5,p.realized,.001);assertEquals(5,p.quantity);assertEquals(2,p.orders.length());}
 @Test public void invalidOrdersLeaveAccountUnchanged()throws Exception{PaperAccount p=new PaperAccount("AAPL","history","2025-01-02");try{p.trade(false,1,100,"2025-01-02","Exit");fail();}catch(Exception expected){}try{p.trade(true,1,100,"2025-01-01","Past");fail();}catch(Exception expected){}try{p.trade(true,10000,100,"2025-01-02","Too much");fail();}catch(Exception expected){}assertEquals(100000,p.cash,.001);assertEquals(0,p.orders.length());}
 @Test public void jsonRoundTrip()throws Exception{PaperAccount p=new PaperAccount("AAPL","history","2025-01-02");p.trade(true,10,100,p.date,"Entry");PaperAccount copy=PaperAccount.from(p.json());assertEquals(p.cash,copy.cash,.001);assertEquals(p.quantity,copy.quantity);assertEquals(1,copy.orders.length());}
}
