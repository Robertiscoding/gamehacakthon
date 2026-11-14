import * as T from 'three';
import {hexExtent} from './terrain.js';
import {placeAsset, assetReady} from './assets.js';

const kits = {
  forest: ['Pinewood crossbow', 4, 35, .48, 1],
  fields: ['Scatter sling', 3, 14, .7, 5],
  pasture: ['Shepherd’s repeater', 10, 17, .16, 1],
  mountains: ['Quarry arbalest', 2, 55, .85, 1],
  hills: ['Clay scattergun', 4, 12, .52, 5],
  desert: ['Dune carbine', 6, 26, .32, 1]
};
const el = id => document.getElementById(id);
window.startArena = async function(terrain, defending, settle, island, tileId, visit=false) {
  const [weapon, capacity, power, delay, pellets] = kits[terrain];
  const data=await island.environment(tileId);
  const shared=island.takeCamera(tileId);
  const scene=shared.scene, camera = new T.PerspectiveCamera(72, 1, .05, 160);
  const arena = el('arena'), brief = el('brief'), field = el('field');
  const events = new AbortController(), listen = (target, name, handler) => target.addEventListener(name, handler, {signal:events.signal});
  let renderer, frame, playing = false, done = false, held = false, shots = capacity, health = 100, rival = 100;
  let reload = 0, cooldown = 0, age = 0, attack = 1.8, yaw = 0, pitch = 0, flash = 0, recoil = 0, hitMark = 0;
  const keys = new Set(), obstacles = [], bullets = [], traces = [];
  arena.hidden = false;
  arena.classList.toggle('visit',visit);arena.setAttribute('aria-label',visit?'Explore tile':'First person duel');brief.querySelector('small').textContent=visit?'ISLAND EXPLORATION':'FIRST-PERSON DUEL';el('yieldRaid').textContent=visit?'Return to board':'Concede duel';
  const interact=document.createElement('button');interact.className='interact';arena.append(interact);interact.hidden=true;
  const transient=new T.Group();scene.add(transient);
  for(const area of document.querySelectorAll('body > header,body > main'))area.inert=true;
  brief.hidden = false;
  el('biome').textContent = terrain.toUpperCase()+' TERRITORY';
  el('battleName').textContent = defending ? 'Defend your settlement' : 'Settlement raid';
  el('briefTitle').textContent = defending ? 'Hold the settlement.' : 'Raid the settlement.';
  el('stakes').textContent = 'Win a resource card. Every third duel win earns a victory point. Your '+weapon.toLowerCase()+' is ready.';
  el('weaponName').textContent = weapon.toUpperCase();
  el('controls').textContent = matchMedia('(pointer:coarse)').matches ? 'Drag to aim. Use the arrows to move and Fire to shoot. Your weapon reloads automatically.' : 'WASD to move · Mouse or arrows to aim · Click or Space to fire · R to reload · Esc to pause';
  el('engage').disabled=true;
  function hud(){el('hp').textContent=Math.max(0,Math.ceil(health))+' / 100';el('enemyHp').textContent=Math.max(0,Math.ceil(rival))+' / 100';el('ammo').textContent=reload?'Reloading…':shots+' / '+capacity}
  function finish(won){if(done)return;done=true;playing=false;events.abort();cancelAnimationFrame(frame);if(document.pointerLockElement===field.firstChild)document.exitPointerLock?.();arena.hidden=true;for(const area of document.querySelectorAll('body > header,body > main'))area.inert=false;interact.remove();scene.remove(transient,camera);shared.restore();if(hiddenShell)hiddenShell.visible=true;el('cross').textContent='+';el('hit').style.opacity=0;settle(won)}
  el('yieldRaid').onclick=()=>finish(false);
  function paused(){if(!playing)return;playing=false;held=false;keys.clear();brief.hidden=false;el('briefTitle').textContent=visit?'Exploration paused':'Duel paused';el('engage').textContent=visit?'Keep exploring':'Resume duel';if(document.pointerLockElement)document.exitPointerLock?.()}
  el('pauseRaid').onclick=paused;
  renderer=shared.renderer;
  const canvas=shared.canvas;field.append(canvas);renderer.autoClear=true;
  scene.background=new T.Color(0x9ed9e5);scene.fog=new T.FogExp2(0xc6e5dc,.008);
  if(visit){el('battleName').textContent='Explore the island';el('briefTitle').textContent=terrain[0].toUpperCase()+terrain.slice(1)+' trail';el('stakes').textContent='Walk this tile and follow a road to a settlement. Approach the building to enter.';el('controls').textContent='WASD to walk · Mouse or arrows to look · E to enter or leave a settlement · Esc for the board menu'}
  const loading = [];
  function add(slug, at, size, yaw=0, parent=transient) {
    const instance = placeAsset(parent, slug, at, size, yaw);
    loading.push(assetReady(instance));
    return instance;
  }
  const scale=16;
  // Raycast the live board surface in its current world transform.
  const groundRay=new T.Raycaster(),down=new T.Vector3(0,-1,0),sample=new T.Vector3(),heightCache=new Map();
  function ground(x,z){const key=Math.round(x*5)+','+Math.round(z*5);if(heightCache.has(key))return heightCache.get(key);groundRay.set(sample.set(x,30,z),down);const h=groundRay.intersectObject(data.env.base,true)[0]?.point.y??.12;heightCache.set(key,h);return h}
  const buildings=data.verts.filter(v=>data.owns[v.id]).map(v=>({x:(v.x-data.center.x)*scale,z:(v.z-data.center.z)*scale,id:v.id,owner:data.owns[v.id][0],city:data.owns[v.id][1]===2}));
  data.env.props.forEach(p=>{if(/fern|wheat|scree|dune/.test(p.slug))return;const x=p.x*scale,z=p.z*scale;obstacles.push({x,z,w:p.size[0]*scale*.29,d:p.size[2]*scale*.29,base:ground(x,z),h:p.size[1]*scale})});
  buildings.forEach(b=>obstacles.push({x:b.x,z:b.z,w:3.0,d:2.9,h:b.city?14:10,base:.1}));
  // A furnished interior sits inside each live building footprint. Hide the outer
  // shell from the interior camera only, restoring it when the player steps out.
  let room=null,outside=null,nearby=null,hiddenShell=null;
  const interiors=new Map();
  function enterHouse(b){
    room=b;outside=camera.position.clone();let inside=interiors.get(b.id);
    if(!inside){inside=new T.Group();inside.position.set(b.x,.20,b.z);transient.add(inside);interiors.set(b.id,inside);
      const wall=(x,z,w,h,d)=>placeAsset(inside,'arena-stockade',[x,0,z],[w,h,d]);
      placeAsset(inside,'floor-forest',[0,-.32,0],[6.5,.32,6.1]);
      wall(0,-2.9,6.5,3.3,.3);wall(-3.1,0,.3,3.3,6.0);wall(3.1,0,.3,3.3,6.0);wall(-1.9,2.9,2.7,3.3,.3);wall(2.0,2.9,2.5,3.3,.3);
      placeAsset(inside,'arena-stockade',[0,3.22,0],[6.5,.27,6.1]);
      placeAsset(inside,'pasture-trough',[-1.6,0,-1.5],[1.6,.65,.9]);placeAsset(inside,'res-grain',[-1.5,.30,-1.55],[.55,.45,.45]);placeAsset(inside,'forest-logpile',[1.7,0,-1.7],[1.35,.81,.94]);placeAsset(inside,'fields-haybale',[1.9,0,.9],[1.4,.55,.9]);
    }
    inside.visible=true;hiddenShell=data.shell(b.id);if(hiddenShell)hiddenShell.visible=false;camera.position.set(b.x,1.85,b.z+1.65);yaw=0;pitch=0;el('battleName').textContent=b.city?'City hall':'Settler’s cottage';
  }
  function exitHouse(){if(!room)return;interiors.get(room.id).visible=false;if(hiddenShell)hiddenShell.visible=true;camera.position.copy(outside);room=null;el('battleName').textContent=visit?'Explore the island':'Settlement raid'}
  function useDoor(){if(!playing)return;if(room)exitHouse();else if(nearby)enterHouse(nearby)}
  interact.onclick=useDoor;
  const foe=visit?new T.Group():add('rival-'+terrain,[0,0,-8],[1.15,2.4,.84]);
  const gun=new T.Group();
  camera.add(gun);
  scene.add(camera);
  gun.position.set(.31,-.31,-.58);
  // Meshy's weapon meshes lie along X with the muzzle at their negative end.
  if(!visit)add('gun-'+terrain,[0,-.14,-.12],[.86,.25,.20],-Math.PI/2,gun);
  if(!visit)add('gun-'+terrain,[.34,1.02,.35],[.93,.27,.21],Math.PI/2,foe);

  // Keep shared projectile geometry and materials alive across rapid fire.
  const effects=new T.Group();
  const bolt=new T.Group();
  add('fx-projectile',[0,-.06,0],[.62,.12,.12],Math.PI/2,bolt);
  const spark=add('fx-impact',[0,0,0],[.34,.34,.34],0,effects);
  function effect(template, at){
    const object=template.clone(true);
    object.position.copy(at);
    transient.add(object);
    return object;
  }
  camera.rotation.order='YXZ';camera.position.set(0,1.65,11);
  const ray=new T.Raycaster(),forward=new T.Vector3(),vec=new T.Vector3();
  const solidBoxes=obstacles.map(o=>new T.Box3(new T.Vector3(o.x-o.w,o.base,o.z-o.d),new T.Vector3(o.x+o.w,o.base+o.h,o.z+o.d)));
  function wallDistance(pos,dir){ray.ray.set(pos,dir);let nearest=Infinity;for(const b of solidBoxes){const hit=ray.ray.intersectBox(b,vec);if(hit)nearest=Math.min(nearest,pos.distanceTo(hit))}const earth=ray.intersectObject(data.env.base,true)[0];return Math.min(nearest,earth?.distance??Infinity)}
  function canStand(x,z){if(room)return Math.abs(x-room.x)<2.72&&Math.abs(z-room.z)<2.48;return hexExtent(x/scale,z/scale)<.991&&!obstacles.some(o=>Math.abs(x-o.x)<o.w+.36&&Math.abs(z-o.z)<o.d+.36)}
  function startReload(){if(!reload&&shots<capacity){reload=1.25;hud()}}
  function fire(){if(visit||room||!playing||reload||cooldown)return;if(!shots){startReload();return}shots--;cooldown=delay;recoil=.13;camera.updateMatrixWorld();foe.updateMatrixWorld();let damage=0;
    for(let i=0;i<pellets;i++){camera.getWorldDirection(forward);if(pellets>1){forward.x+=(Math.random()-.5)*.078;forward.y+=(Math.random()-.5)*.066;forward.normalize()}const wall=wallDistance(camera.position,forward);ray.set(camera.position,forward);const hit=ray.intersectObject(foe,true)[0];let distance=Math.min(wall,35);if(hit&&hit.distance<wall){damage+=power;distance=hit.distance}
      const end=camera.position.clone().addScaledVector(forward,distance);
      const start=gun.localToWorld(new T.Vector3(0,.07,-.45));
      const tracer=effect(bolt,start);
      tracer.lookAt(end);
      traces.push({m:tracer,start,end,time:.11});
      if((hit&&hit.distance<wall)||wall<=35){const impact=effect(spark,end);traces.push({m:impact,time:.12})}}

    rival-=damage;if(damage){hitMark=.18;el('cross').textContent='×'}if(rival<=0){finish(true);return}if(!shots)startReload();hud()}
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}
  listen(window,'resize',resize);resize();
  function aim(dx,dy){yaw-=dx*.0026;pitch=T.MathUtils.clamp(pitch-dy*.0026,-1.15,1.15)}
  let pointer=null,px=0,py=0,locked=false;
  listen(canvas,'pointerdown',e=>{if(!playing)return;pointer=e.pointerId;px=e.clientX;py=e.clientY;canvas.setPointerCapture?.(pointer);if(e.pointerType!=='touch'){held=true;fire()}});
  listen(document,'pointermove',e=>{if(!playing)return;if(document.pointerLockElement===canvas)aim(e.movementX,e.movementY);else if(pointer===e.pointerId){aim(e.clientX-px,e.clientY-py);px=e.clientX;py=e.clientY}});
  listen(document,'pointerup',()=>{held=false;pointer=null});
  listen(document,'pointerlockchange',()=>{if(document.pointerLockElement===canvas)locked=true;else if(locked){locked=false;paused()}});
  listen(window,'blur',paused);listen(document,'visibilitychange',()=>{if(document.hidden)paused()});
  listen(window,'keydown',e=>{if(!playing)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)fire();if(e.code==='Escape')paused();if(e.code==='KeyE'&&!e.repeat)useDoor();if(e.code==='KeyR')startReload()});listen(window,'keyup',e=>keys.delete(e.code));
  for(const btn of el('touchPad').querySelectorAll('button')){listen(btn,'pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);if(btn.dataset.key)keys.add(btn.dataset.key);else held=true});for(const name of ['pointerup','pointercancel'])listen(btn,name,()=>{keys.delete(btn.dataset.key);if(!btn.dataset.key)held=false})}
  el('engage').textContent='Preparing tile…';
  Promise.all(loading).then(()=>{
    if(done)return;
    el('engage').textContent=visit?'Walk onto tile':'Enter duel';
    el('engage').disabled=false;
  }).catch(()=>{
    if(done)return;
    el('engage').textContent='Arena unavailable';
    el('stakes').textContent='The arena assets could not load. Reload the page to retry this raid, or concede to return to the board.';
  });
  el('engage').onclick=()=>{brief.hidden=true;playing=true;if(!matchMedia('(pointer:coarse)').matches){try{canvas.requestPointerLock?.()?.catch?.(()=>{})}catch{}}};
  let flight=1,landing;
  let last=performance.now();
  function tick(now){if(done)return;frame=requestAnimationFrame(tick);const dt=Math.min(.045,(now-last)/1000);last=now;
    if(playing){age+=dt;cooldown=Math.max(0,cooldown-dt);recoil=Math.max(0,recoil-dt*.8);hitMark=Math.max(0,hitMark-dt);if(!hitMark)el('cross').textContent='+';flash=Math.max(0,flash-dt*2);el('hit').style.opacity=flash;
      if(reload){reload=Math.max(0,reload-dt);if(!reload){shots=capacity;hud()}}
      yaw+=(Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight')))*dt*1.65;pitch=T.MathUtils.clamp(pitch+(Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')))*dt*1.4,-1.15,1.15);camera.rotation.set(pitch,yaw,0);
      let side=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),back=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));let speed=dt*6.3/Math.max(1,Math.hypot(side,back));let x=camera.position.x+(side*Math.cos(yaw)+back*Math.sin(yaw))*speed,z=camera.position.z+(back*Math.cos(yaw)-side*Math.sin(yaw))*speed;if(canStand(x,camera.position.z))camera.position.x=x;if(canStand(camera.position.x,z))camera.position.z=z;
      camera.position.y=room?1.85:ground(camera.position.x,camera.position.z)+1.65;
      nearby=buildings.find(b=>Math.hypot(camera.position.x-b.x,camera.position.z-b.z)<7.3);interact.hidden=!room&&!nearby;interact.textContent=room?'E · Leave settlement':'E · Enter settlement';gun.position.y=-.31+(side||back?Math.sin(age*11)*.012:0)-(reload?.12:0);gun.position.z=-.58+recoil;
      if(held||keys.has('Space'))fire();if(done)return;
      let fx=Math.sin(age*.55)*6,fz=-7+Math.sin(age*.32)*2.5;if(!visit&&!room&&canStand(fx,fz))foe.position.set(fx,ground(fx,fz),fz);foe.rotation.y=Math.atan2(camera.position.x-foe.position.x,camera.position.z-foe.position.z);
      attack-=dt;if(!visit&&!room&&attack<=0){attack=1.35+Math.random()*.4;const origin=foe.position.clone().add(new T.Vector3(0,1.4,0)),dir=camera.position.clone().sub(origin);const length=dir.length();dir.normalize();if(wallDistance(origin,dir)>length){const m=effect(bolt,origin);m.lookAt(camera.position);bullets.push({m,dir,life:3})}}
      for(let i=bullets.length-1;i>=0;i--){let b=bullets[i],step=dt*11.5;b.life-=dt;const blocked=wallDistance(b.m.position,b.dir)<=step;b.m.position.addScaledVector(b.dir,step);const hit=!blocked&&b.m.position.distanceTo(camera.position)<.55;if(hit){health-=14;flash=.85;hud()}if(hit||blocked||b.life<=0){remove(b.m);bullets.splice(i,1)}if(health<=0){finish(false);return}}
      for(let i=traces.length-1;i>=0;i--){const trace=traces[i];trace.time-=dt;if(trace.start){trace.m.position.lerpVectors(trace.start,trace.end,Math.min(1,1-trace.time/.11))}if(trace.time<=0){remove(trace.m);traces.splice(i,1)}}}
    if(flight>0&&!playing){landing??=camera.position.clone();flight=Math.max(0,flight-dt*1.4);camera.position.copy(landing).lerp(shared.overview,flight*flight);camera.rotation.x=-flight*.75}
    else if(flight>0&&landing){camera.position.copy(landing);flight=0}
    renderer.render(scene,camera)}
  function remove(m){transient.remove(m)}
  if(visit&&buildings.length){const b=buildings[0],dist=Math.hypot(b.x,b.z);camera.position.set(b.x*(1-6/dist),0,b.z*(1-6/dist));yaw=Math.atan2(camera.position.x-b.x,camera.position.z-b.z);camera.rotation.y=yaw}
  camera.position.y=ground(camera.position.x,camera.position.z)+1.65;foe.position.y=ground(0,-8);hud();tick(last);
};
