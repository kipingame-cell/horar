package com.kipin.horar;

import android.app.*;
import android.os.*;
import android.content.*;
import android.content.pm.ActivityInfo;
import android.graphics.Bitmap;
import android.view.*;
import android.webkit.WebView;
import org.json.*;
import java.io.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

/** End-to-end checks against the installed APK, local WebView and persistent storage. */
public class UiSmokeTest extends Instrumentation {
 private Activity activity; private WebView web; private int passed=0; private final StringBuilder results=new StringBuilder();
 @Override public void onCreate(Bundle args){super.onCreate(args);start();}
 private WebView findWeb(View v){if(v instanceof WebView)return (WebView)v;if(v instanceof ViewGroup){ViewGroup g=(ViewGroup)v;for(int i=0;i<g.getChildCount();i++){WebView w=findWeb(g.getChildAt(i));if(w!=null)return w;}}return null;}
 private String js(String script)throws Exception{CountDownLatch latch=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();runOnMainSync(()->web.evaluateJavascript(script,v->{value.set(v);latch.countDown();}));if(!latch.await(10,TimeUnit.SECONDS))throw new Exception("JS callback timeout");return value.get();}
 private void check(String name,String expression)throws Exception{String value=js("(()=>{try{return Boolean("+expression+");}catch(e){return String(e.stack||e);}})()");if(!"true".equals(value))throw new Exception(name+": "+value);passed++;results.append("PASS ").append(name).append('\n');}
 private void ready()throws Exception{long end=System.currentTimeMillis()+30000;while(System.currentTimeMillis()<end){if("true".equals(js("typeof Horar!=='undefined' && typeof renderGlossary==='function' && document.querySelector('#glossary-list details')!==null")))return;Thread.sleep(150);}throw new Exception("WebView did not load application");}
 private void awaitCondition(String exp)throws Exception{long end=System.currentTimeMillis()+10000;while(System.currentTimeMillis()<end){if("true".equals(js(exp)))return;Thread.sleep(100);}throw new Exception("Condition timeout: "+exp);}
 private void tap(String selector)throws Exception{js("document.querySelector("+JSONObject.quote(selector)+").scrollIntoView({block:'center',behavior:'instant'})");JSONArray rect=new JSONArray(js("(()=>{const r=document.querySelector("+JSONObject.quote(selector)+").getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2,devicePixelRatio]})()"));int[] origin=new int[2];runOnMainSync(()->web.getLocationOnScreen(origin));float x=(float)(origin[0]+rect.getDouble(0)*rect.getDouble(2)),y=(float)(origin[1]+rect.getDouble(1)*rect.getDouble(2));long t=SystemClock.uptimeMillis();sendPointerSync(MotionEvent.obtain(t,t,MotionEvent.ACTION_DOWN,x,y,0));sendPointerSync(MotionEvent.obtain(t,t+60,MotionEvent.ACTION_UP,x,y,0));waitForIdleSync();}
 private void screenshot(String name)throws Exception{Thread.sleep(350);Bitmap b=getUiAutomation().takeScreenshot();if(b==null)throw new Exception("Screenshot unavailable");File dir=getTargetContext().getExternalFilesDir("screenshots");if(dir==null)throw new Exception("Screenshot dir unavailable");dir.mkdirs();try(FileOutputStream out=new FileOutputStream(new File(dir,name+".png"))){b.compress(Bitmap.CompressFormat.PNG,100,out);}b.recycle();}
 @Override public void onStart(){Bundle result=new Bundle();try{
  Intent launch=new Intent(getTargetContext(),MainActivity.class);launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);activity=startActivitySync(launch);runOnMainSync(()->web=findWeb(activity.getWindow().getDecorView()));if(web==null)throw new Exception("No WebView");ready();
  js("localStorage.removeItem('horar.journal.v1'); location.reload()");Thread.sleep(500);ready();
  check("offline modules loaded","typeof Horar.calculate==='function' && typeof HorarReading.explain==='function' && typeof HorarJournal.parse==='function'");
  check("empty journal","readEntries().length===0");check("portrait page fits viewport","document.documentElement.scrollWidth<=innerWidth+1");screenshot("01-home");
  tap("#question");sendStringSync("Meeting this week?");check("native keyboard entry","document.getElementById('question').value==='Meeting this week?'");sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);
  js("document.getElementById('moment').value='2026-10-18T17:00';document.getElementById('offset').value='3';document.getElementById('lat').value='55.7558';document.getElementById('lon').value='37.6173';document.getElementById('target').value='7';document.getElementById('system').value='regio';");tap("#calculate");
  awaitCondition("current!==null && current.lunar!==undefined");check("chart calculation and table","!document.getElementById('results').hidden && document.querySelectorAll('#planet-table tr').length===7");check("eight contextual explanations","document.querySelectorAll('#explanation details').length===8");check("exact UTC conversion","current.date==='2026-10-18T14:00:00.000Z'");check("Moon event computed","current.lunar.events.length>0");
  js("document.getElementById('wheel').scrollIntoView({block:'center',behavior:'instant'})");screenshot("02-chart");
  js("document.getElementById('explanation').scrollIntoView({block:'start',behavior:'instant'})");screenshot("03-explanations");
  tap("#save");tap("#save");check("repeat save does not duplicate","readEntries().length===1");js("page('journal');document.querySelector('[data-outcome]').value='Meeting happened';document.querySelector('[data-note]').click()");check("outcome saved","readEntries()[0].outcome==='Meeting happened'");screenshot("04-journal");
  js("location.reload()");Thread.sleep(500);ready();check("journal survives reload","readEntries().length===1 && readEntries()[0].outcome==='Meeting happened'");js("page('journal');document.querySelector('[data-open]').click()");awaitCondition("current!==null && current.lunar!==undefined");check("saved chart restores date and result","document.getElementById('moment').value==='2026-10-18T17:00' && current.planets.length===7");
  check("report contains explanations","report(current).includes('Расчёт:') && report(current).includes('Ограничение:')");
  js("window.testBackup=JSON.stringify({format:'horar-journal',version:1,entries:readEntries()});localStorage.removeItem('horar.journal.v1');importJournalText(window.testBackup)");check("backup import restores outcome","readEntries().length===1 && readEntries()[0].outcome==='Meeting happened'");js("importJournalText(window.testBackup)");check("second import does not duplicate","readEntries().length===1");
  check("invalid import does not damage journal","(()=>{const before=localStorage.getItem(KEY);try{importJournalText('{broken')}catch(e){}return localStorage.getItem(KEY)===before})()");
  js("page('guide');document.getElementById('glossary-search').value='рецепция';document.getElementById('glossary-search').dispatchEvent(new Event('input'))");check("glossary search","document.querySelectorAll('#glossary-list details').length===1 && document.getElementById('glossary-list').textContent.includes('Рецепция')");js("document.querySelector('#glossary-list details').open=true;document.querySelector('.glossary').scrollIntoView({block:'start',behavior:'instant'})");screenshot("05-glossary");
  runOnMainSync(()->activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));awaitCondition("innerWidth>innerHeight");check("landscape fits viewport","document.documentElement.scrollWidth<=innerWidth+1");check("journal remains after rotation","readEntries().length===1");screenshot("06-landscape");
  runOnMainSync(()->activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));awaitCondition("innerHeight>innerWidth");
  js("page('workspace');document.getElementById('question').value='';document.getElementById('chart-form').requestSubmit()");check("required question validation","!document.getElementById('question').checkValidity()");
  result.putString("stream","\n"+results+"HORAR_SMOKE_OK checks="+passed+"\n");finish(Activity.RESULT_OK,result);
 }catch(Throwable t){result.putString("stream","\n"+results+"HORAR_SMOKE_FAILED: "+t.toString()+"\n");try{screenshot("failure");}catch(Exception ignored){}finish(Activity.RESULT_CANCELED,result);}}
}
