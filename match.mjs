import {blocked,clearLine} from './cover.mjs';
import {randomInt} from 'node:crypto';
import {tiles,verts,edges,terrainRes} from './dist/map.mjs';
const zero=()=>[0,0,0,0,0],sum=a=>a.reduce((x,y)=>x+y,0);
export const costs={Road:[1,1,0,0,0],Settlement:[1,1,1,1,0],City:[0,0,0,2,3],Development:[0,0,1,1,1]};
const requireThat=(ok,msg)=>{if(!ok)throw Error(msg)};
const five=a=>Array.isArray(a)&&a.length===5&&a.every(x=>Number.isInteger(x)&&x>=0&&x<=19);
const has=(a,b)=>a.every((x,i)=>x>=b[i]);
const all=a=>a.map((_,i)=>i);
const adj=v=>verts[v].edges.map(e=>edges[e].find(n=>n!==v));
const coast=edges.filter(([a,b])=>verts[a].tiles.filter(i=>verts[b].tiles.includes(i)).length===1).sort(([a,b],[c,d])=>Math.atan2(verts[a].y+verts[b].y-456,verts[a].x+verts[b].x-740)-Math.atan2(verts[c].y+verts[d].y-456,verts[c].x+verts[d].x-740));
export const ports=[-1,0,1,-1,2,-1,3,4,-1].map((type,i)=>({type,ends:coast[Math.floor(i*coast.length/9)]}));
export function rates(g,p){return zero().map((_,i)=>Math.min(4,...ports.filter(h=>h.ends.some(v=>g.owns[v]?.[0]===p)).map(h=>h.type===i?2:h.type===-1?3:4)))}
export function fresh(){const deck=Object.entries({Knight:14,Point:5,Monopoly:2,Plenty:2,Roads:2}).flatMap(([c,n])=>Array(n).fill(c));for(let i=deck.length-1;i>0;i--){const j=randomInt(i+1);[deck[i],deck[j]]=[deck[j],deck[i]]}return {phase:'waiting',p:0,turn:1,setup:0,lastVertex:null,owns:{},roads:{},dice:[1,1],robber:9,res:[zero(),zero()],bank:Array(5).fill(19),dev:[[],[]],deck,army:[0,0],roadHolder:null,armyHolder:null,played:false,rolled:false,log:[],winner:null,revision:0,offer:null,harvest:null}}
export function legal(g,p,t){const own=Object.values(g.owns).filter(v=>v[0]===p),rs=Object.values(g.roads).filter(v=>v===p).length;
 if(t==='Settlement')return own.filter(v=>v[1]===1).length>=5?[]:all(verts).filter(v=>!g.owns[v]&&adj(v).every(n=>!g.owns[n])&&(g.phase==='setupSettlement'||verts[v].edges.some(e=>g.roads[e]===p)));
 if(t==='City')return own.filter(v=>v[1]===2).length>=4?[]:all(verts).filter(v=>g.owns[v]?.[0]===p&&g.owns[v][1]===1);
 return rs>=15?[]:all(edges).filter(i=>g.roads[i]==null&&(g.phase==='setupRoad'?edges[i].includes(g.lastVertex):edges[i].some(v=>g.owns[v]?g.owns[v][0]===p:verts[v].edges.some(e=>g.roads[e]===p))))}
function longest(g,p){let best=0;const used=new Set();function walk(v){best=Math.max(best,used.size);if(used.size&&g.owns[v]&&g.owns[v][0]!==p)return;for(const e of verts[v].edges)if(!used.has(e)&&g.roads[e]===p){used.add(e);walk(edges[e].find(n=>n!==v));used.delete(e)}}all(verts).forEach(walk);return best}
function award(scores,threshold,holder){const m=Math.max(...scores);if(m<threshold)return null;if(holder!=null&&scores[holder]===m)return holder;return scores[0]===scores[1]?null:scores.indexOf(m)}
export function score(g,p,reveal=false){return Object.values(g.owns).reduce((s,v)=>s+(v[0]===p?v[1]:0),0)+2*Number(g.roadHolder===p)+2*Number(g.armyHolder===p)+(reveal?g.dev[p].filter(c=>c.type==='Point').length:0)}
function victory(g){if(score(g,g.p,true)>=10){g.winner=g.p;g.phase='won'}}
function move(from,to,cards){cards.forEach((x,i)=>{from[i]-=x;to[i]+=x})}
function note(g,msg){g.log.unshift(msg);g.log=g.log.slice(0,40)}
export const center=i=>({x:(tiles[i].x-370)/36*16,z:(tiles[i].y-228)/36*16});
const corner=p=>{const c=center(p?2:16);return {x:c.x+(p?9:-9),z:c.z+(p?-6:6)}};
export function production(g,sumRoll){
 const drops=[],eligible=[false,false],demand=zero();
 tiles.forEach((t,i)=>{if(i===g.robber||t.n!==sumRoll)return;const r=terrainRes[t.t];for(const v of t.vs){const b=g.owns[v];if(b)for(let j=0;j<b[1];j++){demand[r]++;drops.push({tile:i,res:r,producer:b[0]})}}});
 const actual=drops.filter(d=>demand[d.res]<=g.bank[d.res]);if(!actual.length){g.phase='main';return}
 const counts={};actual.forEach((d,id)=>{eligible[d.producer]=true;const k=counts[d.tile]||0;counts[d.tile]=k+1;const c=center(d.tile);Object.assign(d,{id,x:c.x+Math.cos(k*2.4)*(3+k*.65),z:c.z+Math.sin(k*2.4)*(3+k*.65),owner:null});while(blocked(d.x,d.z,1.3))d.z+=1;g.bank[d.res]--});
 g.harvest={id:g.turn,sum:sumRoll,eligible,drops:actual,actors:eligible.map((yes,p)=>yes?{...corner(p),dx:p?-1:1,dz:0,ix:0,iz:0,dash:0,cool:0,shield:1,hp:100,respawn:0,throwCool:0,slash:0,dashCool:0}:null),blades:[],left:45};g.phase='harvest'
}
function inside(x,z){return tiles.some((_,i)=>{const c=center(i),a=Math.abs(x-c.x)/16,b=Math.abs(z-c.z)/16;return a<1.2991&&(b+a/Math.sqrt(3))<1.501})}
function ko(h,p){const a=h.actors[p];if(!a||a.shield>0||a.respawn>0||a.dash>0)return;a.hp=Math.max(0,(a.hp??100)-35);a.shield=.45;if(a.hp>0)return;a.respawn=.8;a.ix=a.iz=0}
export function fightInput(g,p,b){const h=g.harvest,a=h?.actors[p];requireThat(g.phase==='harvest'&&a&&h.id===b.round,'No active harvest for this player');const x=Number(b.x),z=Number(b.z);requireThat(Number.isFinite(x)&&Number.isFinite(z),'Invalid movement');const len=Math.max(1,Math.hypot(x,z));a.ix=x/len;a.iz=z/len;a.inputAt=Date.now();if(x||z){a.dx=x/Math.hypot(x,z);a.dz=z/Math.hypot(x,z)}if(a.respawn>0)return;const other=h.actors[1-p];if(b.skill==='dash'&&a.dashCool<=0){a.dash=.21;a.dashCool=1.1}if(b.skill==='slash'&&a.cool<=0){a.cool=.48;a.slash=.25;if(other&&Math.hypot(other.x-a.x,other.z-a.z)<6.5&&clearLine(a,other))ko(h,1-p)}if(b.skill==='throw'&&a.throwCool<=0){a.throwCool=1.2;h.blades.push({p,x:a.x,z:a.z,dx:a.dx,dz:a.dz,age:0})}}
export function step(g,dt){const h=g.harvest;if(!h)return;h.left-=dt;h.actors.forEach((a,p)=>{if(!a)return;for(const k of ['cool','shield','throwCool','slash','dashCool'])a[k]=Math.max(0,a[k]-dt);if(a.respawn>0){a.respawn=Math.max(0,a.respawn-dt);if(!a.respawn)Object.assign(a,corner(p),{shield:1.5,hp:100});return}if(Date.now()-(a.inputAt||0)>450)a.ix=a.iz=0;const d=a.dash>0,xx=a.x+(d?a.dx*44:a.ix*17)*dt,zz=a.z+(d?a.dz*44:a.iz*17)*dt;if(inside(xx,a.z)&&!blocked(xx,a.z,.8))a.x=xx;if(inside(a.x,zz)&&!blocked(a.x,zz,.8))a.z=zz;const shelter=Object.keys(g.owns).some(id=>Math.hypot(a.x-(verts[id].x-370)*16/36,a.z-(verts[id].y-228)*16/36)<4.6);a.healing=shelter&&(a.hp??100)<100;if(a.healing)a.hp=Math.min(100,a.hp+20*dt);a.dash=Math.max(0,a.dash-dt);for(const drop of h.drops)if(drop.owner===null&&Math.hypot(a.x-drop.x,a.z-drop.z)<3){drop.owner=p;g.res[p][drop.res]++}});
 h.blades=h.blades.filter(b=>{b.age+=dt;const a=h.actors[b.p];if(b.age>.45){const dx=a.x-b.x,dz=a.z-b.z,l=Math.hypot(dx,dz);if(l<2)return false;b.dx=dx/l;b.dz=dz/l}if(!clearLine(b,{x:b.x+b.dx*38*dt,z:b.z+b.dz*38*dt}))return false;b.x+=b.dx*38*dt;b.z+=b.dz*38*dt;const o=h.actors[1-b.p];if(o&&Math.hypot(o.x-b.x,o.z-b.z)<2.8)ko(h,1-b.p);return b.age<1.7});
 if(h.left<=0||h.drops.every(d=>d.owner!==null)){for(const d of h.drops)if(d.owner==null)g.bank[d.res]++;note(g,'Harvest ended. Blue collected '+h.drops.filter(d=>d.owner===0).length+', Coral '+h.drops.filter(d=>d.owner===1).length+'.');g.harvest=null;g.phase='main';g.revision++}}
export function act(g,p,b){const a=b.action,t=b.type,id=b.id,other=1-p;
 requireThat(g.phase!=='won'&&g.phase!=='waiting','Match is not active');
 if(a==='discard'){requireThat(g.phase==='discard'&&g.owed[p]>0&&five(b.cards)&&sum(b.cards)===g.owed[p]&&has(g.res[p],b.cards),'Choose exactly the required cards');move(g.res[p],g.bank,b.cards);g.owed[p]=0;if(!g.owed.some(Boolean))g.phase='robber';return}
 if(a==='respond'){const o=g.offer;requireThat(g.phase==='main'&&o&&o.from!==p,'No offer to answer');if(b.accept){requireThat(has(g.res[p],o.want)&&has(g.res[other],o.give),'Hands have changed');move(g.res[p],g.res[other],o.want);move(g.res[other],g.res[p],o.give)}g.offer=null;return}
 requireThat(p===g.p,'Wait for your turn');
 if(a==='build'){requireThat(['Road','Settlement','City'].includes(t),'Unknown piece');const setup=g.phase==='setup'+t,free=g.phase==='freeRoad'&&t==='Road';requireThat(setup||free||g.phase==='main','Cannot build now');requireThat(legal(g,p,t).includes(id),'Choose a legal location');if(!setup&&!free){requireThat(has(g.res[p],costs[t]),'Insufficient resources');move(g.res[p],g.bank,costs[t])}
 if(t==='Road')g.roads[id]=p;else g.owns[id]=[p,t==='City'?2:1];g.offer=null;
 if(setup&&t==='Settlement'){g.lastVertex=id;if(g.setup>=2)for(const i of verts[id].tiles){const r=terrainRes[tiles[i].t];if(r!=null&&g.bank[r]){g.bank[r]--;g.res[p][r]++}}g.phase='setupRoad'}
 else if(setup){g.setup++;g.p=[0,1,1,0,0][g.setup];g.phase=g.setup===4?'roll':'setupSettlement'}
 else if(free){if(--g.free===0||!legal(g,p,'Road').length)g.phase=g.rolled?'main':'roll'}
 g.roadHolder=award([longest(g,0),longest(g,1)],5,g.roadHolder);note(g,(p?'Coral':'Blue')+' built a '+t.toLowerCase()+'.');victory(g);return}
 if(a==='roll'){requireThat(g.phase==='roll','Already rolled');g.rolled=true;g.dice=[randomInt(1,7),randomInt(1,7)];const n=sum(g.dice);note(g,(p?'Coral':'Blue')+' rolled '+n+'.');if(n===7){g.owed=g.res.map(h=>sum(h)>7?Math.floor(sum(h)/2):0);g.phase=g.owed.some(Boolean)?'discard':'robber'}else production(g,n);return}
 if(a==='robber'){requireThat(g.phase==='robber'&&Number.isInteger(id)&&tiles[id]&&id!==g.robber,'Choose another tile');g.robber=id;if(tiles[id].vs.some(v=>g.owns[v]?.[0]===other)){const cards=g.res[other].flatMap((n,i)=>Array(n).fill(i));if(cards.length){const i=cards[randomInt(cards.length)];g.res[other][i]--;g.res[p][i]++}}g.phase=g.rolled?'main':'roll';return}
 if(a==='play'){requireThat(['main','roll'].includes(g.phase)&&!g.played,'One development card per turn');const idx=g.dev[p].findIndex(c=>c.type===t&&c.bought<g.turn);requireThat(idx>=0&&t!=='Point','Card unavailable this turn');if(t==='Plenty'){requireThat(five(b.cards)&&sum(b.cards)===Math.min(2,sum(g.bank))&&has(g.bank,b.cards),'Choose available resources');move(g.bank,g.res[p],b.cards)}if(t==='Monopoly'){requireThat(Number.isInteger(id)&&id>=0&&id<5,'Choose resource');g.res[p][id]+=g.res[other][id];g.res[other][id]=0}if(t==='Knight'){g.army[p]++;g.armyHolder=award(g.army,3,g.armyHolder);g.phase='robber'}if(t==='Roads'&&legal(g,p,'Road').length){g.phase='freeRoad';g.free=2}g.dev[p].splice(idx,1);g.offer=null;g.played=true;victory(g);return}
 requireThat(g.phase==='main','Finish the current phase');
 if(a==='bank'){const from=b.from,to=b.to;requireThat(Number.isInteger(from)&&Number.isInteger(to)&&from>=0&&from<5&&to>=0&&to<5&&to!==from,'Choose different resources');const rate=rates(g,p)[from];requireThat(g.res[p][from]>=rate&&g.bank[to]>0,'Trade unavailable');g.res[p][from]-=rate;g.bank[from]+=rate;g.res[p][to]++;g.bank[to]--;g.offer=null;return}
 if(a==='offer'){requireThat(five(b.give)&&five(b.want)&&sum(b.give)>0&&sum(b.want)>0&&has(g.res[p],b.give)&&b.give.every((n,i)=>!n||!b.want[i]),'Offer different resource types you own');g.offer={from:p,give:b.give,want:b.want};return}
 if(a==='cancel'){g.offer=null;return}
 if(a==='buy'){requireThat(g.deck.length&&has(g.res[p],costs.Development),'Card unavailable');move(g.res[p],g.bank,costs.Development);g.dev[p].push({type:g.deck.pop(),bought:g.turn});g.offer=null;victory(g);return}
 requireThat(a==='end','Unknown action');g.p=other;g.turn++;g.rolled=false;g.played=false;g.offer=null;g.phase='roll';victory(g)
}
