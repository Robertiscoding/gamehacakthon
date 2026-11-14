import {hiddenAt} from './landmarks.mjs';
import {act,legal,costs,rates,fightInput} from './match.mjs';
import {tiles,verts} from './dist/map.mjs';
export function bot(g,p=1){
 const hand=g.res[p], other=1-p;
 const move=(action,fields={})=>{act(g,p,{action,...fields});g.revision++};
 const rank=v=>verts[v].tiles.reduce((s,i)=>s+(tiles[i].n?6-Math.abs(7-tiles[i].n):0),0);
 function build(type){const choices=legal(g,p,type);if(!choices.length)return false;
 const id=type==='Road'?choices[Math.floor(Math.random()*choices.length)]:choices.sort((a,b)=>rank(b)-rank(a))[0];
 move('build',{type,id});return true}
 if(g.phase==='harvest'){const h=g.harvest,a=h.actors[p];if(!a)return;
 const distance=o=>Math.hypot(o.x-a.x,o.z-a.z);
 const d=h.drops.filter(o=>o.owner===null).sort((u,v)=>distance(u)-distance(v))[0];
 if(d)fightInput(g,p,{round:h.id,x:d.x-a.x,z:d.z-a.z,skill:h.actors[other]&&!hiddenAt(h.actors[other].x,h.actors[other].z)&&distance(h.actors[other])<6?'slash':'dash'});return}
 if(g.phase==='discard'&&g.owed[p]){const cards=hand.map(()=>0);for(let i=0;i<g.owed[p];i++){const left=hand.map((n,j)=>n-cards[j]);cards[left.indexOf(Math.max(...left))]++}return move('discard',{cards})}
 if(g.offer?.from===other)return move('respond',{accept:g.offer.want.every((n,i)=>hand[i]>=n)&&g.offer.give.reduce((a,b)=>a+b)>=g.offer.want.reduce((a,b)=>a+b)});
 if(g.p!==p)return;
 if(g.phase==='setupSettlement')return build('Settlement');
 if(['setupRoad','freeRoad'].includes(g.phase))return build('Road');
 if(g.phase==='roll')return move('roll');
 if(g.phase==='robber'){const choices=tiles.map((t,id)=>({id,value:t.vs.reduce((s,v)=>s+(g.owns[v]?(g.owns[v][0]===p?-2:1)*g.owns[v][1]:0),0)})).filter(t=>t.id!==g.robber);return move('robber',{id:choices.sort((a,b)=>b.value-a.value)[0].id})}
 if(g.phase!=='main')return;
 const card=g.dev[p].find(c=>c.type!=='Point'&&c.bought<g.turn);
 if(card&&!g.played){const cards=hand.map(()=>0);for(let i=0;i<2;i++){const j=g.bank.findIndex((n,j)=>n>cards[j]);if(j>=0)cards[j]++}return move('play',{type:card.type,cards,id:hand.indexOf(Math.min(...hand))})}
 for(const type of ['City','Settlement','Road','Development'])if(costs[type].every((n,i)=>hand[i]>=n)){if(type==='Development'){if(g.deck.length)return move('buy')}else if(build(type))return}
 const rate=rates(g,p),from=hand.findIndex((n,i)=>n>=rate[i]);const to=hand.findIndex((n,i)=>!n&&g.bank[i]>0);if(from>=0&&to>=0)return move('bank',{from,to});
 move('end')
}
