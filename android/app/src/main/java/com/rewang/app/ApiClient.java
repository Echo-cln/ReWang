package com.rewang.app;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import android.os.*;
/** REST adapter. The team backend may be Java, Python, Node, or another language. */
public final class ApiClient {
 public interface Callback { void complete(JSONObject body, String error); }
 private final ExecutorService executor=Executors.newFixedThreadPool(3);
 private final Handler main=new Handler(Looper.getMainLooper());
 public void request(String base,String path,String method,String token,JSONObject payload,Callback cb){
  executor.execute(()->{JSONObject result=null;String error=null;HttpURLConnection connection=null;
   try { if(!base.startsWith("https://"))throw new Exception("正式接口需要 HTTPS 地址");
    connection=(HttpURLConnection)new URL(base.replaceAll("/+$","")+path).openConnection();
    connection.setRequestMethod(method);connection.setConnectTimeout(15000);connection.setReadTimeout(30000);
    connection.setRequestProperty("Accept","application/json");connection.setRequestProperty("User-Agent","ReWang-Android/1.0");
    if(!token.isEmpty())connection.setRequestProperty("Authorization","Bearer "+token);
    if(payload!=null){connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json");try(var out=connection.getOutputStream()){out.write(payload.toString().getBytes(StandardCharsets.UTF_8));}}
    int code=connection.getResponseCode();var stream=code>=400?connection.getErrorStream():connection.getInputStream();
    if(stream==null)throw new Exception("HTTP "+code);String text;try(var input=stream){java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();byte[] buffer=new byte[4096];int n;while((n=input.read(buffer))!=-1)bytes.write(buffer,0,n);text=bytes.toString("UTF-8");}
    if(code>=400)throw new Exception("HTTP "+code+"："+text.substring(0,Math.min(200,text.length())));
    result=new JSONObject(text);
   }catch(Exception e){error=e.getMessage();}finally{if(connection!=null)connection.disconnect();}
   JSONObject body=result;String message=error;main.post(()->cb.complete(body,message));
  });
 }
 public void close(){executor.shutdownNow();}
}
