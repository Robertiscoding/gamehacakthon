import * as T from 'three';
import {hexExtent} from './terrain.js';
import {placeAsset, assetReady} from './assets.js';

import {adventurer} from './garden.js';
const el = id => document.getElementById(id);
window.startArena = async function(terrain, defending, settle, island, tileId, visit=false, onEncounter) {

  const data=await island.environment(tileId);
  const shared=island.takeCamera(tileId);
  const scene=shared.scene, camera = new T.PerspectiveCamera(72, 1, .05, 160);
  const arena = el('arena'), brief = el('brief'), field = el('field');
  const events = new AbortController(), listen = (target, name, handler) => target.addEventListener(name, handler, {signal:events.signal});
  let renderer,frame,playing=false,done=false,age=0,yaw=0,pitch=0;
  const keys=new Set(),obstacles=[];
  arena.hidden = false;
  arena.classList.toggle('visit',visit);arena.setAttribute('aria-label',visit?'Explore island':'Third-person skirmish');brief.querySelector('small').textContent=visit?'ISLAND EXPLORATION':'THIRD-PERSON SKIRMISH';el('yieldRaid').textContent=visit?'Return to board':'Concede duel';
  const bearing=document.createElement('div');bearing.className='scoutBearing';arena.append(bearing);
  const interact=document.createElement('button');interact.className='interact';arena.append(interact);interact.hidden=true;
  const transient=new T.Group();scene.add(transient);
  for(const area of document.querySelectorAll('body > header,body > main'))area.inert=true;
  brief.hidden = false;
  el('biome').textContent = terrain.toUpperCase()+' TERRITORY';
  el('battleName').textContent = defending ? 'Defend your settlement' : 'Settlement raid';
  el('briefTitle').textContent = defending ? 'Hold the settlement.' : 'Raid the settlement.';
  
  
  el('engage').disabled=true;
  function finish(won){if(done)return;done=true;playing=false;events.abort();cancelAnimationFrame(frame);if(document.pointerLockElement===field.firstChild)document.exitPointerLock?.();arena.hidden=true;for(const area of document.querySelectorAll('body > header,body > main'))area.inert=false;bearing.remove();interact.remove();scene.remove(transient,camera);shared.restore();if(hiddenShell)hiddenShell.visible=true;el('cross').textContent='+';el('hit').style.opacity=0;settle(won)}
  el('yieldRaid').onclick=()=>finish(null);
  function paused(){if(!playing)return;playing=false;keys.clear();brief.hidden=false;el('briefTitle').textContent='Exploration paused';el('engage').textContent='Keep exploring';if(document.pointerLockElement)document.exitPointerLock?.()}
  el('pauseRaid').onclick=paused;
  renderer=shared.renderer;
  const canvas=shared.canvas;field.append(canvas);renderer.autoClear=true;
  scene.background=new T.Color(0x9ed9e5);scene.fog=new T.FogExp2(0xc6e5dc,.008);
  if(visit){el('battleName').textContent='Explore the island';el('briefTitle').textContent='Roam the island';el('stakes').textContent='Follow the roads to a settlement or approach the rival scout to fight. You can cross every inland tile border.';el('controls').textContent='WASD to walk · Shift to run · Mouse or arrows to turn · E at a settlement · Esc to pause'}
  const loading = [];
  function add(slug, at, size, yaw=0, parent=transient) {
    const instance = placeAsset(parent, slug, at, size, yaw);
    loading.push(assetReady(instance));
    return instance;
  }
  const scale=16;
  // Raycast the live board surface in its current world transform.
  const sectors=data.centers.map((c,i)=>({id:i,x:(c.x-data.center.x)*scale,z:(c.z-data.center.z)*scale,env:data.environments[i],type:data.tiles[i].t}));
  function sector(x,z){return sectors.find(s=>hexExtent((x-s.x)/scale,(z-s.z)/scale)<=1.001)}
  const groundRay=new T.Raycaster(),down=new T.Vector3(0,-1,0),sample=new T.Vector3(),heightCache=new Map();
  const floors=sectors.map(s=>s.env.base);
  const paths=data.roads.map(r=>({a:new T.Vector2((r.a.x-data.center.x)*scale,(r.a.z-data.center.z)*scale),b:new T.Vector2((r.b.x-data.center.x)*scale,(r.b.z-data.center.z)*scale)}));
  function roadHeight(x,z){for(const {a,b} of paths){const dx=b.x-a.x,dz=b.y-a.y,t=((x-a.x)*dx+(z-a.y)*dz)/(dx*dx+dz*dz);if(t<.02||t>.98)continue;const d=Math.hypot(x-a.x-t*dx,z-a.y-t*dz);if(d<2)return .88*Math.min(1,(2-d)/.4,(t-.02)*14,(.98-t)*14)}return 0}
  function ground(x,z){const key=Math.round(x*4)+','+Math.round(z*4);if(heightCache.has(key))return heightCache.get(key);const s=sector(x,z);if(!s)return -.5;groundRay.set(sample.set(x,30,z),down);const h=Math.max(roadHeight(x,z),groundRay.intersectObject(s.env.base,false)[0]?.point.y??0);heightCache.set(key,h);return h}
  const buildings=data.verts.filter(v=>data.owns[v.id]).map(v=>({x:(v.x-data.center.x)*scale,z:(v.z-data.center.z)*scale,id:v.id,owner:data.owns[v.id][0],city:data.owns[v.id][1]===2}));
  for(const s of sectors)for(const p of s.env.props){if(/fern|wheat|scree|dune/.test(p.slug))continue;const x=s.x+p.x*scale,z=s.z+p.z*scale;obstacles.push({x,z,w:p.size[0]*scale*.29,d:p.size[2]*scale*.29,base:ground(x,z),h:p.size[1]*scale})}
  const actor=new T.Group();transient.add(actor);const character=adventurer(actor,0);character.scale.setScalar(.70);
  buildings.forEach(b=>obstacles.push({x:b.x,z:b.z,w:3.0,d:2.9,h:b.city?14:10,base:.1}));
  // A furnished interior sits inside each live building footprint. Hide the outer
  // shell from the interior camera only, restoring it when the player steps out.
  let room=null,outside=null,outsideYaw=0,nearby=null,hiddenShell=null;
  const interiors=new Map();
  function enterHouse(b){
    room=b;outside=actor.position.clone();outsideYaw=yaw;let inside=interiors.get(b.id);
    if(!inside){inside=new T.Group();inside.position.set(b.x,.20,b.z);transient.add(inside);interiors.set(b.id,inside);
      const wall=(x,z,w,h,d)=>placeAsset(inside,'arena-stockade',[x,0,z],[w,h,d]);
      placeAsset(inside,'floor-forest',[0,-.32,0],[6.5,.32,6.1]);
      wall(0,-2.9,6.5,3.3,.3);wall(-3.1,0,.3,3.3,6.0);wall(3.1,0,.3,3.3,6.0);wall(-1.9,2.9,2.7,3.3,.3);wall(2.0,2.9,2.5,3.3,.3);
      placeAsset(inside,'arena-stockade',[0,3.22,0],[6.5,.27,6.1]);
      placeAsset(inside,'pasture-trough',[-1.6,0,-1.5],[1.6,.65,.9]);placeAsset(inside,'res-grain',[-1.5,.30,-1.55],[.55,.45,.45]);placeAsset(inside,'forest-logpile',[1.7,0,-1.7],[1.35,.81,.94]);placeAsset(inside,'fields-haybale',[1.9,0,.9],[1.4,.55,.9]);
    }
    inside.visible=true;hiddenShell=data.shell(b.id);if(hiddenShell)hiddenShell.visible=false;actor.position.set(b.x,.24,b.z+1.55);yaw=0;pitch=0;el('battleName').textContent=b.city?'City hall':'Settler’s cottage';
  }
  function exitHouse(){if(!room)return;interiors.get(room.id).visible=false;if(hiddenShell)hiddenShell.visible=true;actor.position.copy(outside);yaw=outsideYaw;room=null;el('battleName').textContent='Explore the island'}
  function useDoor(){if(!playing)return;if(room)exitHouse();else if(nearby)enterHouse(nearby)}
  interact.onclick=useDoor;
  const foe=adventurer(transient,1);foe.scale.setScalar(.76);
  scene.add(camera);camera.rotation.order='YXZ';actor.position.set(0,0,11);
  const ray=new T.Raycaster(),vec=new T.Vector3();
  const solidBoxes=obstacles.map(o=>new T.Box3(new T.Vector3(o.x-o.w,o.base,o.z-o.d),new T.Vector3(o.x+o.w,o.base+o.h,o.z+o.d)));
  function canStand(x,z){if(room)return Math.abs(x-room.x)<2.72&&Math.abs(z-room.z)<2.48;return !!sector(x,z)&&!obstacles.some(o=>Math.abs(x-o.x)<o.w+.36&&Math.abs(z-o.z)<o.d+.36)}
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}
  listen(window,'resize',resize);resize();
  function aim(dx,dy){yaw-=dx*.0026;pitch=T.MathUtils.clamp(pitch-dy*.0026,-1.15,1.15)}
  let pointer=null,px=0,py=0,locked=false;
  listen(canvas,'pointerdown',e=>{if(!playing)return;pointer=e.pointerId;px=e.clientX;py=e.clientY;canvas.setPointerCapture?.(pointer);});
  listen(document,'pointermove',e=>{if(!playing)return;if(document.pointerLockElement===canvas)aim(e.movementX,e.movementY);else if(pointer===e.pointerId){aim(e.clientX-px,e.clientY-py);px=e.clientX;py=e.clientY}});
  listen(document,'pointerup',()=>{pointer=null});
  listen(document,'pointerlockchange',()=>{if(document.pointerLockElement===canvas)locked=true;else if(locked){locked=false;paused()}});
  listen(window,'blur',paused);listen(document,'visibilitychange',()=>{if(document.hidden)paused()});
  listen(window,'keydown',e=>{if(!playing)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Escape')paused();if(e.code==='KeyE'&&!e.repeat)useDoor();});listen(window,'keyup',e=>keys.delete(e.code));
  for(const btn of el('touchPad').querySelectorAll('button')){listen(btn,'pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);if(btn.dataset.key)keys.add(btn.dataset.key);});for(const name of ['pointerup','pointercancel'])listen(btn,name,()=>{keys.delete(btn.dataset.key);})}
  el('engage').textContent='Preparing tile…';
  Promise.all(loading).then(()=>{
    if(done)return;
    el('engage').textContent=visit?'Explore island':'Start skirmish';
    el('engage').disabled=false;
  }).catch(()=>{
    if(done)return;
    el('engage').textContent='Arena unavailable';
    el('stakes').textContent='The arena assets could not load. Reload the page to retry this raid, or concede to return to the board.';
  });
  el('engage').onclick=()=>{brief.hidden=true;playing=true;if(!matchMedia('(pointer:coarse)').matches){try{canvas.requestPointerLock?.()?.catch?.(()=>{})}catch{}}};
  let last=performance.now();
  const aimPoint=new T.Vector3(),cameraGoal=new T.Vector3(),facing=new T.Vector3();
  function followCamera(){
    const distance=room?2.5:6.4, eye=room?1.32:1.48;
    facing.set(-Math.sin(yaw),0,-Math.cos(yaw));
    aimPoint.copy(actor.position);aimPoint.y+=eye;
    cameraGoal.copy(aimPoint).addScaledVector(facing,-distance);cameraGoal.y+=room?1.1:2.05;
    if(room){cameraGoal.x=T.MathUtils.clamp(cameraGoal.x,room.x-2.7,room.x+2.7);cameraGoal.z=T.MathUtils.clamp(cameraGoal.z,room.z-2.7,room.z+2.7);cameraGoal.y=Math.min(3,cameraGoal.y)}
    else{cameraGoal.x+=Math.cos(yaw)*.88;cameraGoal.z-=Math.sin(yaw)*.88;cameraGoal.y=Math.max(cameraGoal.y,ground(cameraGoal.x,cameraGoal.z)+1)}
    if(!room){
      const sight=cameraGoal.clone().sub(aimPoint),length=sight.length();ray.ray.set(aimPoint,sight.normalize());
      let safe=length;for(const bounds of solidBoxes){if(bounds.containsPoint(aimPoint))continue;const hit=ray.ray.intersectBox(bounds,vec);if(hit)safe=Math.min(safe,Math.max(1.65,aimPoint.distanceTo(hit)-.32))}
      cameraGoal.copy(aimPoint).addScaledVector(sight,safe);cameraGoal.y=Math.max(cameraGoal.y,ground(cameraGoal.x,cameraGoal.z)+1);
    }
    camera.position.copy(cameraGoal);aimPoint.addScaledVector(facing,room?1:8);aimPoint.y+=Math.tan(pitch)*(room?2:12);camera.lookAt(aimPoint);camera.updateMatrixWorld()
  }
  function startEncounter(){if(onEncounter?.(sector(actor.position.x,actor.position.z)?.id??tileId))finish(null)}

  function tick(now){if(done)return;frame=requestAnimationFrame(tick);const dt=Math.min(.045,(now-last)/1000);last=now;
    if(playing){age+=dt;
      yaw+=(Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight')))*dt*1.65;pitch=T.MathUtils.clamp(pitch+(Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')))*dt*1.4,-1.15,1.15);
      const side=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),back=Number(keys.has('KeyS'))-Number(keys.has('KeyW')),speed=dt*(keys.has('ShiftLeft')||keys.has('ShiftRight')?12:8)/Math.max(1,Math.hypot(side,back));
      let x=actor.position.x+(side*Math.cos(yaw)+back*Math.sin(yaw))*speed,z=actor.position.z+(back*Math.cos(yaw)-side*Math.sin(yaw))*speed;
      if(canStand(x,actor.position.z))actor.position.x=x;if(canStand(actor.position.x,z))actor.position.z=z;
      actor.position.y=room?.25:ground(actor.position.x,actor.position.z);actor.rotation.y=yaw+Math.PI;
      character.position.y=(side||back)?Math.abs(Math.sin(age*11))*.085:0;character.rotation.z=(side||back)?Math.sin(age*11)*.035:0;
      followCamera();
      nearby=buildings.find(b=>Math.hypot(actor.position.x-b.x,actor.position.z-b.z)<7.3);
      interact.hidden=!room&&!nearby;interact.textContent=room?'E · Leave settlement':'E · Enter settlement';
      const current=sector(actor.position.x,actor.position.z);if(current)el('biome').textContent=current.type.toUpperCase()+' · TILE '+(current.id+1);
      if(!room&&actor.position.distanceTo(foe.position)<16)startEncounter();if(done)return;
      const relative=Math.atan2(foe.position.x-actor.position.x,foe.position.z-actor.position.z)-yaw-Math.PI;
      const direction=Math.atan2(Math.sin(relative),Math.cos(relative));bearing.hidden=!!room;
      bearing.textContent=(Math.abs(direction)<.4?'Ahead':Math.abs(direction)>2.65?'Behind':direction<0?'Right':'Left')+' · Rival '+Math.round(actor.position.distanceTo(foe.position))+' m';
    }
    renderer.render(scene,camera)}

  if(visit){const home=buildings.find(b=>b.owner===0),target=buildings.filter(b=>b.owner===1).sort((a,b)=>Math.hypot(a.x-home.x,a.z-home.z)-Math.hypot(b.x-home.x,b.z-home.z))[0];
    const approach=b=>{const v=new T.Vector2(-b.x,-b.z).normalize();for(let j=0;j<16;j++){const ang=j*Math.PI/8,xx=b.x+6.4*(v.x*Math.cos(ang)-v.y*Math.sin(ang)),zz=b.z+6.4*(v.x*Math.sin(ang)+v.y*Math.cos(ang));if(canStand(xx,zz))return new T.Vector3(xx,ground(xx,zz),zz)}return new T.Vector3(0,0,0)};
    actor.position.copy(approach(home));foe.position.copy(approach(target));yaw=Math.atan2(actor.position.x-foe.position.x,actor.position.z-foe.position.z)
  }
  actor.position.y=ground(actor.position.x,actor.position.z);foe.position.y=ground(foe.position.x,foe.position.z);actor.rotation.y=yaw+Math.PI;followCamera();tick(last);
};
