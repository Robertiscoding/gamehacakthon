import * as T from 'three';
import {placeAsset,assetReady} from './assets.js';
import {hexExtent} from './terrain.js';
import {adventurer} from './garden.js';
import {bladeKit,returningBlade} from './blades.js';

const byId=id=>document.getElementById(id), resources=['lumber','brick','wool','grain','ore'];
const team=[0x23c3ef,0xff6a6a];
export async function playRound(island,round,options){
 const data=await island.environment(9),shared=island.takeCamera(9);
 const {scene,renderer,canvas}=shared,overlay=byId('arena'),brief=byId('brief');
 const root=new T.Group();scene.add(root);const boardLight=scene.children.find(o=>o.isDirectionalLight);if(boardLight){Object.assign(boardLight.shadow.camera,{left:-122,right:122,top:122,bottom:-122,far:340});boardLight.shadow.camera.updateProjectionMatrix();boardLight.position.set(-72,140,85)}
 const view=new T.OrthographicCamera(-1,1,1,-1,.1,550),keys=new Set(),events=new AbortController();
 const listen=(o,k,fn,opts={})=>o.addEventListener(k,fn,{...opts,signal:events.signal});
 const centers=data.centers.map(c=>new T.Vector3((c.x-data.center.x)*16,0,(c.z-data.center.z)*16));
 const corners=[centers[16].clone().add(new T.Vector3(-9,0,6)),centers[2].clone().add(new T.Vector3(9,0,-6))];
 const walkable=(x,z)=>centers.some(c=>hexExtent((x-c.x)/16,(z-c.z)/16)<.998);
 const world=(x,y,z)=>new T.Vector3(x,y,z),ready=[],ownedGeometry=[],ownedMaterial=[];
 function mesh(geo,mat,p=root){ownedGeometry.push(geo);ownedMaterial.push(mat);const m=new T.Mesh(geo,mat);p.add(m);return m}
 const flat=color=>new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true});
 function ring(color,r,parent){const m=mesh(new T.RingGeometry(r*.77,r,40),flat(color),parent);m.rotation.x=-Math.PI/2;m.position.y=.16;return m}
 const active=round.eligible,duel=round.kind==='duel',actors=[],drops=[],throws=[],waves=[];
 const pickups=round.drops||[];
 let done=false,paused=false,started=false,time=0,frame,previous=performance.now(),lastAim=new T.Vector3(0,0,-1);
 const arenaHeader=byId('battleName'),hud=document.createElement('div');hud.className='roundHUD';overlay.append(hud);
 const label=document.createElement('div');label.className='roundControls';overlay.append(label);
 label.textContent=active[0]?'WASD move   ·   Space slash   ·   F throw   ·   Shift dash':'Rival is gathering resources';
 overlay.hidden=false;overlay.className='bladeround';overlay.setAttribute('aria-label','Sword scramble');byId('field').append(canvas);
 document.querySelector('main').inert=true;renderer.autoClear=true;
 arenaHeader.textContent=duel?'Blade duel':'Harvest scramble';byId('biome').textContent=duel?'FIRST TO 3 KNOCKOUTS':'ROLL '+round.sum;
 brief.hidden=true;byId('pauseRaid').textContent='Pause';
 const actorInfo=(p)=>{const a=new T.Group();root.add(a);a.position.copy(corners[p]);a.position.y=.12;
   const body=adventurer(a,p);body.scale.setScalar(1.48);
   const base=ring(team[p],2,a);const weapon=bladeKit(a,team[p]);weapon.position.set(.9,1.7,.55);weapon.scale.setScalar(1.5);
   return {group:a,body,base,weapon,face:world(p?-1:1,0,p?1:-1).normalize(),slash:0,cool:0,throwCool:0,dash:0,dashCool:0,respawn:0,shield:1,score:0,grab:0,p};};
 active.forEach((yes,p)=>{if(yes)actors[p]=actorInfo(p)});
 for(const d of pickups){if(d.owner!=null)continue;const cluster=pickups.filter(q=>q.tile===d.tile),j=cluster.indexOf(d),angle=j*2.4;const c=centers[d.tile],pos=c.clone().add(world(Math.cos(angle)*(3+j*.7),0,Math.sin(angle)*(3+j*.7)));
   const node=new T.Group();node.position.copy(pos);root.add(node);ring(0xffe76a,2.4,node);const token=placeAsset(node,'res-'+resources[d.res],[0,.55,0],[3.1,2.9,2.7],angle);ready.push(assetReady(token));drops.push({d,node,token,live:true})}
 function updateHUD(){hud.textContent=duel?'You '+(actors[0]?.score||0)+'   •   '+(actors[1]?.score||0)+' Rival':pickups.filter(d=>d.owner!=null).length+' / '+pickups.length+' collected'}
 function burst(pos,color,size){const w=ring(color,size,root);w.position.copy(pos);w.position.y=.22;waves.push({w,life:.28})}
 function finish(result){if(done)return;done=true;cancelAnimationFrame(frame);events.abort();for(const t of throws){root.remove(t.mesh);t.mesh.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})}root.traverse(o=>{if(o.isMesh&&!o.userData.shared&&o.parent?.type==='Group'&&o.geometry?.type==='ExtrudeGeometry'){o.geometry.dispose();o.material.dispose()}});ownedGeometry.forEach(g=>g.dispose());ownedMaterial.forEach(m=>m.dispose());scene.remove(root);hud.remove();label.remove();controls.remove();overlay.className='';overlay.hidden=true;document.querySelector('main').inert=false;shared.restore();options.end(result)}
 function hit(a,b){if(!b||b.respawn||b.shield>0||b.dash>0)return;burst(b.group.position,team[b.p],3);a.score++;b.respawn=.9;b.group.visible=false;updateHUD();if(duel&&a.score>=3)finish(a.p===0)}
 function slash(a){if(!a||a.cool>0||a.respawn||!started||paused)return;a.cool=.48;a.slash=.24;const arc=mesh(new T.RingGeometry(3.15,4.7,22,1,-1.05,2.1),flat(0xffeda1));arc.rotation.order='YXZ';arc.rotation.x=-Math.PI/2;arc.rotation.y=Math.atan2(a.face.x,a.face.z)-Math.PI/2;arc.position.copy(a.group.position);arc.position.y=1.3;waves.push({w:arc,life:.24});const b=actors[1-a.p];if(b&&a.group.position.distanceTo(b.group.position)<6.2){const toward=b.group.position.clone().sub(a.group.position).normalize();if(toward.dot(a.face)>-.32)hit(a,b)}}
 function toss(a){if(!a||a.throwCool>0||a.respawn||!started||paused)return;a.throwCool=1.25;const m=returningBlade();m.scale.setScalar(1.7);m.position.copy(a.group.position);m.position.y=1.65;root.add(m);throws.push({mesh:m,owner:a,dir:a.face.clone(),age:0,didHit:false})}
 function dash(a){if(a&&a.dashCool<=0&&!a.respawn){a.dash=.23;a.dashCool=1.15;burst(a.group.position,team[a.p],1.6)}}
 function move(a,x,z,dt){const l=Math.hypot(x,z);if(l){a.face.set(x/l,0,z/l)}if(!l&&!a.dash)return;const speed=dt*(a.dash>0?43:a.p?14.2:16.8),p=a.group.position,xx=p.x+a.face.x*speed,zz=p.z+a.face.z*speed;if(walkable(xx,p.z))p.x=xx;if(walkable(p.x,zz))p.z=zz;a.group.rotation.y=Math.atan2(a.face.x,a.face.z);a.body.position.y=Math.abs(Math.sin(time*13))*.15}
 const controls=document.createElement('div');controls.className='bladeTouch';controls.innerHTML='<div><button data-k="KeyW">↑</button><button data-k="KeyA">←</button><button data-k="KeyS">↓</button><button data-k="KeyD">→</button></div><div><button data-act="slash">Slash</button><button data-act="throw">Throw</button><button data-act="dash">Dash</button></div>';overlay.append(controls);
 function input(act){if(paused||done||!started)return;if(act==='slash')slash(actors[0]);if(act==='throw')toss(actors[0]);if(act==='dash')dash(actors[0])}
 for(const b of controls.querySelectorAll('button')){listen(b,'pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(b.dataset.k)keys.add(b.dataset.k);else input(b.dataset.act)});for(const evt of ['pointercancel','pointerup'])listen(b,evt,()=>keys.delete(b.dataset.k))}
 function pause(){if(done||!started)return;paused=true;keys.clear();brief.hidden=false;brief.querySelector('small').textContent='PAUSED';byId('briefTitle').textContent=duel?'Blade duel':'Harvest scramble';byId('stakes').textContent=duel?'Land three knockouts to win.':'Walk through glowing resource tokens to collect them.';byId('controls').textContent=label.textContent;byId('engage').disabled=false;byId('engage').textContent='Resume';byId('yieldRaid').textContent=duel?'Concede duel':'Leave remaining resources';byId('engage').onclick=()=>{paused=false;brief.hidden=true};byId('yieldRaid').onclick=()=>finish(duel?false:null)}
 byId('pauseRaid').onclick=pause;listen(window,'blur',pause);listen(document,'visibilitychange',()=>{if(document.hidden)pause()});
 listen(window,'keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='Escape')pause();if(e.code==='Space')input('slash');if(e.code==='KeyF')input('throw');if(e.code.startsWith('Shift'))input('dash')});listen(window,'keyup',e=>keys.delete(e.code));
 listen(canvas,'contextmenu',e=>e.preventDefault());listen(canvas,'pointerdown',e=>{if(!actors[0]||e.pointerType==='touch'||paused)return;const rect=canvas.getBoundingClientRect();const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-2*(e.clientY-rect.top)/rect.height),view);const at=world(0,0,0);if(ray.ray.intersectPlane(new T.Plane(world(0,1,0),0),at)){lastAim=at.sub(actors[0].group.position);lastAim.y=0;actors[0].face.copy(lastAim.normalize());actors[0].group.rotation.y=Math.atan2(lastAim.x,lastAim.z)}input(e.button===2?'throw':'slash')});
 function camera(){const aspect=innerWidth/innerHeight,focus=new T.Vector3(),points=actors.filter(Boolean).map(a=>a.group.position).concat(drops.filter(d=>d.live).map(d=>d.node.position));if(!points.length)return;const bounds=new T.Box3().setFromPoints(points);bounds.getCenter(focus);const sz=bounds.getSize(new T.Vector3());const span=Math.max(37,sz.z*.83+22,(sz.x+24)/aspect);view.left=-span*aspect/2;view.right=-view.left;view.top=span/2;view.bottom=-view.top;view.position.copy(focus).add(world(0,116,77));view.lookAt(focus);view.updateProjectionMatrix();view.updateMatrixWorld()}
 function resize(){renderer.setSize(innerWidth,innerHeight);camera()}resize();listen(window,'resize',resize);
 function tick(now){if(done)return;frame=requestAnimationFrame(tick);const dt=Math.min(.06,(now-previous)/1000);previous=now;if(!paused&&started){time+=dt;for(const a of actors.filter(Boolean)){for(const key of ['cool','throwCool','slash','dash','dashCool','shield'])a[key]=Math.max(0,a[key]-dt);if(a.respawn){a.respawn=Math.max(0,a.respawn-dt);if(!a.respawn){a.group.position.copy(corners[a.p]);a.group.visible=true;a.shield=1.5}continue}a.weapon.rotation.y=a.slash?(-1.4+3.8*(1-a.slash/.24)):.28;a.base.scale.setScalar(a.shield?1+.12*Math.sin(time*18):1);
     if(!a.p){move(a,Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp')),dt)}
     else{const enemy=actors[0],available=drops.filter(d=>d.live).sort((u,v)=>u.node.position.distanceToSquared(a.group.position)-v.node.position.distanceToSquared(a.group.position));const goal=available[0]?.node.position??enemy?.group.position;if(goal){const dir=goal.clone().sub(a.group.position);move(a,dir.x,dir.z,dt)}if(enemy&&!enemy.respawn){const dist=enemy.group.position.distanceTo(a.group.position);if(dist<5.2)slash(a);else if(dist<19&&a.throwCool<=0){a.face.copy(enemy.group.position).sub(a.group.position).normalize();toss(a)}}}
     if(done)return;for(const d of drops){if(d.live&&a.group.position.distanceTo(d.node.position)<2.9){d.live=false;d.node.visible=false;options.collect(d.d.id,a.p);a.grab++;burst(d.node.position,team[a.p],2.6);updateHUD()}}}
   for(let i=throws.length-1;i>=0;i--){const t=throws[i];t.age+=dt;if(t.age>.47){t.dir.copy(t.owner.group.position).sub(t.mesh.position);t.dir.y=0;t.dir.normalize()}t.mesh.position.addScaledVector(t.dir,dt*38);t.mesh.rotation.y+=dt*23;const enemy=actors[1-t.owner.p];if(!t.didHit&&enemy&&enemy.group.position.distanceTo(t.mesh.position)<2.8){hit(t.owner,enemy);t.didHit=true}if(done)return;if(t.age>1.7||(t.age>.54&&t.mesh.position.distanceTo(t.owner.group.position)<2.4)){root.remove(t.mesh);t.mesh.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});throws.splice(i,1)}}
   for(const d of drops){d.token.rotation.y+=dt*1.5;d.token.position.y=.75+Math.sin(time*3+d.d.id)*.3}
   for(let i=waves.length-1;i>=0;i--){const w=waves[i];w.life-=dt;w.w.scale.setScalar(1.25-w.life);w.w.material.opacity=Math.max(0,w.life/.28);if(w.life<=0){root.remove(w.w);waves.splice(i,1)}}
   if(!duel&&drops.every(d=>!d.live)){finish(null);return}}
   camera();renderer.render(scene,view)}
 updateHUD();tick(previous);
 try{await Promise.all(ready);if(!done)started=true}catch(error){finish(duel?false:null);throw error}
}
