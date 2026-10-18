/* Horar 1.0: deterministic astronomical and symbolic calculation engine. */
(function(root){
'use strict';
const A=typeof module==='object'?require('./vendor/astronomy.js'):root.Astronomy;
const D=Math.PI/180, mod=x=>(x%360+360)%360, delta=(a,b)=>mod(a-b+180)-180;
const names=['Солнце','Луна','Меркурий','Венера','Марс','Юпитер','Сатурн'];
const bodies=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
const glyphs=['☉','☽','☿','♀','♂','♃','♄'];
const signs=['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
const rulers=[4,3,2,1,0,2,3,4,5,6,6,5];
const exalt=[0,1,-1,5,-1,2,6,-1,-1,4,-1,3];
const aspects=[{angle:0,name:'Соединение'},{angle:60,name:'Секстиль'},{angle:90,name:'Квадрат'},{angle:120,name:'Трин'},{angle:180,name:'Оппозиция'}];
function longitude(i,date){return A.Ecliptic(A.GeoVector(bodies[i],date,true)).elon;}
function houses(date,lat,lon,system='regio'){
 const t=(A.SiderealTime(date)*15+lon)*D,p=lat*D,r=A.Rotation_ECT_EQD(date).rot,c=r[1][1],s=r[1][2];
 const north=[-Math.sin(p)*Math.cos(t),-Math.sin(p)*Math.sin(t),Math.cos(p)];
 function cusp(h){const q=t+mod((h-10)*30)*D,e=[Math.cos(q),Math.sin(q),0];
 const n=[-north[2]*e[1],north[2]*e[0],north[0]*e[1]-north[1]*e[0]];
 let l=Math.atan2(-n[0],n[1]*c+n[2]*s); if(Math.cos(l)*e[0]+Math.sin(l)*c*e[1]<0)l+=Math.PI;return mod(l/D);}
 const asc=cusp(1),mc=cusp(10);
 const cusps=Array.from({length:12},(_,i)=>system==='whole'?mod(Math.floor(asc/30)*30+i*30):system==='equal'?mod(asc+i*30):cusp(i+1));
 return {asc,mc,cusps};
}
function houseOf(l,cusps){for(let i=0;i<12;i++)if(mod(l-cusps[i])<mod(cusps[(i+1)%12]-cusps[i]))return i+1;return 1;}
function dignity(i,l){const s=Math.floor(l/30),out=[]; if(rulers[s]===i)out.push('Обитель');if(rulers[(s+6)%12]===i)out.push('Изгнание');if(exalt[s]===i)out.push('Экзальтация');if(exalt[(s+6)%12]===i)out.push('Падение');return out.length?out:['Нет обители / экзальтации'];}
function validate(input){if(!input.question?.trim()||input.question.length>1000)throw Error('Введите вопрос длиной от 1 до 1000 символов.');
 const date=new Date(input.utc);if(!Number.isFinite(+date)||date.getUTCFullYear()<1900||date.getUTCFullYear()>2100)throw Error('Выберите дату с 1900 по 2100 год.');
 if(!Number.isFinite(input.lat)||Math.abs(input.lat)>65)throw Error('Поддерживаются широты от −65° до +65°. Полярные карты пока не рассчитываются.');
 if(!Number.isFinite(input.lon)||Math.abs(input.lon)>180)throw Error('Долгота должна быть от −180° до +180°.');
 if(!['regio','equal','whole'].includes(input.system))throw Error('Неизвестная система домов.');
 if(!Number.isInteger(input.target)||input.target<2||input.target>12)throw Error('Выберите дом предмета вопроса.');return date;}
function calculate(input){const date=validate(input),h=houses(date,input.lat,input.lon,input.system);
 const planets=bodies.map((b,i)=>{const l=longitude(i,date),speed=delta(longitude(i,new Date(+date+3600000)),longitude(i,new Date(+date-3600000)))*12;return {i,name:names[i],glyph:glyphs[i],lon:l,sign:Math.floor(l/30),speed,retro:speed<0,house:houseOf(l,h.cusps),dignity:dignity(i,l)};});
 const pairs=[];for(let i=0;i<7;i++)for(let j=i+1;j<7;j++){const sep=Math.abs(delta(planets[i].lon,planets[j].lon));for(const a of aspects){const orb=Math.abs(sep-a.angle),limit=(i<2||j<2)?8:6;if(orb>limit)continue;
 const futureSep=Math.abs(delta(longitude(i,new Date(+date+600000)),longitude(j,new Date(+date+600000))));
 pairs.push({i,j,...a,orb,applying:Math.abs(futureSep-a.angle)<orb});}}
 const querent=rulers[Math.floor(h.cusps[0]/30)],subject=rulers[Math.floor(h.cusps[input.target-1]/30)];
 const primary=pairs.find(p=>p.i===Math.min(querent,subject)&&p.j===Math.max(querent,subject));
 const receptions=[]; for(const [guest,host] of [[querent,subject],[subject,querent]]){const sign=planets[guest].sign;if(rulers[sign]===host)receptions.push(`${names[host]} принимает ${names[guest]} по обители.`);if(exalt[sign]===host)receptions.push(`${names[host]} принимает ${names[guest]} по экзальтации.`);}
 const notices=[];const ascDeg=h.asc%30;if(ascDeg<3)notices.push('ASC в первых 3°: в традиционной трактовке вопрос может ещё формироваться.');if(ascDeg>=27)notices.push('ASC в последних 3°: в традиционной трактовке ситуация может быть уже определена.');
 if(planets[6].house===7)notices.push('Сатурн в VII доме: традиционное предостережение о сложности суждения.');
 for(const i of new Set([querent,subject]))if(i!==0){const sep=Math.abs(delta(planets[i].lon,planets[0].lon));if(sep<17/60)notices.push(`${names[i]}: казими по порогу 17′.`);else if(sep<8.5)notices.push(`${names[i]}: сожжение по порогу 8°30′.`);else if(sep<17)notices.push(`${names[i]}: под лучами Солнца (менее 17°).`);}
 let verdict='Нужен дополнительный разбор',explanation='Сходящегося мажорного аспекта в заданном орбисе между управителями не найдено. Само по себе это не означает «нет».';
 if(querent===subject)explanation='Оба дома имеют одного управителя. Автоматический ответ «да / нет» здесь ненадёжен; разделите роли вручную при дальнейшем разборе.';
 else if(primary){verdict=primary.applying?'Есть сходящийся аспект':'Аспект уже расходится';explanation=`${names[querent]} и ${names[subject]}: ${primary.name.toLowerCase()}, орбис ${primary.orb.toFixed(2)}°. `+(primary.applying?'Угловое расстояние сейчас приближается к точному аспекту. Это символическое указание на взаимодействие, а не обещание исхода.':'Точный аспект остался позади по локальному движению. В традиционной трактовке это может описывать уже произошедшее.');}
 return {version:1,input:{...input,question:input.question.trim()},date:date.toISOString(),...h,planets,pairs,querent,subject,primary,receptions,notices,verdict,explanation};
}
// Search actual Moon aspects until next sign ingress, not just current orb.
function lunarEvents(chart){const start=+new Date(chart.date),moon0=chart.planets[1].lon,sign=chart.planets[1].sign;const step=3600000;let ingress=start+4*86400000,prevTime=start;
 for(let t=start+step;t<=ingress;t+=step){if(Math.floor(longitude(1,new Date(t))/30)!==sign){let lo=prevTime,hi=t;for(let k=0;k<25;k++){const m=(lo+hi)/2;if(Math.floor(longitude(1,new Date(m))/30)===sign)lo=m;else hi=m;}ingress=hi;break;}prevTime=t;}
 const events=[];for(let i=0;i<7;i++){if(i===1)continue;let t0=start,d0=delta(moon0,chart.planets[i].lon);for(let t=start+step;t<=ingress+step;t+=step){const t1=Math.min(t,ingress-1),d1=delta(longitude(1,new Date(t1)),longitude(i,new Date(t1)));for(const a of aspects)for(const target of a.angle===0||a.angle===180?[a.angle]:[a.angle,-a.angle]){const e0=delta(d0,target),e1=delta(d1,target);if(e0*e1<0&&Math.abs(e1-e0)<30){let lo=t0,hi=t1,left=e0;for(let k=0;k<22;k++){const m=(lo+hi)/2,e=delta(delta(longitude(1,new Date(m)),longitude(i,new Date(m))),target);if(left*e<=0)hi=m;else {lo=m;left=e;}}events.push({i,name:a.name,utc:new Date((lo+hi)/2).toISOString()});}}d0=d1;t0=t1;if(t1>=ingress-1)break;}}
 return {ingress:new Date(ingress).toISOString(),events:events.sort((a,b)=>a.utc.localeCompare(b.utc)),void:events.length===0};}
const api={calculate,lunarEvents,houses,longitude,mod,delta,names,glyphs,signs,rulers,aspects,houseOf};if(typeof module==='object')module.exports=api;else root.Horar=api;
})(typeof globalThis!=='undefined'?globalThis:this);
