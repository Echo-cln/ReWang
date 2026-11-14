package com.rewang.app;
import android.content.Context;import android.graphics.*;import android.view.View;import org.json.*;import java.util.*;
/** Native Canvas chart. No WebView, HTML, JS or chart server. */
public final class ResearchChart extends View {
 private final Paint paint=new Paint(3);private final List<double[]> lines=new ArrayList<>();private final int[] colors={0xff245775,0xffb06546,0xff78856b};
 public ResearchChart(Context c,JSONArray series,String key){super(c);setContentDescription("研究时间序列图，数值详见图下指标");for(int i=0;i<series.length();i++){JSONArray points=series.optJSONObject(i).optJSONArray("points");if(points==null)continue;double[] values=new double[points.length()];for(int j=0;j<values.length;j++)values[j]=points.optJSONObject(j).optDouble(key,0);lines.add(values);}}
 protected void onDraw(Canvas canvas){super.onDraw(canvas);float d=getResources().getDisplayMetrics().density,l=44*d,t=18*d,r=getWidth()-12*d,b=getHeight()-30*d;double min=Double.POSITIVE_INFINITY,max=-Double.POSITIVE_INFINITY;for(double[] line:lines)for(double x:line){min=Math.min(min,x);max=Math.max(max,x);}if(!Double.isFinite(min))return;if(max-min<.001)max=min+1;
 paint.setTextSize(10*d);for(int i=0;i<5;i++){float y=t+(b-t)*i/4;paint.setColor(0xffe1d9cd);paint.setStrokeWidth(d);canvas.drawLine(l,y,r,y,paint);paint.setColor(0xff77818a);canvas.drawText(String.format(Locale.US,"%.1f",max-(max-min)*i/4),0,y+4*d,paint);}
 for(int k=0;k<lines.size();k++){double[] v=lines.get(k);if(v.length<2)continue;Path p=new Path();for(int i=0;i<v.length;i++){float x=l+(r-l)*i/(v.length-1),y=(float)(b-(v[i]-min)/(max-min)*(b-t));if(i==0)p.moveTo(x,y);else p.lineTo(x,y);}paint.setColor(colors[k%colors.length]);paint.setStrokeWidth(2*d);paint.setStyle(Paint.Style.STROKE);canvas.drawPath(p,paint);paint.setStyle(Paint.Style.FILL);}
 paint.setColor(0xff77818a);canvas.drawText("区间起点",l,b+22*d,paint);canvas.drawText("最新报价",r-50*d,b+22*d,paint);
 }
}
