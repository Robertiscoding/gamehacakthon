import * as T from 'three';

const kits = {
  forest: ['Pinewood crossbow', 4, 35, .48, 1, 0x79945d],
  fields: ['Scatter sling', 3, 14, .7, 5, 0xc3aa60],
  pasture: ['Shepherd’s repeater', 10, 17, .16, 1, 0x91b476],
  mountains: ['Quarry arbalest', 2, 55, .85, 1, 0x929b8a],
  hills: ['Clay scattergun', 4, 12, .52, 5, 0xb9825e],
  desert: ['Dune carbine', 6, 26, .32, 1, 0xc9b179]
};
const el = id => document.getElementById(id);
window.startArena = function(terrain, defending, settle) {
  const [weapon, capacity, power, delay, pellets, ground] = kits[terrain];
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(72, 1, .05, 160);
  const arena = el('arena'), brief = el('brief'), field = el('field');
  const events = new AbortController(), listen = (target, name, handler) => target.addEventListener(name, handler, {signal:events.signal});
  let renderer, frame, playing = false, done = false, held = false, shots = capacity, health = 100, rival = 100;
  let reload = 0, cooldown = 0, age = 0, attack = 1.8, yaw = 0, pitch = 0, flash = 0, recoil = 0, hitMark = 0;
  const keys = new Set(), obstacles = [], bullets = [], traces = [], geometries = new Set(), materials = new Map();
  arena.hidden = false;
  for(const area of document.querySelectorAll('body > header,body > main'))area.inert=true;
  brief.hidden = false;
  el('biome').textContent = terrain.toUpperCase()+' TERRITORY';
  el('battleName').textContent = defending ? 'Defend your settlement' : 'Settlement raid';
  el('briefTitle').textContent = defending ? 'Hold the settlement.' : 'Raid the settlement.';
  el('stakes').textContent = 'Win a resource card. Every third duel win earns a victory point. Your '+weapon.toLowerCase()+' is ready.';
  el('weaponName').textContent = weapon.toUpperCase();
  el('controls').textContent = matchMedia('(pointer:coarse)').matches ? 'Drag to aim. Use the arrows to move and Fire to shoot. Your weapon reloads automatically.' : 'WASD to move · Mouse or arrows to aim · Click or Space to fire · R to reload · Esc to pause';
  el('engage').disabled=false;
  function hud(){el('hp').textContent=Math.max(0,Math.ceil(health))+' / 100';el('enemyHp').textContent=Math.max(0,Math.ceil(rival))+' / 100';el('ammo').textContent=reload?'Reloading…':shots+' / '+capacity}
  function finish(won){if(done)return;done=true;playing=false;events.abort();cancelAnimationFrame(frame);if(document.pointerLockElement===field.firstChild)document.exitPointerLock?.();arena.hidden=true;for(const area of document.querySelectorAll('body > header,body > main'))area.inert=false;field.replaceChildren();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer?.dispose();renderer?.forceContextLoss();el('cross').textContent='+';el('hit').style.opacity=0;settle(won)}
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
  function mesh(geometry,color,x,y,z,parent=scene){geometries.add(geometry);if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,flatShading:true,roughness:.9}));const m=new T.Mesh(geometry,materials.get(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  function box(x,y,z,w,h,d,color,parent){return mesh(new T.BoxGeometry(w,h,d),color,x,y,z,parent)}
  function cyl(x,y,z,top,bottom,h,sides,color,parent){return mesh(new T.CylinderGeometry(top,bottom,h,sides),color,x,y,z,parent)}
  function hill(x,z,size,color){const m=mesh(new T.IcosahedronGeometry(size,0),color,x,-size*.4,z);m.scale.set(1.5,1,1);return m}
  function tree(x,z,h){cyl(x,h*.25,z,.18,.28,h*.5,6,0x795e43);cyl(x,h*.6,z,0,h*.33,h*.79,6,0x547957);cyl(x,h*.85,z,0,h*.25,h*.66,6,0x6d8e61)}
  function house(x,z,w,color){box(x,1.35,z,w,2.7,w*.86,0xead5aa);let roof=cyl(x,3.1,z,0,w*.84,2.4,4,color);roof.rotation.y=Math.PI/4;box(x,.9,z+w*.432,.82,1.8,.08,0x6d503b);for(let a of [-1,1])box(x+a*w*.3,1.65,z+w*.435,.56,.7,.08,0x546e68);obstacles.push({x,z,h:4.1,w:w*.5+.08,d:w*.44+.08})}
  cyl(0,-1.05,0,34,32,2,6,ground);cyl(0,-2.1,0,190,190,.8,80,0x7faea5);
  for(let i=0;i<26;i++){const a=i*2.399,r=56+(i%5)*5;hill(Math.cos(a)*r,Math.sin(a)*r,7+(i%4)*4,i%2?0x829d83:0x94aa92)}
  for(let i=0;i<46;i++){const a=i*2.399,r=21+i%7,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(terrain==='mountains'||terrain==='hills'||terrain==='desert'){hill(x,z,2+i%3,terrain==='mountains'?0x91998e:ground);if(i%4===0)tree(x,z,4)}
    else if(terrain==='fields'&&i%3){for(let j=0;j<5;j++)cyl(x+(j%3)*.45,.6,z+Math.floor(j/3)*.48,.13,.07,1.2,5,0xd2ad52)}
    else tree(x,z,3+i%5)}
  house(-9,-3,4.8,0x98583f);house(10,-10,5.5,0xa46243);house(0,-20,6.2,0x9c6344);
  for(let [x,z,w,h,d] of [[-4,3,3.6,1.6,1.8],[5,-2,2.4,2,2],[-10,9,3,1.5,2],[11,5,4,1.55,1.8],[-5,-12,2,2,2]]){
    box(x,h/2,z,w,h,d,terrain==='fields'?0xc79f4d:0xa47b4f);
    for(let a of [-.35,.35]){box(x+w*a,h/2,z,.12,h+.04,d+.06,0x69583f)}obstacles.push({x,z,w:w/2,d:d/2,h})}
  for(let i=0;i<9;i++){const x=-16+i*4;box(x,.8,-16,.22,1.6,.22,0x735e42);if(i<8)box(x+2,.95,-16,4,.16,.12,0xa38d68)}
  const foe=new T.Group();foe.position.set(0,0,-8);scene.add(foe);
  box(0,1.2,0,.91,.89,.58,0xb15b3b,foe);box(0,1.95,0,.55,.56,.52,0xe6ba8a,foe);cyl(0,2.28,0,.29,.43,.24,6,0x744a36,foe);
  for(let s of [-1,1]){box(s*.24,.4,0,.28,.8,.32,0x49564a,foe);box(s*.54,1.26,.08,.25,.76,.32,0x94573c,foe)}
  box(.29,1.22,.47,.2,.23,1.0,0x654c34,foe);box(0,1.96,.27,.48,.12,.045,0x674d37,foe);
  const gun=new T.Group();camera.add(gun);scene.add(camera);gun.position.set(.31,-.31,-.58);box(0,0,0,.15,.17,.74,0x896240,gun);box(0,.09,-.13,.065,.07,.58,0x495449,gun);
  if(pellets===1){for(let s of [-1,1]){const limb=box(s*.19,.035,-.23,.43,.055,.085,0xb28b54,gun);limb.rotation.y=s*-.34}box(0,.04,-.16,.75,.012,.016,0x494936,gun)}
  else{box(0,.12,-.25,.21,.12,.47,0x695b46,gun)}
  box(.07,-.14,.12,.21,.24,.28,0x728469,gun);
  camera.rotation.order='YXZ';camera.position.set(0,1.65,11);
  const ray=new T.Raycaster(),forward=new T.Vector3(),vec=new T.Vector3();
  const solidBoxes=obstacles.map(o=>new T.Box3(new T.Vector3(o.x-o.w,0,o.z-o.d),new T.Vector3(o.x+o.w,o.h,o.z+o.d)));
  function wallDistance(pos,dir){ray.ray.set(pos,dir);let nearest=Infinity;for(const b of solidBoxes){const hit=ray.ray.intersectBox(b,vec);if(hit)nearest=Math.min(nearest,pos.distanceTo(hit))}return nearest}
  function canStand(x,z){return Math.hypot(x,z)<18&&!obstacles.some(o=>Math.abs(x-o.x)<o.w+.36&&Math.abs(z-o.z)<o.d+.36)}
  function startReload(){if(!reload&&shots<capacity){reload=1.25;hud()}}
  function fire(){if(!playing||reload||cooldown)return;if(!shots){startReload();return}shots--;cooldown=delay;recoil=.13;camera.updateMatrixWorld();foe.updateMatrixWorld();let damage=0;
    for(let i=0;i<pellets;i++){camera.getWorldDirection(forward);if(pellets>1){forward.x+=(Math.random()-.5)*.078;forward.y+=(Math.random()-.5)*.066;forward.normalize()}const wall=wallDistance(camera.position,forward);ray.set(camera.position,forward);const hit=ray.intersectObject(foe,true)[0];let distance=Math.min(wall,35);if(hit&&hit.distance<wall){damage+=power;distance=hit.distance}
      const end=camera.position.clone().addScaledVector(forward,distance),start=gun.localToWorld(new T.Vector3(0,.07,-.45));const d=end.clone().sub(start),m=box(0,0,0,.019,.019,d.length(),0xf5d991);m.position.copy(start).lerp(end,.5);m.lookAt(end);m.castShadow=false;traces.push({m,time:.07})}
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
  el('engage').textContent='Enter duel';el('engage').onclick=()=>{brief.hidden=true;playing=true;if(!matchMedia('(pointer:coarse)').matches){try{canvas.requestPointerLock?.()?.catch?.(()=>{})}catch{}}};
  let last=performance.now();
  function tick(now){if(done)return;frame=requestAnimationFrame(tick);const dt=Math.min(.045,(now-last)/1000);last=now;
    if(playing){age+=dt;cooldown=Math.max(0,cooldown-dt);recoil=Math.max(0,recoil-dt*.8);hitMark=Math.max(0,hitMark-dt);if(!hitMark)el('cross').textContent='+';flash=Math.max(0,flash-dt*2);el('hit').style.opacity=flash;
      if(reload){reload=Math.max(0,reload-dt);if(!reload){shots=capacity;hud()}}
      yaw+=(Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight')))*dt*1.65;pitch=T.MathUtils.clamp(pitch+(Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')))*dt*1.4,-1.15,1.15);camera.rotation.set(pitch,yaw,0);
      let side=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),back=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));let speed=dt*6.3/Math.max(1,Math.hypot(side,back));let x=camera.position.x+(side*Math.cos(yaw)+back*Math.sin(yaw))*speed,z=camera.position.z+(back*Math.cos(yaw)-side*Math.sin(yaw))*speed;if(canStand(x,camera.position.z))camera.position.x=x;if(canStand(camera.position.x,z))camera.position.z=z;gun.position.y=-.31+(side||back?Math.sin(age*11)*.012:0)-(reload?.12:0);gun.position.z=-.58+recoil;
      if(held||keys.has('Space'))fire();if(done)return;
      let fx=Math.sin(age*.55)*6,fz=-7+Math.sin(age*.32)*2.5;if(canStand(fx,fz))foe.position.set(fx,0,fz);foe.rotation.y=Math.atan2(camera.position.x-foe.position.x,camera.position.z-foe.position.z);
      attack-=dt;if(attack<=0){attack=1.35+Math.random()*.4;const origin=foe.position.clone().add(new T.Vector3(0,1.4,0)),dir=camera.position.clone().sub(origin);const length=dir.length();dir.normalize();if(wallDistance(origin,dir)>length){const m=mesh(new T.SphereGeometry(.13,6,4),0xeb723b,origin.x,origin.y,origin.z);bullets.push({m,dir,life:3})}}
      for(let i=bullets.length-1;i>=0;i--){let b=bullets[i],step=dt*11.5;b.life-=dt;const blocked=wallDistance(b.m.position,b.dir)<=step;b.m.position.addScaledVector(b.dir,step);const hit=!blocked&&b.m.position.distanceTo(camera.position)<.55;if(hit){health-=14;flash=.85;hud()}if(hit||blocked||b.life<=0){remove(b.m);bullets.splice(i,1)}if(health<=0){finish(false);return}}
      for(let i=traces.length-1;i>=0;i--){traces[i].time-=dt;if(traces[i].time<=0){remove(traces[i].m);traces.splice(i,1)}}}
    renderer.render(scene,camera)}
  function remove(m){scene.remove(m);geometries.delete(m.geometry);m.geometry.dispose()}
  hud();tick(last);
};
