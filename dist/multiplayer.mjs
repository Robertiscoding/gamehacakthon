import {tiles,verts,edges} from './map.mjs';
const $=id=>document.getElementById(id),names=['Lumber','Brick','Wool','Grain','Ore'],dialog=$('dialog'),body=$('dialogbody');
const practice=new URLSearchParams(location.search).has('practice');
const key='frontier-seat';let token=location.hash.slice(1)||localStorage.getItem(key);
if(location.hash){localStorage.setItem(key,token);history.replaceState(null,'',location.pathname)}
let s,island,mode='',inRound=false,walking=false,busy=false,lastView='',polling=false;
function show(title,html){$('dialogtitle').textContent=title;body.innerHTML=html;if(!dialog.open)dialog.showModal()}
async function api(route,data){const r=await fetch('/api/'+route,{method:data?'POST':'GET',headers:{'X-Practice':practice?'1':'0',Authorization:'Bearer '+token,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined,cache:'no-store'});const v=await r.json();if(!r.ok)throw Error(v.error||'Connection failed');return v}
async function action(action,fields={}){if(busy)return;busy=true;try{const fresh=await api('action',{action,...fields,revision:s.revision});dialog.close();mode='';apply(fresh)}catch(e){show('Move unavailable','<p></p>');body.firstChild.textContent=e.message}finally{busy=false}}
function button(id,label){return '<button class="buildchoice" data-command="'+id+'">'+label+'</button>'}
const options=names.map((n,i)=>'<option value="'+i+'">'+n+'</option>').join('');
function vector(label,tag){return '<fieldset><legend>'+label+'</legend>'+names.map((n,i)=>'<label>'+n+' <input style="width:46px" type="number" min="0" max="19" value="0" data-vector="'+tag+'"></label> ').join('')+'</fieldset>'}
const getVec=tag=>[...body.querySelectorAll('[data-vector="'+tag+'"]')].map(n=>Number(n.value));
function trade(){show('Trade', '<p>Your bank and harbor rates: '+names.map((n,i)=>n+' '+s.rates[i]+':1').join(' · ')+'</p><label>Give <select id="give">'+options+'</select></label> <label>Get <select id="get">'+options+'</select></label>'+button('bank','Trade with bank')+vector('Offer your friend','give')+vector('Request in return','want')+button('offer','Send trade offer')+(s.offer?button('cancel','Cancel offer'):''));$('get').value='1'}
function cards(){show('Development cards',button('buy','Buy · 1 wool, 1 grain, 1 ore')+(s.dev.length?s.dev.map(c=>button('card-'+c.type,c.type+(c.bought===s.turn?' · just bought':''))).join(''):'<p>Your hand is empty.</p>')+'<p>Victory point cards score automatically. Play one other card per turn.</p>')}
function rules(){show('Catan for two','<p>Place two settlements and two roads in Blue, Coral, Coral, Blue order. Your second settlement supplies starting resources. Leave at least one empty intersection between buildings.</p><p>Roll, resolve production, then trade and build. Only players with buildings beside a producing tile enter its harvest. Settlements spawn one pickup and cities two. Collect pickups by walking over them. Swords and returning blades are active for this 45-second phase only. Unclaimed tokens go back to the bank.</p><p>On seven, hands over seven discard half, rounded down. Move the robber and steal a random card from an adjacent opponent. The robber blocks production.</p><p>Trade with your friend, the bank at 4:1, or a harbor. A settlement scores one, a city two. Longest Road (five or more) and Largest Army (three or more knights) each score two. Reach ten on your turn to win.</p>')}
const portNames=['Lumber','Brick','Wool','Grain','Ore'];
function onAction(id){
 if(!s||inRound||walking)return;
 if(id.startsWith('place:'))return action('build',{id:+id.slice(6),type:buildMode()});
 if(id.startsWith('tile:'))return action('robber',{id:+id.slice(5)});
 if(id==='visit'){if(s.phase!=='main'||s.p!==s.seat)return;walking=true;window.startArena('pasture',false,()=>{walking=false;draw()},island,9,true,()=>false).catch(()=>{walking=false;draw()});return}
 if(id==='action'){if(s.phase==='waiting'&&s.seat===0){window.open('/?practice','_blank');return}
 if(s.phase==='discard'&&s.owed[s.seat])return show('Discard '+s.owed[s.seat]+' cards',vector('Your selection','discard')+button('discard','Discard cards'));
 if(s.offer&&s.offer.from!==s.seat)return show('Trade offer','<p>You receive '+describe(s.offer.give)+'. Give '+describe(s.offer.want)+'.</p>'+button('accept','Accept')+button('reject','Decline'));
 if(s.p!==s.seat)return;if(s.phase==='roll')return action('roll');if(s.phase==='main'&&mode){mode='';draw();return}if(s.phase==='main')return action('end');return}
 if(id==='build')return show('Build',button('choose-Road','Road · 1 lumber, 1 brick')+button('choose-Settlement','Settlement · 1 lumber, brick, wool and grain')+button('choose-City','City · 2 grain, 3 ore'));
 if(id==='trade')return trade();if(id==='raid')return cards();if(id==='rules'||id==='settings')return rules();
 if(id==='legend')return show('Harbors and terrain','<p>Coastal markers show the trade ratio. Build on either end of the marked coastal edge to use its rate.</p><p>Forest produces lumber, hills brick, pasture wool, fields grain, and mountains ore.</p>');
 if(id==='log')return show('Match log',s.log.map(m=>'<p>'+m+'</p>').join('')||'<p>Waiting for the first settlement.</p>')
}
const describe=v=>v.map((x,i)=>x?x+' '+names[i].toLowerCase():'').filter(Boolean).join(', ');
body.onclick=e=>{const c=e.target.closest('[data-command]')?.dataset.command;if(!c)return;
 if(c.startsWith('choose-')){if(s.p!==s.seat||s.phase!=='main')return show('Build','<p>Build after production on your turn.</p>');mode=c.slice(7);dialog.close();draw();return}
 if(c.startsWith('card-')){const type=c.slice(5);if(type==='Point')return show('Victory point','<p>This card already counts toward your victory total.</p>');if(type==='Monopoly')return show(type,'<select id="resource">'+options+'</select>'+button('monopoly','Claim resource'));if(type==='Plenty')return show('Year of Plenty',vector('Choose two available bank resources','plenty')+button('plenty','Take resources'));return action('play',{type})}
 if(c==='monopoly')return action('play',{type:'Monopoly',id:+$('resource').value});if(c==='plenty')return action('play',{type:'Plenty',cards:getVec('plenty')});if(c==='bank')return action('bank',{from:+$('give').value,to:+$('get').value});if(c==='offer')return action('offer',{give:getVec('give'),want:getVec('want')});if(c==='discard')return action('discard',{cards:getVec('discard')});if(['accept','reject'].includes(c))return action('respond',{accept:c==='accept'});action(c)
};
function buildMode(){if(s.p!==s.seat)return '';return ({setupRoad:'Road',setupSettlement:'Settlement',freeRoad:'Road'})[s.phase]||mode}
function draw(){if(!s||!island||inRound||walking)return;const own=s.p===s.seat,phase=s.phase,build=buildMode(),robber=own&&phase==='robber',offer=s.offer&&s.offer.from!==s.seat,discard=phase==='discard'&&s.owed[s.seat]>0;
 const act=discard?'Discard':offer?'Trade offer':phase==='waiting'&&s.seat===0?'Practice vs bot':phase==='waiting'?'Waiting…':phase==='won'?'Game over':!own?'Waiting…':phase==='roll'?'Roll dice':phase==='main'?mode?'Cancel':'End turn':robber?'Move robber':'Place '+build;
 const hint=phase==='waiting'?'Waiting for your friend to open their seat link.':phase==='won'?'First to 10 victory points.':discard?'Choose cards to discard.':offer?'Your friend sent a trade offer.':build?'Choose a glowing '+(build==='Road'?'edge':'intersection')+' for your '+build.toLowerCase()+'.':robber?'Choose a different tile.':!own?(practice?'The bot is taking its turn.':'Your friend is taking their turn.'):phase==='roll'?'Roll to produce resources.':'Trade, build or end your turn.';
 const locs=robber?tiles.flatMap((_,i)=>i!==s.robber?[i]:[]):build?s.legal[build]:[];
 island.update({...s,muted:true,mode:build,moving:robber,locations:locs,raidDisabled:false,title:phase==='waiting'?'Lobby':phase==='won'?(s.winner===s.seat?'You win!':'Friend wins'):own?'Your turn':practice?'Bot’s turn':'Friend’s turn',hint,action:act,disabled:!(phase==='waiting'&&s.seat===0||discard||offer||own&&['main','roll'].includes(phase)),showHint:true});
 const cmds=[['action',act],['build','Build'],['trade','Trade'],['raid','Development cards'],['visit','Roam'],['rules','Rules'],['log','Match log']];locs.forEach(i=>cmds.push([(robber?'tile:':'place:')+i,(robber?'Move robber':build)+' position '+(i+1)]));
 $('access').innerHTML='<b>'+hint+'</b>'+cmds.map(([id,t])=>'<button data-key="'+id+'">'+t+'</button>').join('');$('access').onclick=e=>onAction(e.target.dataset.key)
}
function apply(next){if(s&&next.revision<s.revision)return;const previous=s;s=next;if(!island)island=window.createIsland(tiles,verts,edges,onAction);
 if(s.phase==='harvest'&&!inRound&&!walking){inRound=true;dialog.close();window.liveHarvest(island,()=>s,b=>api('input',b)).finally(()=>{inRound=false;mode='';draw()})}
 const v=[s.revision,s.phase,...s.online].join();if(v!==lastView){lastView=v;if(previous?.phase!==s.phase)mode='';draw()}}
async function poll(){if(polling)return;polling=true;try{apply(await api('state'));$('connection').hidden=true}catch{$('connection').hidden=false}finally{polling=false;setTimeout(poll,s?.phase==='harvest'?90:420)}}
async function start(){if(!token&&location.hostname==='127.0.0.1'){try{const r=await fetch('/api/local-seat',{method:'POST'});if(r.ok){token=(await r.json()).token;localStorage.setItem(key,token)}}catch{}}if(!token)return show('Join a match','<p>Open the personal seat link from the host.</p>');try{apply(await api('join',{}));poll()}catch(e){show('Seat unavailable','<p>Open your personal seat link to join.</p>')}}
start();
