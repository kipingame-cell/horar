(function(root){'use strict';const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
function create(saved){return saved&&saved.v===1&&['beginner','pro'].includes(saved.mode)&&saved.slots?.beginner&&saved.slots?.pro?clone(saved):{v:1,mode:'beginner',count:0,slots:{beginner:{draft:null,input:null,id:null},pro:{draft:null,input:null,id:null}}};}
function commit(state,input,draft,id){const slot={input:clone(input),draft:clone(draft),id:id||null};state.slots[state.mode]=slot;if(state.count===0)state.slots[state.mode==='beginner'?'pro':'beginner']=clone(slot);state.count++;return state;}
const api={create,commit};if(typeof module==='object')module.exports=api;else root.HorarSession=api;
})(globalThis);
