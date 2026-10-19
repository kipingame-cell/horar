package com.kipin.horar;
import android.app.*;
import android.os.*;
import android.content.*;
import android.net.Uri;
import android.graphics.Color;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import java.io.*;

public class MainActivity extends Activity {
 private WebView web; private ValueCallback<Uri[]> fileCallback; private String pendingExport; private boolean pendingPdf;
 @Override public void onCreate(Bundle saved){super.onCreate(saved);
  LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(10,12,22));
  root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
  web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(-1,-1));setContentView(root);root.requestApplyInsets();
  web.setHorizontalScrollBarEnabled(false);
  int barFlags=0;
  if(Build.VERSION.SDK_INT>=27){getWindow().setNavigationBarColor(Color.rgb(10,12,22));}
  getWindow().getDecorView().setSystemUiVisibility(barFlags);
  web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(true);web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  web.addJavascriptInterface(new ShareBridge(),"Android");
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){Uri u=request.getUrl();if(!"app.local".equals(u.getHost())||!"https".equals(u.getScheme()))return blocked();String path=u.getPath();if(path==null||path.equals("/"))path="/index.html";if(path.contains(".."))return blocked();try{String mime=path.endsWith(".js")?"application/javascript":path.endsWith(".css")?"text/css":path.endsWith(".svg")?"image/svg+xml":path.endsWith(".json")||path.endsWith(".webmanifest")?"application/json":"text/html";return new WebResourceResponse(mime,"UTF-8",getAssets().open("www"+path));}catch(IOException e){return blocked();}}
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri u=request.getUrl();if("https".equals(u.getScheme())&&"app.local".equals(u.getHost()))return false;if("https".equals(u.getScheme()))try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(ActivityNotFoundException e){Toast.makeText(MainActivity.this,"Браузер не найден",Toast.LENGTH_SHORT).show();}return true;}
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onJsConfirm(WebView v,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("Да",(d,w)->result.confirm()).setNegativeButton("Отмена",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}
   @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params){if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=cb;Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.setType("*/*");i.addCategory(Intent.CATEGORY_OPENABLE);try{startActivityForResult(i,100);return true;}catch(ActivityNotFoundException e){fileCallback=null;cb.onReceiveValue(null);return true;}}
  });
  if(saved==null||web.restoreState(saved)==null)web.loadUrl("https://app.local/index.html");
 }
 private WebResourceResponse blocked(){return new WebResourceResponse("text/plain","UTF-8",404,"Not found",java.util.Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
 @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(req==101){if(result==RESULT_OK&&data!=null&&pendingExport!=null){try(OutputStream stream=getContentResolver().openOutputStream(data.getData())){if(stream==null)throw new IOException("No stream");stream.write(pendingPdf?android.util.Base64.decode(pendingExport,android.util.Base64.DEFAULT):pendingExport.getBytes(java.nio.charset.StandardCharsets.UTF_8));Toast.makeText(this,"Файл сохранён",Toast.LENGTH_SHORT).show();}catch(IOException e){Toast.makeText(this,"Не удалось сохранить файл",Toast.LENGTH_LONG).show();}}pendingExport=null;}if(req==100&&fileCallback!=null){fileCallback.onReceiveValue(result==RESULT_OK&&data!=null?new Uri[]{data.getData()}:null);fileCallback=null;}}
 @Override protected void onSaveInstanceState(Bundle out){web.saveState(out);super.onSaveInstanceState(out);}
 @Override public void onBackPressed(){web.evaluateJavascript("document.querySelector('.nav.active').dataset.page",value->{if(!"\"workspace\"".equals(value))web.evaluateJavascript("page('workspace')",null);else if(web.canGoBack())web.goBack();else super.onBackPressed();});}
 private String assetText(String path,boolean gzip)throws IOException{try(InputStream raw=getAssets().open("www/"+path);InputStream in=gzip?new java.util.zip.GZIPInputStream(raw):raw;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);return out.toString("UTF-8");}}
 public class ShareBridge{
 @JavascriptInterface public void copyLink(String url){if(!validLink(url))return;runOnUiThread(()->{ClipboardManager manager=(ClipboardManager)getSystemService(CLIPBOARD_SERVICE);manager.setPrimaryClip(ClipData.newPlainText("Хорар — результат",url));});}
 @JavascriptInterface public void shareLink(String url){if(!validLink(url))return;runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_SEND);i.setType("text/plain");i.putExtra(Intent.EXTRA_TEXT,url);try{startActivity(Intent.createChooser(i,"Поделиться результатом"));}catch(ActivityNotFoundException e){Toast.makeText(MainActivity.this,"Нет приложения для отправки",Toast.LENGTH_SHORT).show();}});}
 private boolean validLink(String url){return url!=null&&url.length()<18000&&url.startsWith("https://horar-kipin.cherrysong9.chatgpt.site/#result=");}

 @JavascriptInterface public void savePdf(String name,String base64){if(base64==null||base64.length()>24000000)return;runOnUiThread(()->{if(pendingExport!=null)return;pendingPdf=true;pendingExport=base64;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/pdf");i.putExtra(Intent.EXTRA_TITLE,name);try{startActivityForResult(i,101);}catch(ActivityNotFoundException e){pendingExport=null;Toast.makeText(MainActivity.this,"Нет приложения для сохранения PDF",Toast.LENGTH_LONG).show();}});}

 @JavascriptInterface public String placeWorkerSource(){try{return assetText("places.js",false)+"\n"+assetText("places-worker.js",false).replace("importScripts('places.js');","");}catch(IOException e){throw new IllegalStateException("Offline search script unavailable",e);}}
 @JavascriptInterface public String placeData(int index){try{if(index==-1)return assetText("data/places-meta.json",false);if(index<0||index>=43)throw new IllegalArgumentException("Invalid place shard");return assetText(String.format(java.util.Locale.ROOT,"data/places-%02d.bin",index),true);}catch(IOException e){throw new IllegalStateException("Offline places unavailable",e);}}
@JavascriptInterface public void share(String name,String text,String type){if(text==null||text.length()>6000000)return;runOnUiThread(()->{pendingPdf=false;pendingExport=text;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json".equals(type)?"application/json":"text/plain");i.putExtra(Intent.EXTRA_TITLE,name);try{startActivityForResult(i,101);}catch(ActivityNotFoundException e){pendingExport=null;Toast.makeText(MainActivity.this,"Нет приложения для сохранения файла",Toast.LENGTH_LONG).show();}});}}
 @Override protected void onDestroy(){if(fileCallback!=null)fileCallback.onReceiveValue(null);if(web!=null){web.removeJavascriptInterface("Android");web.destroy();}super.onDestroy();}
}
