const $=id=>document.getElementById(id), names=['Lumber','Brick','Wool','Grain','Ore'], tints=['#dde6cf','#eedac7','#e8ead9','#f4e7b9','#e0e1d9'];
const ink='#484b36';
const icons=[
'<g fill="#946a40"><path d="m7 28 27-17 10 6-27 18z"/><path d="m18 31 28-17 10 6-28 18z"/><path d="m16 20 26-15 10 6-26 17z"/></g><g fill="#e1b678"><ellipse cx="13" cy="31" rx="7" ry="6"/><ellipse cx="24" cy="34" rx="7" ry="6"/><ellipse cx="22" cy="24" rx="7" ry="6"/></g><path d="m20 23 4 2-2 2m-12 3 4 2m8 1 4 2m5-14 15-9m-16 20 17-10" fill="none"/>',
'<g fill="#a45e43"><path d="m5 26 18-9 16 7v9l-18 9-16-8z"/><path d="m25 25 17-8 15 7v8l-17 9-15-8z"/><path d="m15 15 18-9 16 7v10l-18 9-16-8z"/></g><g fill="#d3976f"><path d="m5 26 18-9 16 7-18 9z"/><path d="m25 25 17-8 15 7-17 9z"/><path d="m15 15 18-9 16 7-18 9z"/></g><path d="M31 22v9m9 1v8m-19-7v8" fill="none"/>',
'<path d="m16 30 1 9h4l1-9m12 0 1 9h4l2-11" fill="#777966"/><path d="M9 23q-4-9 6-11 3-9 12-5 8-6 13 1 11-2 11 8 6 6-1 12-1 9-11 7-7 6-13 1-10 4-14-3-8-1-3-10z" fill="#f3efe1"/><path d="M39 18q6-7 11-3l6 7-4 8-7-2-4-6-7-3z" fill="#6c7161"/><circle cx="49" cy="20" r="1"/><path d="M15 18q0-5 6-4m4 10q2-5 6-3" fill="none"/>',
'<g stroke="#695d34" fill="#d3ae4c"><path d="m12 38 25-30m-15 32L48 8m-20 31L55 18" fill="none"/>'+[0,1,2].map((v)=>'<g transform="translate('+(v*9)+' '+(v===2?7:0)+') rotate(36 24 22)"><path d="M23 33V6m0 22q-9-2-8-10 8 3 8 10zm0-7q-8-3-7-10 7 2 7 10zm0 5q9-3 8-10-7 2-8 10zm0-8q8-4 6-10-6 3-6 10zm0-3q-5-6 0-13 5 6 0 13z"/></g>').join('')+'</g>',
'<path d="m6 31 9-17 12-3 10 16-5 10-19 1z" fill="#9d9f8d"/><path d="m22 29 7-20 14-4 12 16-9 12z" fill="#888e82"/><path d="m34 38-6-11 11-13 12 5 7 14-10 6z" fill="#b3b6a3"/><path d="m15 14 8 11-10 13m10-13 4-14m2-2 9 7 5-11m-4 9 5 12 7-7m-7 7 4 13" fill="none"/>'];
const icon=(i)=>'<svg viewBox="0 0 64 44" aria-hidden="true"><g stroke="'+ink+'" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">'+icons[i]+'</g></svg>';
const terrains=['forest','pasture','fields','hills','mountains','forest','pasture','fields','hills','desert','mountains','fields','forest','pasture','hills','forest','mountains','fields','pasture'];
const numbers=[5,2,6,3,8,10,9,12,11,0,4,8,10,9,4,5,6,3,11], terrainRes={forest:0,hills:1,pasture:2,fields:3,mountains:4};
const tiles=[],verts=[],edges=[],vmap=new Map(),emap=new Map();const R=54, W=Math.sqrt(3)*R;
for(let r=-2;r<=2;r++)for(let q=Math.max(-2,-r-2);q<=Math.min(2,-r+2);q++){
 const x=370+W*(q+r/2),y=228+1.5*R*r,id=tiles.length,vs=[];
 for(let a=0;a<6;a++){const ang=(a*60-90)*Math.PI/180,vx=x+R*Math.cos(ang),vy=y+R*Math.sin(ang),key=Math.round(vx)+','+Math.round(vy);if(!vmap.has(key)){vmap.set(key,verts.length);verts.push({x:vx,y:vy,tiles:[],edges:[]})}let v=vmap.get(key);verts[v].tiles.push(id);vs.push(v)}
 for(let i=0;i<6;i++){const va=vs[i],vb=vs[(i+1)%6],key=[va,vb].sort((a,b)=>a-b).join();if(!emap.has(key)){let e=edges.length;emap.set(key,e);edges.push([va,vb]);verts[va].edges.push(e);verts[vb].edges.push(e)}}
 tiles.push({x,y,vs,t:terrains[id],n:numbers[id]})
}
const costs={Road:[1,1,0,0,0],Settlement:[1,1,1,1,0],City:[0,0,0,2,3]},colors=['#536f44','#b3623f'],key='catan-duel-v1';let g,mode='',muted=localStorage.getItem('duel-sound')!=='on';
const adjacent=v=>verts[v].edges.map(e=>edges[e].find(n=>n!==v));
function fresh(){g={turn:1,p:0,rolled:false,dice:[3,5],robber:9,res:[[2,2,1,1,0],[2,2,1,1,0]],owns:{},roads:{},log:['Both players founded two settlements.'],winner:null};for(const [x,y,p] of [[280,153,0],[465,300,0],[445,156,1],[279,305,1]]){const v=verts.map((a,i)=>({i,d:Math.hypot(x-a.x,y-a.y)})).filter(a=>verts[a.i].tiles.length===3&&!g.owns[a.i]&&adjacent(a.i).every(n=>!g.owns[n])).sort((a,b)=>a.d-b.d)[0].i;g.owns[v]=[p,1];g.roads[verts[v].edges[p]]=p}mode='';save()}
function save(){localStorage.setItem(key,JSON.stringify(g))}
try{g=JSON.parse(localStorage.getItem(key))}catch{}if(!g)fresh();
function points(p){return Math.floor((g.wins?.[p]??0)/3)+Object.values(g.owns).filter(a=>a[0]===p).reduce((s,a)=>s+a[1],0)}
function log(s){g.log.unshift('Turn '+g.turn+' · '+s);g.log=g.log.slice(0,80)}
function affordable(type,p){return costs[type].every((v,i)=>g.res[p][i]>=v)}
function legal(type,p){
 if(type==='City')return Object.keys(g.owns).map(Number).filter(v=>g.owns[v][0]===p&&g.owns[v][1]===1);
 if(type==='Settlement')return verts.map((_,i)=>i).filter(v=>!g.owns[v]&&adjacent(v).every(n=>!g.owns[n])&&verts[v].edges.some(e=>g.roads[e]===p));
 return edges.map((_,i)=>i).filter(i=>g.roads[i]==null&&edges[i].some(v=>g.owns[v]?g.owns[v][0]===p:verts[v].edges.some(e=>g.roads[e]===p)))
}
function build(type,id,p){if(g.duel||!g.rolled||g.winner!==null||g.p!==p||!affordable(type,p)||!legal(type,p).includes(id))return;costs[type].forEach((v,i)=>g.res[p][i]-=v);if(type==='Road')g.roads[id]=p;else g.owns[id]=[p,type==='City'?2:1];log((p?'Opponent':'You')+' built a '+type.toLowerCase()+'.');if(points(p)>=10)g.winner=p;mode='';draw()}
function choose(type){if(g.winner!==null||g.p||!g.rolled||g.moving||!affordable(type,0)||!legal(type,0).length){show(type,'<p>'+costText(type)+'</p><p>'+(g.winner!==null?'The match has ended.':g.p?'Wait for your next turn.':!g.rolled?'Roll the dice to start building.':g.moving?'Move the robber first.':!affordable(type,0)?'You need more resources to build this.':'There are no legal locations yet. Extend your road network first.')+'</p>');return}mode=mode===type?'':type;draw()}
function costText(t){return 'Costs '+costs[t].map((n,i)=>n?n+' '+names[i].toLowerCase():null).filter(Boolean).join(', ')+'.'}
function show(title,html){$('dialogtitle').textContent=title;$('dialogbody').innerHTML=html;if(!$('dialog').open)$('dialog').showModal()}
function rules(){show('Duel rulebook','<p>Reach <b>10 victory points</b> before the computer. Each player begins with two settlements, two roads, and six resources.</p><p>Roll both dice. Every matching tile produces its resource for adjacent settlements. Cities collect twice as much.</p><p>Build roads from your network. Place a settlement at a connected junction at least two edges from every other building. Upgrade a settlement to a city for a second victory point.</p><p>Trade four of one resource for one of another. On a seven, hands over seven cards discard half at random. Move the robber to block a tile and fight an adjacent opponent for a card.</p><p><b>Settlement raids.</b> Once on your turn, select Raid a settlement and choose a rival tile. Fight a first-person duel using that terrain’s weapon. The winner claims one card from the loser, or a supply card if the loser has none. Every three duel wins earn a victory point. Your rival can raid you, and robber attacks also trigger duels.</p><p>This quick duel uses roads, settlements, cities, and bank trades. Progress saves after each action.</p>')}
function settings(){show('Game settings','<p>Play a fresh duel against the computer. Starting again replaces your current match.</p><button class="primary" onclick="restart()">Start new match</button>')}
function restart(){clearTimeout(botTimer);fresh();dialog.close();draw()}
function legend(){show('Island legend',Object.entries(terrainRes).map(([t,i])=>'<div class="legendrow">'+icon(i)+'<b>'+names[i]+'</b> · '+t+'</div>').join('')+'<p>Number discs show the roll that produces resources. More dots mean a more likely roll. The dark pawn marks the robber.</p>')}
function historyDialog(){show('Match log',g.log.map(s=>'<p>'+s+'</p>').join(''))}
const d6=()=>1+Math.floor(Math.random()*6);
function take(p){const cards=g.res[p].flatMap((n,i)=>Array(n).fill(i));if(!cards.length)return -1;const i=cards[Math.floor(Math.random()*cards.length)];g.res[p][i]--;return i}
function roll(){if(g.rolled||g.winner!==null)return;g.rolled=true;g.dice=[d6(),d6()];const sum=g.dice[0]+g.dice[1];log((g.p?'Opponent':'You')+' rolled '+sum+'.');tone();if(sum===7){for(let p=0;p<2;p++){const n=g.res[p].reduce((a,b)=>a+b);if(n>7)for(let j=0;j<Math.floor(n/2);j++)take(p)}g.moving=true;if(g.p){const targets=tiles.map((t,i)=>({i,s:t.vs.reduce((s,v)=>s+(g.owns[v]?(g.owns[v][0]===0?1:-1)*g.owns[v][1]:0),0)})).filter(t=>t.i!==g.robber).sort((a,b)=>b.s-a.s);moveRobber(targets[0].i)}}else tiles.forEach((t,i)=>{if(i!==g.robber&&t.n===sum)t.vs.forEach(v=>{if(g.owns[v]){let [p,n]=g.owns[v];g.res[p][terrainRes[t.t]]+=n}})});draw()}
function moveRobber(i){if(!g.moving||i===g.robber)return;g.robber=i;g.moving=false;const other=1-g.p;if(tiles[i].vs.some(v=>g.owns[v]?.[0]===other)){launchRaid(i,g.p,true);return}log('The robber moved to '+tiles[i].t+'.');draw()}
function tone(){if(muted)return;try{const a=new AudioContext();[0,.08].forEach((t)=>{let o=a.createOscillator(),v=a.createGain();o.type='triangle';o.frequency.value=300+Math.random()*120;v.gain.setValueAtTime(.09,a.currentTime+t);v.gain.exponentialRampToValueAtTime(.001,a.currentTime+t+.1);o.connect(v);v.connect(a.destination);o.start(a.currentTime+t);o.stop(a.currentTime+t+.12)});setTimeout(()=>a.close(),400)}catch{}}
function trade(){const opts=names.map((n,i)=>'<option value="'+i+'">'+n+'</option>').join('');show('Bank trade','<p>Exchange four matching resource cards for one card of your choice.</p><label>Give 4 <select id="give">'+opts+'</select></label><br><label>Get 1 <select id="get">'+opts+'</select></label><p id="tradehint"></p><button class="primary" onclick="exchange()">Trade cards</button>');$('get').value='1'}
function exchange(){let a=+$('give').value,b=+$('get').value;let err=g.winner!==null?'The match has ended.':g.p||!g.rolled||g.moving?'Trade after rolling and resolving the robber.':a===b?'Choose two different resources.':g.res[0][a]<4?'You need four '+names[a].toLowerCase()+' cards.':'';if(err){$('tradehint').textContent=err;return}g.res[0][a]-=4;g.res[0][b]++;log('You traded for '+names[b].toLowerCase()+'.');dialog.close();draw()}
let botTimer;
function finish(){if(g.winner!==null||!g.rolled||g.moving)return;g.p=1-g.p;g.rolled=false;g.turn++;mode='';draw();if(g.p)botTimer=setTimeout(bot,850)}
function siteValue(v){return verts[v].tiles.reduce((s,i)=>s+(tiles[i].n?6-Math.abs(7-tiles[i].n):0),0)}
function roadValue(e){const potential=edges[e].map(v=>{if(!g.owns[v]&&adjacent(v).every(n=>!g.owns[n]))return 20+siteValue(v);return adjacent(v).some(n=>!g.owns[n]&&adjacent(n).every(m=>!g.owns[m]))?7:0});return Math.max(...potential)+Math.random()*2}
function bot(){if(!g.p||g.winner!==null||g.duel)return;if(!g.rolled)roll();if(g.duel)return;if(g.turn%8===0&&g.lastRaid!==g.turn){const targets=tiles.flatMap((t,i)=>t.vs.some(v=>g.owns[v]?.[0]===0)?[i]:[]);if(targets.length){launchRaid(targets[Math.floor(Math.random()*targets.length)],1,false);return}}if(g.moving)moveRobber((g.robber+1)%19);for(let n=0;n<4&&g.winner===null;n++){const desired=['City','Settlement','Road'].filter(t=>legal(t,1).length);let type=desired.find(t=>affordable(t,1));if(!type){let traded=false;for(const t of desired){const need=costs[t].findIndex((v,i)=>g.res[1][i]<v),give=g.res[1].findIndex((v,i)=>v>=4+costs[t][i]);if(need>=0&&give>=0){g.res[1][give]-=4;g.res[1][need]++;traded=true;break}}if(traded)continue;break}let options=legal(type,1).map(id=>({id,value:type==='Road'?roadValue(id):siteValue(id)})).sort((a,b)=>b.value-a.value);build(type,options[0].id,1)}draw();if(g.winner===null)botTimer=setTimeout(finish,850)}
let island;
function onAction(id){
 if(g.duel)return;
 if(id.startsWith('tile:')){const i=Number(id.slice(5));if(mode==='raid'&&raidTargets().includes(i))launchRaid(i,0,false);else if(g.moving&&!g.p)moveRobber(i);return}
 if(id.startsWith('place:')){if(costs[mode])build(mode,Number(id.slice(6)),0);return}
 if(id==='raid'){if(g.p||g.moving||g.winner!==null||g.lastRaid===g.turn)return;mode=mode==='raid'?'':'raid';draw();return}
 if(id==='action'){if(g.winner!==null)restart();else if(g.p||g.moving)return;else if(mode){mode='';draw()}else if(g.rolled)finish();else roll();return}
 if(id==='build'){show('Build on the island',Object.keys(costs).map(t=>'<button class="buildchoice" data-choice="'+t+'"><b>'+t+'</b><span>'+costText(t)+'</span></button>').join(''));return}
 if(id==='sound'){muted=!muted;localStorage.setItem('duel-sound',muted?'off':'on');tone();draw();return}
 const actions={rules,legend,log:historyDialog,settings,trade};actions[id]?.()
}
$('dialogbody').addEventListener('click',e=>{const t=e.target.closest('[data-choice]')?.dataset.choice;if(t){$('dialog').close();choose(t)}});
function draw(){
 save();const moving=g.moving&&!g.p;
 const locations=mode==='raid'?raidTargets():moving?tiles.flatMap((_,i)=>i!==g.robber?[i]:[]):mode?legal(mode,0):[];
 const title=g.winner!==null?(g.winner?'Rival wins':'You win!'):g.p?'Rival’s turn':'Your turn';
 const action=g.winner!==null?'Play again':g.p?'Thinking…':moving?'Move robber':mode?'Cancel':g.rolled?'End turn':'Roll dice';
 const hint=moving?'Choose the robber’s next tile.':mode==='raid'?'Choose a glowing tile to raid.':mode?'Choose a glowing spot for your '+mode.toLowerCase()+'.':g.rolled?'Rolled '+(g.dice[0]+g.dice[1])+'. Build, trade or end your turn.':'Roll to collect resources.';
 const data={...g,moving,mode,locations,points:[points(0),points(1)],res:g.res[0],title,action,hint,muted,disabled:g.winner===null&&(!!g.p||!!moving),raidDisabled:!!g.p||!!g.duel||!!g.moving||g.winner!==null||g.lastRaid===g.turn};
 if(!island){try{island=window.createIsland(tiles,verts,edges,onAction)}catch(err){console.error(err);$('island').textContent='The 3D island needs WebGL 2. Please enable hardware acceleration and reload.'}}
 island?.update(data);
 const choices=[['action',action,data.disabled],['build','Build'],['trade','Trade'],['raid','Raid a settlement',data.raidDisabled],['rules','Rulebook'],['legend','Island legend'],['log','Match log'],['sound','Toggle sound'],['settings','New match']];
 locations.forEach(i=>{const tile=mode==='raid'||moving;choices.push([(tile?'tile:':'place:')+i,tile?'Select '+tiles[i].t+' tile '+(i+1):'Place '+mode+' at '+(i+1)])});
 $('access').innerHTML='<b>'+title+'</b><span>'+hint+'</span>'+choices.map(([id,label,disabled])=>'<button data-key="'+id+'" '+(disabled?'disabled':'')+'>'+label+'</button>').join('');
}
$('access').onclick=e=>{if(e.target.dataset.key)onAction(e.target.dataset.key)};
draw();if(g.p&&g.winner===null)botTimer=setTimeout(bot,850);
function raidTargets(){return tiles.flatMap((t,i)=>t.vs.some(v=>g.owns[v]?.[0]===1)?[i]:[])}
function launchRaid(tile,attacker,robber){if(g.duel)return;mode='';g.lastRaid=g.turn;g.duel={tile,attacker,robber};draw();enterRaid()}
function enterRaid(){const d=g.duel;window.startArena(tiles[d.tile].t,d.attacker===1,won=>{const winner=won?0:1,loser=1-winner;let card=take(loser);if(card<0)card=terrainRes[tiles[d.tile].t]??0;g.res[winner][card]++;g.wins??=[0,0];g.wins[winner]++;if(points(winner)>=10)g.winner=winner;const message=(won?'You won':'Your rival won')+' the duel and claimed one '+names[card].toLowerCase()+'.'+(g.wins[winner]%3===0?' Three duel victories earned one victory point.':'');log(message);delete g.duel;draw();show(won?'Duel won':'Duel lost','<p>'+message+'</p><button class="primary" onclick="dialog.close()">Return to table</button>');if(g.p&&g.winner===null)$('dialog').addEventListener('close',()=>{botTimer=setTimeout(bot,650)},{once:true})})}
if(g.duel){clearTimeout(botTimer);enterRaid()}
