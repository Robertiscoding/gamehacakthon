import * as T from 'three';
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
window.startArena = function(terrain, defending, settle) {
  const [weapon, capacity, power, delay, pellets] = kits[terrain];
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(72, 1, .05, 160);
  const arena = el('arena'), brief = el('brief'), field = el('field');
  const events = new AbortController(), listen = (target, name, handler) => target.addEventListener(name, handler, {signal:events.signal});
  let renderer, frame, playing = false, done = false, held = false, shots = capacity, health = 100, rival = 100;
  let reload = 0, cooldown = 0, age = 0, attack = 1.8, yaw = 0, pitch = 0, flash = 0, recoil = 0, hitMark = 0;
  const keys = new Set(), obstacles = [], bullets = [], traces = [];
  arena.hidden = false;
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
  function finish(won){if(done)return;done=true;playing=false;events.abort();cancelAnimationFrame(frame);if(document.pointerLockElement===field.firstChild)document.exitPointerLock?.();arena.hidden=true;for(const area of document.querySelectorAll('body > header,body > main'))area.inert=false;field.replaceChildren();renderer?.dispose();renderer?.forceContextLoss();el('cross').textContent='+';el('hit').style.opacity=0;settle(won)}
  el('yieldRaid').onclick=()=>finish(false);
  function paused(){if(!playing)return;playing=false;held=false;keys.clear();brief.hidden=false;el('briefTitle').textContent='Duel paused';el('engage').textContent='Resume duel';if(document.pointerLockElement)document.exitPointerLock?.()}
  el('pauseRaid').onclick=paused;
  try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'})}catch{el('stakes').textContent='This browser could not start WebGL 2. Open the game in a WebGL-capable browser to resume this raid, or concede to continue the match.';el('engage').disabled=true;return}
  field.replaceChildren(renderer.domElement);
  const canvas=renderer.domElement;
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  scene.background=new T.Color(0xbad7d0);scene.fog=new T.FogExp2(0xc1d5c5,.012);
  scene.add(new T.HemisphereLight(0xfff6de,0x809175,2.0));
  const sun=new T.DirectionalLight(0xffdf9c,2.5);sun.position.set(-20,30,14);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30});sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.001;scene.add(sun);
  const scenery = {
    forest: ['forest-pine', 'forest-stump', 'forest-logpile', 'forest-fern'],
    fields: ['fields-haybale', 'fields-scarecrow', 'fields-wheat', 'fields-cart'],
    pasture: ['pasture-oak', 'pasture-trough', 'pasture-sheep', 'pasture-fence'],
    mountains: ['mountains-crag', 'mountains-orecart', 'mountains-crystal', 'mountains-scree'],
    hills: ['hills-kiln', 'hills-brickpile', 'hills-claybank', 'hills-wheelbarrow'],
    desert: ['desert-cactus', 'desert-dune', 'desert-arch', 'desert-palm']
  };
  const scenerySizes = {
    forest: [[3,6,3],[1.7,1.5,1.7],[3,1.8,1.8],[1.8,1.2,1.8]],
    fields: [[2.4,1.8,2],[1.8,3.4,1],[2,1.8,2],[3,2.3,2]],
    pasture: [[4.6,6,4.6],[2.5,1.2,1.3],[1.3,1.4,2],[3.4,1.6,.5]],
    mountains: [[4.3,5,3.6],[2,1.8,2.5],[1.5,2.2,1.5],[3,.9,2.4]],
    hills: [[3.4,3.5,3],[2.8,1.5,1.8],[3.3,1.6,2.7],[1.7,1.3,2.5]],
    desert: [[1.8,3.4,1.4],[4,1.5,3.5],[4,4.3,2],[3.5,6,3.5]]
  };
  const loading = [];
  function add(slug, at, size, yaw=0, parent=scene) {
    const instance = placeAsset(parent, slug, at, size, yaw);
    loading.push(assetReady(instance));
    return instance;
  }
  add('floor-'+terrain,[0,-.55,0],[70,.54,70]);
  add('arena-lagoon',[0,-2.3,0],[160,.8,160]);
  for(let i=0;i<13;i++){
    const angle=i*2.399, radius=55+(i%4)*4;
    add('arena-ridge',[Math.cos(angle)*radius,-1.5,Math.sin(angle)*radius],
      [18+i%4*3,7+i%5*2,14],-angle);
  }
  for(let i=0;i<24;i++){
    const index=i%4,angle=i*2.399,radius=21+i%7;
    add(scenery[terrain][index],[Math.cos(angle)*radius,0,Math.sin(angle)*radius],
      scenerySizes[terrain][index],-angle);
  }
  function solid(slug,x,z,w,h,d){
    add(slug,[x,0,z],[w,h,d]);
    obstacles.push({x,z,w:w/2,d:d/2,h});
  }
  solid('arena-watchtower',-9,-3,4.8,5.6,4.15);
  solid('arena-watchtower',10,-10,5.5,5.6,4.8);
  solid('arena-watchtower',0,-20,6.2,6.5,5.3);
  const cover={forest:'barricade',fields:'haywall',pasture:'barricade',mountains:'orewall',hills:'claywall',desert:'sandwall'};
  for(const [x,z,w,h,d] of [[-4,3,3.6,1.6,1.8],[5,-2,2.4,2,2],[-10,9,3,1.5,2],[11,5,4,1.55,1.8],[-5,-12,2,2,2]]){
    solid('arena-'+cover[terrain],x,z,w,h,d);
  }
  const goods={forest:'lumber',fields:'grain',pasture:'wool',mountains:'ore',hills:'brick'};
  const cargo=terrain==='desert'?Object.values(goods):[goods[terrain],goods[terrain]];
  cargo.forEach((good,i)=>add('res-'+good,[-5.2+i*.75,1.61,3],[.68,.46,.66],i*.7));
  for(let i=0;i<8;i++)add('arena-stockade',[-14+i*4,0,-16],[4,1.6,.32]);
  const foe=add('rival-'+terrain,[0,0,-8],[1.15,2.4,.84]);
  const gun=new T.Group();
  camera.add(gun);
  scene.add(camera);
  gun.position.set(.31,-.31,-.58);
  // Meshy's weapon meshes lie along X with the muzzle at their negative end.
  const weaponSizes={
    forest:[.86,.21,.14], fields:[.76,.26,.13], pasture:[.84,.30,.13],
    mountains:[.78,.42,.20], hills:[.84,.20,.10], desert:[.90,.19,.09]
  };
  const weaponSize=weaponSizes[terrain];
  add('gun-'+terrain,[0,-.14,-.12],weaponSize,-Math.PI/2,gun);
  add('gun-'+terrain,[.34,1.02,.35],weaponSize,Math.PI/2,foe);

  // Keep shared projectile geometry and materials alive across rapid fire.
  const effects=new T.Group();
  const bolt=new T.Group();
  add('fx-projectile',[0,-.06,0],[.62,.12,.12],Math.PI/2,bolt);
  const spark=add('fx-impact',[0,0,0],[.34,.34,.34],0,effects);
  function effect(template, at){
    const object=template.clone(true);
    object.position.copy(at);
    scene.add(object);
    return object;
  }
  camera.rotation.order='YXZ';camera.position.set(0,1.65,11);
  const ray=new T.Raycaster(),forward=new T.Vector3(),vec=new T.Vector3();
  const solidBoxes=obstacles.map(o=>new T.Box3(new T.Vector3(o.x-o.w,0,o.z-o.d),new T.Vector3(o.x+o.w,o.h,o.z+o.d)));
  function wallDistance(pos,dir){ray.ray.set(pos,dir);let nearest=Infinity;for(const b of solidBoxes){const hit=ray.ray.intersectBox(b,vec);if(hit)nearest=Math.min(nearest,pos.distanceTo(hit))}return nearest}
  function canStand(x,z){return Math.hypot(x,z)<18&&!obstacles.some(o=>Math.abs(x-o.x)<o.w+.36&&Math.abs(z-o.z)<o.d+.36)}
  function startReload(){if(!reload&&shots<capacity){reload=1.25;hud()}}
  function fire(){if(!playing||reload||cooldown)return;if(!shots){startReload();return}shots--;cooldown=delay;recoil=.13;camera.updateMatrixWorld();foe.updateMatrixWorld();let damage=0;
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
  listen(window,'keydown',e=>{if(!playing)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)fire();if(e.code==='Escape')paused();if(e.code==='KeyR')startReload()});listen(window,'keyup',e=>keys.delete(e.code));
  for(const btn of el('touchPad').querySelectorAll('button')){listen(btn,'pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);if(btn.dataset.key)keys.add(btn.dataset.key);else held=true});for(const name of ['pointerup','pointercancel'])listen(btn,name,()=>{keys.delete(btn.dataset.key);if(!btn.dataset.key)held=false})}
  el('engage').textContent='Loading arena…';
  Promise.all(loading).then(()=>{
    if(done)return;
    el('engage').textContent='Enter duel';
    el('engage').disabled=false;
  }).catch(()=>{
    if(done)return;
    el('engage').textContent='Arena unavailable';
    el('stakes').textContent='The arena assets could not load. Reload the page to retry this raid, or concede to return to the board.';
  });
  el('engage').onclick=()=>{brief.hidden=true;playing=true;if(!matchMedia('(pointer:coarse)').matches){try{canvas.requestPointerLock?.()?.catch?.(()=>{})}catch{}}};
  let last=performance.now();
  function tick(now){if(done)return;frame=requestAnimationFrame(tick);const dt=Math.min(.045,(now-last)/1000);last=now;
    if(playing){age+=dt;cooldown=Math.max(0,cooldown-dt);recoil=Math.max(0,recoil-dt*.8);hitMark=Math.max(0,hitMark-dt);if(!hitMark)el('cross').textContent='+';flash=Math.max(0,flash-dt*2);el('hit').style.opacity=flash;
      if(reload){reload=Math.max(0,reload-dt);if(!reload){shots=capacity;hud()}}
      yaw+=(Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight')))*dt*1.65;pitch=T.MathUtils.clamp(pitch+(Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')))*dt*1.4,-1.15,1.15);camera.rotation.set(pitch,yaw,0);
      let side=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),back=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));let speed=dt*6.3/Math.max(1,Math.hypot(side,back));let x=camera.position.x+(side*Math.cos(yaw)+back*Math.sin(yaw))*speed,z=camera.position.z+(back*Math.cos(yaw)-side*Math.sin(yaw))*speed;if(canStand(x,camera.position.z))camera.position.x=x;if(canStand(camera.position.x,z))camera.position.z=z;gun.position.y=-.31+(side||back?Math.sin(age*11)*.012:0)-(reload?.12:0);gun.position.z=-.58+recoil;
      if(held||keys.has('Space'))fire();if(done)return;
      let fx=Math.sin(age*.55)*6,fz=-7+Math.sin(age*.32)*2.5;if(canStand(fx,fz))foe.position.set(fx,0,fz);foe.rotation.y=Math.atan2(camera.position.x-foe.position.x,camera.position.z-foe.position.z);
      attack-=dt;if(attack<=0){attack=1.35+Math.random()*.4;const origin=foe.position.clone().add(new T.Vector3(0,1.4,0)),dir=camera.position.clone().sub(origin);const length=dir.length();dir.normalize();if(wallDistance(origin,dir)>length){const m=effect(bolt,origin);m.lookAt(camera.position);bullets.push({m,dir,life:3})}}
      for(let i=bullets.length-1;i>=0;i--){let b=bullets[i],step=dt*11.5;b.life-=dt;const blocked=wallDistance(b.m.position,b.dir)<=step;b.m.position.addScaledVector(b.dir,step);const hit=!blocked&&b.m.position.distanceTo(camera.position)<.55;if(hit){health-=14;flash=.85;hud()}if(hit||blocked||b.life<=0){remove(b.m);bullets.splice(i,1)}if(health<=0){finish(false);return}}
      for(let i=traces.length-1;i>=0;i--){const trace=traces[i];trace.time-=dt;if(trace.start){trace.m.position.lerpVectors(trace.start,trace.end,Math.min(1,1-trace.time/.11))}if(trace.time<=0){remove(trace.m);traces.splice(i,1)}}}
    renderer.render(scene,camera)}
  function remove(m){scene.remove(m)}
  hud();tick(last);
};
