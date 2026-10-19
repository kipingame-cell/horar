/* Method 4: declared traditional rules; versions 2/3 remain reproducible. */
(function(root){'use strict';
const H=typeof module==='object'?require('./engine'):root.Horar,V=typeof module==='object'?require('./analysis-v2'):root.HorarAnalysisV2,Old=typeof module==='object'?require('./analysis-v3'):root.HorarAnalysisV3;
const DAY=86400000,ORBS=[17,12.5,7,8,7.5,12,10],time=e=>+new Date(e.utc),has=(e,i)=>e.i===i||e.j===i,pair=(e,i,j)=>has(e,i)&&has(e,j),labels=Old.routeNames;
const sources=[
 ['Lilly / Zadkiel, главы 19–21','https://www.globalgreyebooks.com/online-ebooks/william-lilly_introduction-to-astrology_complete-text.html'],
 ['Deborah Houlding: Identifying Significators','https://www.skyscript.co.uk/horary1a.html'],
 ['Graeme Tobyn: Perfection and its denial','https://www.skyscript.co.uk/tobyn2.html'],
 ['Sue Ward: Considerations Before Judgment','https://theastrologypodcast.com/transcripts/tap-ep-296-transcript-the-considerations-before-judgment-with-sue-ward/'],
 ['Christopher Warnock: Aspects, Orbs & Perfection','https://www.renaissanceastrology.com/aspects.html'],
 ['Anthony Louis: Lilly on Prohibition','https://tonylouis.wordpress.com/2018/08/08/lilly-on-prohibition-in-horary-astrology/'],
 ['Lee Lehman: Horary Astrology Questions','https://theastrologypodcast.com/transcripts/ep-116-transcript-horary-astrology-questions-with-lee-lehman/']
];
function application(c,i,j,angle){const a=c.planets[i],b=c.planets[j],orb=Math.abs(Math.abs(H.delta(a.lon,b.lon))-angle),limit=(ORBS[i]+ORBS[j])/2;return {i:Math.min(i,j),j:Math.max(i,j),angle,name:H.aspects.find(a=>a.angle===angle).name,orb,limit,...H.aspectMotion(a.lon,b.lon,a.speed,b.speed,angle)};}
function inApplication(c,i,j,angle){const p=application(c,i,j,angle);return p.orb<=p.limit&&['applying','exact'].includes(p.phase);}
function currentPairs(c){const out=[];for(let i=0;i<7;i++)for(let j=i+1;j<7;j++)for(const a of H.aspects){const p=application(c,i,j,a.angle);if(p.orb<=p.limit)out.push(p);}return out;}
function received(c,guest,host){return V.reception(c.planets[guest],c.planets[host],H.sunAboveHorizon(new Date(c.date),c.input.lat,c.input.lon));}
function firstContact(f,i,start){return f.events.find(e=>has(e,i)&&time(e)>start);}
// This declared Lilly form needs the interloper's two ordered contacts.
function interpositions(c,f,event,ids=[]){const start=+new Date(c.date),end=time(event),out=[],a=event.i,b=event.j;if(!inApplication(c,a,b,event.angle))return out;
 const faster=Math.abs(c.planets[a].speed)>=Math.abs(c.planets[b].speed)?a:b,slower=faster===a?b:a;
 for(let k=0;k<7;k++){if([a,b,...ids].includes(k))continue;
  const hit=f.events.find(e=>pair(e,k,slower)&&time(e)>start&&time(e)<end),first=hit&&f.events.find(e=>pair(e,k,faster)&&time(e)>start&&time(e)<time(hit));
  if(hit&&first&&Math.abs(c.planets[k].speed)>Math.abs(c.planets[faster].speed)&&inApplication(c,k,faster,first.angle)&&inApplication(c,k,slower,hit.angle)&&!f.changes.some(e=>[k,slower,faster].includes(e.i)&&time(e)>start&&time(e)<time(hit)))out.push({type:'prohibition',via:k,event:hit,detail:`${H.names[k]} сначала касается ${H.names[faster]}, затем ${H.names[slower]} раньше их связи.`});
  else if(hit&&event.angle===0&&hit.angle===0&&Math.abs(c.planets[slower].speed)>Math.abs(c.planets[k].speed)&&inApplication(c,slower,k,0))out.push({type:'frustration',via:k,event:hit,detail:`${H.names[slower]} раньше соединяется с ${H.names[k]}.`});
 }return out;
}
function planPathsV4(c,f,past={events:[],changes:[]},refrenations=[]){const start=+new Date(c.date),q=c.querent,s=c.subject,paths=[],rejected=[],deferred=[];
 const next=(i,j)=>f.events.find(e=>pair(e,i,j)&&time(e)>start&&inApplication(c,i,j,e.angle));
 function candidate(type,legs,ids,via=null,extra={}){const end=time(legs.at(-1)),origin=extra.origin,blocked=[...f.changes.filter(e=>e.type==='ingress'&&ids.includes(e.i)&&time(e)>start&&time(e)<end).map(e=>({type:'ingress',event:e,detail:`${H.names[e.i]} меняет знак до контакта.`})),...legs.flatMap(e=>interpositions(c,f,e,ids)),...refrenations.filter(r=>legs.some(e=>pair(r,e.i,e.j)&&r.angle===e.angle)&&time(r.event)<end)];
  if(origin&&time(origin)<start)blocked.push(...past.changes.filter(e=>ids.includes(e.i)&&time(e)>time(origin)&&time(e)<start).map(e=>({type:e.type,event:e,detail:'Условия изменились после исходного контакта.'})));
  const item={type,via,legs,event:legs.at(-1),...extra,blocked};(blocked.length?rejected:paths).push(item);return item;
 }
 if(q!==s){const exact=c.pairs.find(p=>pair(p,q,s)&&p.phase==='exact'),e=exact?{...exact,utc:c.date}:next(q,s);if(e)candidate('direct',[e],[q,s]);else{const later=f.events.find(e=>pair(e,q,s));if(later)deferred.push({type:'direct',event:later,detail:'Будущий контакт сейчас не является сходящимся аспектом в орбисе.'});}}
 if(q!==s&&q!==1&&s!==1&&(c.input.actorHouse||1)===1){const e=next(1,s);if(e)candidate('lunar',[e],[1,s],1,{independent:false});}
 if(q!==s)for(let k=0;k<7;k++){if([q,s].includes(k))continue;
  const last=past.events.filter(e=>has(e,k)&&time(e)<start).at(-1),first=firstContact(f,k,start);
  for(const [from,to] of [[q,s],[s,q]]){const separation=c.pairs.find(e=>pair(e,k,from)&&e.phase==='separating');
   if(last&&has(last,from)&&separation&&first&&has(first,to)&&inApplication(c,k,to,first.angle)&&Math.abs(c.planets[k].speed)>Math.max(Math.abs(c.planets[q].speed),Math.abs(c.planets[s].speed))){
    const r=received(c,k,from),item=candidate('translation',[first],[k,q,s],k,{origin:last,sequence:'past-present',sourceReception:r});
    if(!r.positive.some(x=>['domicile','exaltation','triplicity','term'].includes(x))){item.blocked.push({type:'reception',detail:'Источник не принимает переводящую планету по принятому порогу.'});if(paths.includes(item)){paths.splice(paths.indexOf(item),1);rejected.push(item);}}
   }
  }
  const a=next(q,k),b=next(s,k);if(!a||!b||Math.abs(c.planets[k].speed)>=Math.min(Math.abs(c.planets[q].speed),Math.abs(c.planets[s].speed)))continue;
  const item=candidate('collection',[a,b].sort((a,b)=>time(a)-time(b)),[q,s,k],k),receptions=[received(c,k,q),received(c,k,s)];item.receptions=receptions;
  if(!receptions.every(r=>r.positive.length)||firstContact(f,q,start)!==a||firstContact(f,s,start)!==b){item.blocked.push({type:'collection-condition',detail:'Обе стороны должны принимать медленного собирателя; он должен получить их первые приложения.'});if(paths.includes(item)){paths.splice(paths.indexOf(item),1);rejected.push(item);}}
 }
 for(const r of refrenations)if(pair(r,q,s))rejected.push({type:'direct',event:r.event,legs:[],blocked:[r]});
 return {paths,rejected,deferred};
}
function quality(c,r){if(r.strength==='secondary')return {outcome:'unclear',reason:'Есть только вторичное свидетельство; оно не заменяет основной способ осуществления.'};
 const states=c.analysis.states,results=r.legs.map(e=>{let from,to;if(r.type==='lunar'){from=1;to=c.subject;}else if(r.type==='translation'){from=r.via;to=e.i===from?e.j:e.i;}else if(r.type==='collection'){to=r.via;from=e.i===to?e.j:e.i;}else {from=Math.abs(c.planets[e.i].speed)>=Math.abs(c.planets[e.j].speed)?e.i:e.j;to=from===e.i?e.j:e.i;}
  const one=received(c,from,to),two=received(c,to,from),mutual=one.strong&&two.strong,mutualHouse=one.positive.includes('domicile')&&two.positive.includes('domicile'),x=states[from],y=states[to],combust=x.solar==='combust'||y.solar==='combust',weak=[x,y].some(s=>s.score<0||s.retro||s.cadent||s.solar==='beams'),negative=one.negative.length&&two.negative.length;
  if(e.angle===180)return {outcome:mutualHouse&&!combust?'unclear':'no',reason:mutualHouse&&!combust?'Оппозиция с взаимной рецепцией допускает контакт, но положительный исход неоднозначен.':'Противостояние не имеет достаточного взаимного принятия для положительного итога.'};
  if(e.angle===90){const strongHouses=x.score>0&&y.score>0&&!x.cadent&&!y.cadent&&!x.retro&&!y.retro;
   if(combust||(!mutual&&!strongHouses))return {outcome:'no',reason:combust?'Напряжённая связь сочетается с сожжением: оснований считать её успешным исходом недостаточно.':'Напряжённая связь не подкреплена взаимным сильным принятием или устойчивым положением обеих сторон.'};
   return {outcome:'yes',qualified:true,reason:'Связь трудная, но поддержка сторон позволяет считать осуществление более вероятным по выбранным правилам.'};}
  if(y.solar==='combust'&&!mutual||negative&&!mutual)return {outcome:'no',reason:y.solar==='combust'?'Принимающая сторона сильно ослаблена, а взаимной поддержки нет.':'Взаимное неблагоприятное отношение не подкрепляет положительный исход.'};
  return {outcome:'yes',qualified:weak||combust||!!one.negative.length||!!two.negative.length,reason:weak||combust?'Рабочая связь есть, но положение сторон добавляет трудности.':'Найдена сходящаяся связь без решающего препятствия на этом пути.'};
 });return results.find(x=>x.outcome==='no')||results.find(x=>x.outcome==='unclear')||{outcome:'yes',qualified:results.some(x=>x.qualified),reason:results.map(x=>x.reason).filter((x,i,a)=>a.indexOf(x)===i).join(' ')};
}
function judgeRoutes(c,plan){const rated=plan.paths.map(route=>({route,...quality(c,route)})),yes=rated.filter(x=>x.outcome==='yes'),no=rated.filter(x=>x.outcome==='no'),unclear=rated.filter(x=>x.outcome==='unclear');
 const current=c.pairs.some(p=>pair(p,c.querent,c.subject)&&['applying','exact'].includes(p.phase)),windowLimited=current&&!rated.length&&!plan.rejected.length;
 if(c.querent===c.subject)return {answer:'unclear',status:'same',route:null,reason:'Основные роли совпали; автоматическая подмена одной из них Луной не выполняется.',rated};
 if(yes.length){const directNo=no.some(x=>x.route.type==='direct'),chosen=yes.find(x=>x.route.type==='direct')||yes[0];if(directNo)return {answer:'unclear',status:'unclear',route:chosen.route,reason:'Основные показатели и дополнительный путь дают разные выводы; однозначный исход не выбран.',rated};return {answer:'yes',status:chosen.qualified?'conditional':'supported',route:chosen.route,reason:chosen.reason,rated};}
 if(unclear.length&&(!no.length||unclear.some(x=>x.route.strength!=='secondary')))return {answer:'unclear',status:'unclear',route:unclear[0].route,reason:unclear[0].reason,rated};
 if(windowLimited)return {answer:'unclear',status:'unclear',route:null,reason:'Есть текущее схождение, но точный контакт не найден в выбранном окне поиска.',rated};
 return {answer:'no',status:plan.rejected.length||no.length?'blocked':'unsupported',route:no[0]?.route||null,reason:no[0]?.reason||(plan.rejected.length?'Найденные текущие способы связи не проходят проверку условий.':'Текущего способа соединить стороны не найдено: нет подходящего прямого, лунного или посреднического контакта.'),rated};
}
const cache=new Map();
function enrich(c,provided){if(c.input.analysisVersion!==4)return Old.enrich(c,provided);const start=+new Date(c.date),days=c.input.horizon===90?90:30,key=start+':'+days;let scans=cache.get(key);if(!scans){scans={future:provided||V.scan(start,days),past:V.scan(start-30*DAY,30)};if(cache.size>=5)cache.delete(cache.keys().next().value);cache.set(key,scans);}if(provided)scans={...scans,future:provided};
 c.pairs=currentPairs(c);V.enrich(c,scans.future);const a=c.analysis,refrenation=Old.refrenations(c,scans.future),plan=planPathsV4(c,scans.future,scans.past,refrenation);
 const mirrors=Old.mirrorPaths(c,scans.future);for(const p of mirrors){p.legs=[p.event];(p.blocked.length?plan.rejected:plan.paths).push(p);}
 let judgement=judgeRoutes(c,plan),unsupported=/любит|чувству|думает обо|как относится|изменяет|где (?:моя|мой|находится)|кто (?:взял|украл)/iu.test(c.input.question)||/(?:(?:^|[^а-яё])не (?:прид[её]т|состоится|будет|уволят)|избегу|перестанет)/iu.test(c.input.question);
 if(a.context.intent==='open')judgement={...judgement,answer:'unclear',status:'open',reason:'Вопрос не сводится к наступлению одного события.'};
 if(unsupported)judgement={...judgement,answer:'unclear',status:'scope',reason:'Этот вопрос об отношении, местонахождении или отрицании события требует другой схемы. Сформулируйте одно проверяемое событие.'};
 const words=c.input.question.toLowerCase().replace(/ё/g,'е').match(/[а-яa-z]+/giu)||[];
 const vague=!words.length||words.every(w=>['да','нет','ли','или','ну','а','это','оно','он','она','они','я','мы','получится','будет','сбудется','случится','состоится'].includes(w));
 if(vague)judgement={...judgement,answer:'unclear',status:'question',route:null,reason:'Не указано событие: уточните, что должно произойти и с кем.'};
 const directPath=plan.paths.find(p=>p.type==='direct')||plan.rejected.find(p=>p.type==='direct');
 const route=judgement.route,mutual=c.querent!==c.subject&&a.receptions.every(r=>r.strong),evidence=[{direction:judgement.answer==='yes'?'support':judgement.answer==='no'?'obstacle':'neutral',text:judgement.reason}];
 for(const p of plan.rejected)evidence.push({direction:'neutral',text:`Отклонённый вариант «${labels[p.type]}»: ${[...new Set(p.blocked.map(b=>b.detail))].join(' ')}`});
 for(const p of plan.deferred)evidence.push({direction:'neutral',text:p.detail});
 for(const check of a.checks)if(check.id==='seventh'&&c.input.target===7){check.active=false;check.detail='Вопрос относится к VII дому: его состояние описывает предмет вопроса, а не автоматически ошибку астролога.';}
 c.notices=a.checks.filter(x=>x.active).map(x=>x.label+': '+x.detail);
 const dignityNames={domicile:'обитель',exaltation:'экзальтация',triplicity:'триплицитет',term:'терм',face:'фас',detriment:'изгнание',fall:'падение'};
 c.receptions=a.receptions.map(r=>`Принимающая планета: ${H.names[r.host]}; принимаемая: ${H.names[r.guest]}. Поддержка: ${r.positive.map(k=>dignityNames[k]||k).join(', ')||'не найдена'}.`+(r.negative.length?' Негативная рецепция: '+r.negative.map(k=>dignityNames[k]||k).join(', ')+'.':''));
 const checks=Object.entries(labels).map(([id,label])=>{const found=id==='mutual'?(mutual?[1]:[]):id==='refranation'?refrenation:id==='prohibition'||id==='frustration'?plan.rejected.flatMap(p=>p.blocked.filter(b=>b.type===id)):plan.paths.filter(p=>p.type===id),blocked=plan.rejected.filter(p=>p.type===id);return {id,label,status:found.length?'found':blocked.length?'blocked':'none',count:found.length,detail:found.length?`Найдено: ${found.length}. Геометрия оценивается отдельно от пригодности для положительного исхода.`:blocked.length?[...new Set(blocked.flatMap(p=>p.blocked.map(b=>b.detail)))].join(' '):'В текущей карте этот признак не найден.'};});
 c.verdict=judgement.answer==='yes'?(judgement.status==='conditional'?'Скорее да, но с трудностями':'Скорее да'):judgement.answer==='no'?'Скорее нет':'Ответ пока не определяется';c.explanation=judgement.reason;
 Object.assign(a,{version:4,method:'Традиционная модель 1.7 (явно выбранные правила)',sources,judgement,answer:judgement.answer,status:judgement.status,route,routes:plan.paths,paths:plan.paths.filter(p=>['translation','collection'].includes(p.type)),rejected:plan.rejected,deferred:plan.deferred,mechanisms:checks,refranation:refrenation,mutual,evidence,support:evidence.filter(e=>e.direction==='support').length,obstacles:evidence.filter(e=>e.direction==='obstacle').length,direct:{event:directPath?.event||null,blocked:plan.rejected.filter(p=>p.type==='direct').flatMap(p=>p.blocked.map(b=>b.event||b)),valid:!!directPath&&!directPath.blocked.length},interference:null,limits:'Выбранная формализация традиционного суждения, не универсальное правило всех школ. Египетские термы и дневной/ночной триплицитет; орбисы по сумме половин планетных орбисов. Текущие применения до смены знака; рефранация требует фактического разворота схождения. Строгий перенос с исходной рецепцией; собирание с приёмом собирателя обеими сторонами. Нет голосования количеством признаков и запрета по числу предостережений. Окно 30/90 дней и шаг 6 часов ограничивают поиск; касательные корни могут быть пропущены. Календарные сроки события, местонахождение, чувства, все специальные вопросы и все варианты вмешательства не вычисляются. Это символическая интерпретация, не научно подтверждённый прогноз.'});return c;
}
function upgradeInput(i){return {...Old.upgradeInput(i),analysisVersion:4};}
const api={...Old,enrich,upgradeInput,application,currentPairs,inApplication,planPathsV4,interpositions,quality,judgeRoutes,sources,planetOrbs:ORBS};if(typeof module==='object')module.exports=api;else root.HorarAnalysis=api;
})(globalThis);
