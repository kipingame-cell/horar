importScripts('places.js');
let ready,nativeDb,nativeResolve,nativeReject;
async function readData(file){const response=await fetch('data/'+file);if(!response.ok)throw Error('Не удалось открыть справочник.');const bytes=new Uint8Array(await response.arrayBuffer());if(bytes[0]===31&&bytes[1]===139){if(typeof DecompressionStream==='undefined')throw Error('Обновите Android System WebView для поиска по справочнику.');return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());}return JSON.parse(new TextDecoder().decode(bytes));}
function load(){if(!ready)ready=(async()=>{const meta=await readData('places-meta.json');const chunks=await Promise.all(meta.files.map(readData));return {meta,index:HorarPlaces.index(chunks.flat(),meta)};})().catch(e=>{ready=null;throw e;});return ready;}
onmessage=async({data})=>{
 if(data.kind==='native-start'){nativeDb={meta:data.meta,index:[]};ready=new Promise((resolve,reject)=>{nativeResolve=resolve;nativeReject=reject;});return;}
 if(data.kind==='native-chunk'){try{nativeDb.index.push(...HorarPlaces.index(JSON.parse(data.json),nativeDb.meta));}catch(e){nativeReject(e);}return;}
 if(data.kind==='native-end'){nativeResolve(nativeDb);return;}
 if(data.kind==='native-error'){nativeReject(Error(data.error));return;}
 try{const db=await load();postMessage({id:data.id,results:HorarPlaces.search(db.index,data.q),regions:db.meta.regions,zones:db.meta.zones,count:db.meta.count});}catch(e){postMessage({id:data.id,error:e.message});}};
