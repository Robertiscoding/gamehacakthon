import {verts} from './dist/map.mjs';
import {battleMusic,playCue,soundButton} from './score.js';
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
 const sound=soundButton();arena.append(sound);battleMusic(true);let pickups=0,warps=0;
 const local=read().seat,initial=read().harvest;tips.textContent=initial.eligible[local]?'WASD move · Space slash · F throw · Shift dash · E mine tunnel':'Watching the other player collect';
 const actors=initial.eligible.map((eligible,p)=>{if(!eligible)return null;const obj=adventurer(root,p);obj.scale.setScalar(2.35);const tag=document.createElement('canvas');tag.width=256;tag.height=72;const ctx=tag.getContext('2d');ctx.fillStyle=p?'#943553':'#175280';ctx.fillRect(0,0,256,72);ctx.fillStyle='white';ctx.font='bold 43px system-ui';ctx.textAlign='center';ctx.fillText(p===local?'YOU':p?'CORAL':'BLUE',128,52);const badge=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(tag),depthTest:false}));badge.position.y=3.9;badge.scale.set(3.8,1.08,1);badge.renderOrder=8;obj.add(badge);const sword=bladeKit(obj,p?0xff889f:0x63dbf1);sword.position.set(.85,1.4,.45);return {obj,sword}});
 const drops=initial.drops.map(d=>{const q=new T.Group();q.position.set(d.x,.1+altitude(d.x,d.z),d.z);root.add(q);const ring=new T.Mesh(new T.RingGeometry(1.9,2.4,24),new T.MeshBasicMaterial({color:0xffe882,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;q.add(ring);const m=placeAsset(q,'res-'+['lumber','brick','wool','grain','ore'][d.res],[0,.6,0],[3,2.8,2.6]);return {q,m,ring}});
 const keys=new Set(),ev=new AbortController(),opts={signal:ev.signal},blades=[];let skill='',sending=false,frame;const touch=document.createElement('div');touch.className='bladeTouch';touch.innerHTML='<div>'+['W','A','S','D'].map((v,i)=>'<button data-key="Key'+v+'">'+['↑','←','↓','→'][i]+'</button>').join('')+'</div><div>'+['slash','throw','dash','mine'].map(v=>'<button data-skill="'+v+'">'+v+'</button>').join('')+'</div>';arena.append(touch);
 for(const b of touch.querySelectorAll('button')){b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);if(b.dataset.key)keys.add(b.dataset.key);else skill=b.dataset.skill};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key)}
 window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(!e.repeat)skill=({Space:'slash',KeyF:'throw',KeyE:'mine',ShiftLeft:'dash',ShiftRight:'dash'})[e.code]||skill},opts);window.addEventListener('keyup',e=>keys.delete(e.code),opts);window.addEventListener('blur',()=>keys.clear(),opts);
 canvas.addEventListener('pointerdown',e=>{skill=e.button===2?'throw':'slash'},opts);canvas.addEventListener('contextmenu',e=>e.preventDefault(),opts);
 let lastInputTime=0,lastX,lastZ;
 const timer=setInterval(async()=>{const round=read()?.harvest;if(!round||round.countdown>0||round.outro>0){skill='';return}if(!initial.eligible[local]||sending)return;const x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),z=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));const now=performance.now();if(!skill&&x===lastX&&z===lastZ&&(!(x||z)||now-lastInputTime<170))return;sending=true;lastX=x;lastZ=z;lastInputTime=now;const k=skill;skill='';if(k==='slash'||k==='throw')playCue('blade');try{await input({round:initial.id,x,z,skill:k})}catch{lastX=undefined}finally{sending=false}},32);
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
 let previousHarvest,arrival=0;
 await new Promise(resolve=>{function tick(now){const s=read(),h=s?.harvest;if(!h){resolve();return}
 const selecting=h.spawns?.includes(null),choosing=selecting&&h.spawns[local]===null;
 picker.hidden=!choosing;
 if(choosing){camera.updateMatrixWorld();for(const {button,point} of buttons){projected.copy(point).project(camera);button.style.left=(50+projected.x*50)+'%';button.style.top=(50-projected.y*50)+'%'}}
 const message=selecting?(choosing?'Choose your settlement':'Waiting for opponent'):h.outro>0?'Resource collection over':h.countdown>0?String(Math.ceil(h.countdown)):h.left>44.25?'START':'';
 banner.classList.toggle('selecting',!!selecting);if(banner.textContent!==message)setText(banner,message);
 frame=requestAnimationFrame(tick);
 if(h!==previousHarvest){
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
 h.drops.forEach((d,i)=>{const {q,m}=drops[i];q.visible=d.owner==null;if(q.visible){m.rotation.y=now*.002;m.position.y=.85+.28*Math.sin(now*.004+i)}});
 h.blades.forEach((b,i)=>{if(!blades[i]){blades[i]=returningBlade();root.add(blades[i])}blades[i].position.set(b.x,1.7+(b.height||0),b.z);blades[i].rotation.y=now*.022});blades.forEach((b,i)=>b.visible=i<h.blades.length);
 const me=h.actors[local],count=h.drops.filter(d=>d.owner===local).length;if(count>pickups)playCue('pickup');pickups=count;if((me?.warps||0)>warps)playCue('mine');warps=me?.warps||0;if(me)setText(tips,mineAt(me.x,me.z)?'Hidden in mine · E to travel':hiddenAt(me.x,me.z)?'Concealed in wheat':'WASD move · Space slash · F throw · Shift dash · E mine tunnel');
 setText(hud,h.eligible.some((yes,i)=>yes&&!s.online[i])?'Waiting for reconnection':Math.ceil(h.left)+'s · '+h.drops.filter(d=>d.owner!=null).length+'/'+h.drops.length+' collected');renderer.render(scene,camera)}tick(performance.now())});
 battleMusic(false);picker.remove();for(const actor of actors)actor?.obj.traverse(o=>{if(o.isSprite){o.material.map.dispose();o.material.dispose()}});banner.remove();sound.remove();cancelAnimationFrame(frame);clearInterval(timer);ev.abort();scene.remove(root);root.traverse(o=>{if(o.geometry?.type==='ExtrudeGeometry'){o.geometry.dispose();o.material.dispose()}});for(const d of drops){d.ring.geometry.dispose();d.ring.material.dispose()}hud.remove();tips.remove();touch.remove();arena.hidden=true;arena.className='';document.getElementById('pauseRaid').hidden=false;document.querySelector('main').inert=false;renderer.setPixelRatio(previousRatio);renderer.shadowMap.autoUpdate=shadowUpdates;renderer.shadowMap.needsUpdate=true;shared.restore()
}
