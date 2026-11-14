import {verts} from './dist/map.mjs';
import {battleMusic,playCue} from './score.js';
import {altitude,hiddenAt,mineAt,flock} from './landmarks.mjs';
import * as T from 'three';
import {adventurer} from './garden.js';
import {bladeKit,returningBlade} from './blades.js';
import {placeAsset} from './assets.js';
function setText(node,value){if(node.textContent!==value)node.textContent=value}
export async function liveHarvest(island,read,input){
 await island.environment(9);if(!read()?.harvest)return;
 const shared=island.takeCamera(9),{scene,canvas,renderer}=shared,root=new T.Group();scene.add(root);
 const camera=new T.OrthographicCamera(-1,1,1,-1,.1,500),arena=document.getElementById('arena'),field=document.getElementById('field');
 arena.hidden=false;arena.className='bladeround';field.append(canvas);renderer.autoClear=true;document.querySelector('main').inert=true;
 document.getElementById('brief').hidden=true;document.getElementById('pauseRaid').hidden=true;document.getElementById('battleName').textContent='Harvest scramble';
 document.getElementById('biome').textContent='ROLL '+read().harvest.sum;
 const hud=document.createElement('div'),tips=document.createElement('div');hud.className='roundHUD';tips.className='roundControls';arena.append(hud,tips);
 const banner=document.createElement('div');banner.className='harvestBanner';banner.setAttribute('role','status');arena.append(banner);
 const combatNotice=document.createElement('div');combatNotice.className='combatNotice';combatNotice.setAttribute('role','status');arena.append(combatNotice);
  battleMusic(true);let pickups=0,warps=0;
 const local=read().seat,initial=read().harvest;tips.textContent=initial.eligible[local]?'WASD move · Space slash · F throw · Shift dash · E mine tunnel':'Watching the other player collect';
 const actors=initial.eligible.map((eligible,p)=>{if(!eligible)return null;const obj=adventurer(root,p);obj.scale.setScalar(3.4);const tag=document.createElement('canvas');tag.width=256;tag.height=72;const ctx=tag.getContext('2d');ctx.fillStyle=p?'#943553':'#175280';ctx.fillRect(0,0,256,72);ctx.fillStyle='white';ctx.font='bold 43px system-ui';ctx.textAlign='center';ctx.fillText(p===local?'YOU':p?'CORAL':'BLUE',128,52);const badge=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(tag),depthTest:false}));badge.position.y=3.9;badge.scale.set(3,.85,1);badge.renderOrder=8;obj.add(badge);const sword=bladeKit(obj,p?0xff889f:0x63dbf1);sword.position.set(.85,1.4,.45);return {obj,sword}});
 const names=['Wood','Brick','Sheep','Wheat','Ore'],colors=['#78ffc3','#ff946f','#f2fff4','#ffdc57','#bcb4ff'];
 const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=96;
 const brush=glowCanvas.getContext('2d'),gradient=brush.createRadialGradient(48,48,1,48,48,48);
 gradient.addColorStop(0,'white');gradient.addColorStop(.32,'rgba(255,255,255,.72)');gradient.addColorStop(1,'rgba(255,255,255,0)');
 brush.fillStyle=gradient;brush.fillRect(0,0,96,96);
 const glowMap=new T.CanvasTexture(glowCanvas),markers=new Map();
 const drops=initial.drops.map(d=>{
   const q=new T.Group();q.position.set(d.x,.1+altitude(d.x,d.z),d.z);root.add(q);
   const glow=new T.Sprite(new T.SpriteMaterial({map:glowMap,color:colors[d.res],transparent:true,depthTest:false,depthWrite:false}));glow.position.y=2;glow.renderOrder=4;q.add(glow);
   const ring=new T.Mesh(new T.RingGeometry(2.15,2.58,24),new T.MeshBasicMaterial({color:colors[d.res],side:T.DoubleSide,depthTest:false,depthWrite:false,transparent:true}));
   ring.rotation.x=-Math.PI/2;ring.renderOrder=5;q.add(ring);
   const m=placeAsset(q,'res-'+['lumber','brick','wool','grain','ore'][d.res],[0,2,0],[4,3.7,3.5]);
   if(!markers.has(d.tile)){
     const canvas=document.createElement('canvas');canvas.width=256;canvas.height=88;
     const material=new T.SpriteMaterial({map:new T.CanvasTexture(canvas),depthTest:false,depthWrite:false});
     const label=new T.Sprite(material);label.renderOrder=9;label.scale.set(16,5.5,1);root.add(label);
     markers.set(d.tile,{label,ctx:canvas.getContext('2d'),count:-1,type:d.res})
   }
   return {q,m,ring,glow}
 });
 function markResources(h){
   const remaining=new Map();for(const d of h.drops)if(d.owner==null){const group=remaining.get(d.tile)||[];group.push(d);remaining.set(d.tile,group)}
   for(const [tile,marker] of markers){const group=remaining.get(tile)||[],{label,ctx,type}=marker;
     label.visible=group.length>0;if(marker.count===group.length)continue;marker.count=group.length;if(!group.length)continue;
     const first=group[0];label.position.set(first.x,altitude(first.x,first.z)+11,first.z);
     ctx.clearRect(0,0,256,88);ctx.fillStyle='#192c36';ctx.strokeStyle=colors[type];ctx.lineWidth=6;
     ctx.beginPath();ctx.roundRect(4,4,248,64,20);ctx.fill();ctx.stroke();ctx.fillStyle=colors[type];ctx.beginPath();ctx.moveTo(116,69);ctx.lineTo(140,69);ctx.lineTo(128,86);ctx.fill();
     ctx.textAlign='center';ctx.fillStyle='white';ctx.font='bold 38px system-ui';ctx.fillText(names[type]+' ×'+group.length,128,49);label.material.map.needsUpdate=true
   }
 }
 const keys=new Set(),ev=new AbortController(),opts={signal:ev.signal},blades=[];let skill='',sending=false,frame;const touch=document.createElement('div');touch.className='bladeTouch';touch.innerHTML='<div>'+['W','A','S','D'].map((v,i)=>'<button data-key="Key'+v+'">'+['↑','←','↓','→'][i]+'</button>').join('')+'</div><div>'+['slash','throw','dash','mine'].map(v=>'<button data-skill="'+v+'">'+v+'</button>').join('')+'</div>';arena.append(touch);
 for(const b of touch.querySelectorAll('button')){b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);if(b.dataset.key)keys.add(b.dataset.key);else skill=b.dataset.skill};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key)}
 window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(!e.repeat)skill=({Space:'slash',KeyF:'throw',KeyE:'mine',ShiftLeft:'dash',ShiftRight:'dash'})[e.code]||skill},opts);window.addEventListener('keyup',e=>keys.delete(e.code),opts);window.addEventListener('blur',()=>keys.clear(),opts);
 canvas.addEventListener('pointerdown',e=>{skill=e.button===2?'throw':'slash'},opts);canvas.addEventListener('contextmenu',e=>e.preventDefault(),opts);
 let lastInputTime=0,lastX,lastZ;
 const timer=setInterval(async()=>{const round=read()?.harvest;if(!round||round.countdown>0||round.outro>0){skill='';return}if(!initial.eligible[local]||sending)return;const x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),z=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));const now=performance.now();if(!skill&&x===lastX&&z===lastZ&&(!(x||z)||now-lastInputTime<170))return;sending=true;lastX=x;lastZ=z;lastInputTime=now;const k=skill;skill='';if(k==='slash'||k==='throw')playCue('blade');else if(k==='dash')playCue('dash');try{await input({round:initial.id,x,z,skill:k})}catch{lastX=undefined}finally{sending=false}},32);
 const previousRatio=renderer.getPixelRatio(),shadowUpdates=renderer.shadowMap.autoUpdate;
 renderer.setPixelRatio(Math.min(previousRatio,1.15));renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 const offset=new T.Vector3(0,184,125);
 camera.position.copy(offset);camera.lookAt(0,0,0);
 function resize(){const aspect=innerWidth/innerHeight,span=Math.max(170,226/aspect);
   camera.left=-span*aspect/2;camera.right=-camera.left;camera.top=span/2;camera.bottom=-camera.top;
   camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)
 }
 resize();window.addEventListener('resize',resize,opts);
 const picker=document.createElement('div');picker.className='spawnPicker';arena.append(picker);
 const buttons=Object.entries(read().owns).filter(([,owner])=>owner[0]===local).map(([id,owner],i)=>{
   const v=verts[id],point=new T.Vector3((v.x-370)*16/36,5,(v.y-228)*16/36);
   const button=document.createElement('button');button.textContent=(owner[1]===2?'City ':'Settlement ')+(i+1);
   button.onclick=()=>input({round:initial.id,skill:'spawn',vertex:Number(id)}).catch(()=>{button.textContent='Retry '+(i+1)});
   picker.append(button);return {button,point}
 });
 const herd=flock(0).map(()=>placeAsset(root,'pasture-sheep',[0,0,0],[4,3,3]));
 const projected=new T.Vector3();
 let previousHarvest,arrival=0,wasDown=false,lastKillTime=null;
 await new Promise(resolve=>{function tick(now){const s=read(),h=s?.harvest;if(!h){resolve();return}
 const selecting=h.spawns?.includes(null),choosing=selecting&&h.spawns[local]===null;
 picker.hidden=!choosing;
 if(choosing){camera.updateMatrixWorld();for(const {button,point} of buttons){projected.copy(point).project(camera);button.style.left=(50+projected.x*50)+'%';button.style.top=(50-projected.y*50)+'%'}}
 const dead=h.actors[local]?.respawn||0,kill=h.lastKill;
 const killText=kill?.killer===local&&kill.at-h.left<2?'You eliminated '+(kill.victim?'Coral':'Blue')+'!':'';
 setText(combatNotice,dead>0?(h.outro?'You died':'You died · Respawning in '+Math.ceil(dead)+'s'):killText);
 combatNotice.classList.toggle('down',dead>0);
 const message=selecting?(choosing?'Choose your settlement':'Waiting for opponent'):h.outro>0?'Resource collection over':h.countdown>0?String(Math.ceil(h.countdown)):h.left>44.25?'START':'';
 banner.classList.toggle('selecting',!!selecting);if(banner.textContent!==message){
   if(['3','2','1'].includes(message))playCue('bell');
   else if(message==='START')playCue('horn');
   else if(h.outro>0)playCue('trade');
   setText(banner,message)
 }
 frame=requestAnimationFrame(tick);
 if(h!==previousHarvest){
   if(dead>0&&!wasDown)playCue('death');
   if(dead===0&&wasDown&&!h.outro)playCue('respawn');
   if(kill?.killer===local&&kill.at!==lastKillTime&&kill.at-h.left<2)playCue('kill');
   wasDown=dead>0;lastKillTime=kill?.at??null;
   markResources(h);
   flock(45-h.left).forEach((animal,i)=>{herd[i].position.set(animal.x,0,animal.z);herd[i].rotation.y=animal.yaw});
   const duration=Math.min(180,Math.max(50,now-arrival));arrival=now;previousHarvest=h;
   h.actors.forEach((a,p)=>{const actor=actors[p];if(!actor)return;
     if(!a){actor.obj.visible=false;actor.started=false;return}
     const snap=!actor.started||actor.warps!==(a.warps||0)||a.respawn>0||Math.hypot(actor.obj.position.x-a.x,actor.obj.position.z-a.z)>15;
     actor.fromX=snap?a.x:actor.obj.position.x;actor.fromZ=snap?a.z:actor.obj.position.z;actor.duration=duration;
     actor.started=true;actor.warps=a.warps||0
   })
 }
 h.actors.forEach((a,p)=>{if(!a||!actors[p])return;const {obj,sword,fromX,fromZ,duration}=actors[p],t=Math.min(1,(now-arrival)/duration);
   const x=fromX+(a.x-fromX)*t,z=fromZ+(a.z-fromZ)*t;
   obj.position.set(x,altitude(x,z)+.14+((a.ix||a.iz)?Math.abs(Math.sin(now*.012))*.10:0),z);
   obj.rotation.y=Math.atan2(a.dx,a.dz);obj.visible=a.respawn<=0&&(!selecting||h.spawns[p]!==null);sword.rotation.y=a.slash?3.8*(1-a.slash/.25)-1.4:.25
 });
 h.drops.forEach((d,i)=>{const {q,m,glow,ring}=drops[i];q.visible=d.owner==null;if(q.visible){m.rotation.y=now*.002;const pulse=Math.sin(now*.004+i);glow.scale.setScalar(8+pulse);ring.scale.setScalar(1+.12*pulse);m.position.y=4.6+.4*pulse}});
 h.blades.forEach((b,i)=>{if(!blades[i]){blades[i]=returningBlade();root.add(blades[i])}blades[i].position.set(b.x,1.7+(b.height||0),b.z);blades[i].rotation.y=now*.022});blades.forEach((b,i)=>b.visible=i<h.blades.length);
 const me=h.actors[local],count=h.drops.filter(d=>d.owner===local).length;if(count>pickups)playCue('pickup');pickups=count;if((me?.warps||0)>warps)playCue('mine');warps=me?.warps||0;if(me)setText(tips,mineAt(me.x,me.z)?'Hidden in mine · E to travel':hiddenAt(me.x,me.z)?'Concealed in wheat':'WASD move · Space slash · F throw · Shift dash · E mine tunnel');
 setText(hud,h.eligible.some((yes,i)=>yes&&!s.online[i])?'Waiting for reconnection':Math.ceil(h.left)+'s · '+h.drops.filter(d=>d.owner!=null).length+'/'+h.drops.length+' collected');renderer.render(scene,camera)}tick(performance.now())});
 battleMusic(false);combatNotice.remove();picker.remove();for(const actor of actors)actor?.obj.traverse(o=>{if(o.isSprite){o.material.map.dispose();o.material.dispose()}});banner.remove();cancelAnimationFrame(frame);clearInterval(timer);ev.abort();scene.remove(root);root.traverse(o=>{if(o.geometry?.type==='ExtrudeGeometry'){o.geometry.dispose();o.material.dispose()}});for(const d of drops){d.glow.material.dispose();d.ring.geometry.dispose();d.ring.material.dispose()}glowMap.dispose();for(const {label} of markers.values()){label.material.map.dispose();label.material.dispose()}hud.remove();tips.remove();touch.remove();arena.hidden=true;arena.className='';document.getElementById('pauseRaid').hidden=false;document.querySelector('main').inert=false;renderer.setPixelRatio(previousRatio);renderer.shadowMap.autoUpdate=shadowUpdates;renderer.shadowMap.needsUpdate=true;shared.restore()
}
