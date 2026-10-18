(function(root){'use strict';const J=typeof module==='object'?require('./journal'):root.HorarJournal;const VERSION=1;
function normalize(i){return J.normalize({id:'shared',input:i,outcome:'',created:i.utc}).input;}
function encode(input){const data=JSON.stringify({v:VERSION,engine:input.analysisVersion===2?'1.5':'1.4',input:normalize(input)});return btoa(encodeURIComponent(data).replace(/%([0-9A-F]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function parse(hash){if(!hash.startsWith('#result='))throw Error('Неизвестный формат.');const raw=hash.slice(8);if(raw.length>16000||!/^[A-Za-z0-9_-]+$/.test(raw))throw Error('Ссылка повреждена или слишком длинная.');const d=JSON.parse(decodeURIComponent(Array.from(atob(raw.replace(/-/g,'+').replace(/_/g,'/')),ch=>'%'+ch.charCodeAt(0).toString(16).padStart(2,'0')).join('')));if(d.v!==VERSION||!['1.4','1.5'].includes(d.engine))throw Error('Эта версия ссылки не поддерживается. Попросите отправителя создать новую.');return normalize(d.input);}
function url(input){return 'https://horar-kipin.tartelk256.chatgpt.site/#result='+encode(input);}
const api={encode,parse,url};if(typeof module==='object')module.exports=api;else root.HorarShare=api;
})(globalThis);
