import * as T from 'three';
import {placeAsset, assetImage, assetReady} from './assets.js';

export function createIsland(tiles, vertices, edges, activate) {
  const renderer = new T.WebGLRenderer({antialias:true,alpha:false});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
  const host=document.getElementById('island');
  host.append(renderer.domElement);
  const canvas=renderer.domElement,scene=new T.Scene(),root=new T.Group(),pieces=new T.Group(),markers=new T.Group();
  scene.add(root,pieces,markers);
  const cam=new T.OrthographicCamera(), ray=new T.Raycaster(), pointer=new T.Vector2();
  let angle=-.18,pitch=.81,zoom=1,last=0,state,width=1,height=1,pick=[],rollTime=0;
  const boats=[], highlight=[];
  const world=v=>({x:(v.x-370)/36,z:(v.y-228)/36});
  const ts=tiles.map(world),vs=vertices.map(world);
  const scenerySize={
    forest:[1.75,1.05,1.08], fields:[1.74,.92,1.08], pasture:[1.68,.63,.95],
    mountains:[1.85,1.26,1.15], hills:[1.72,.83,1.07], desert:[1.65,.75,1.02]
  };
  const tokenTextures=new Map();
  function numberLabel(n) {
    if(tokenTextures.has(n))return tokenTextures.get(n);
    const c=document.createElement('canvas');c.width=c.height=128;
    const ctx=c.getContext('2d');
    ctx.fillStyle=n===8||n===6?'#a72c20':'#23372c';
    ctx.textAlign='center';ctx.font='900 80px system-ui';
    ctx.fillText(n,64,83);
    const dots=6-Math.abs(7-n);
    for(let k=0;k<dots;k++){ctx.beginPath();ctx.arc(64+(k-(dots-1)/2)*12,100,3.6,0,7);ctx.fill()}
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
    const mat=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false});
    tokenTextures.set(n,mat);
    return mat;
  }
  const numberPlane=new T.PlaneGeometry(.63,.63);
  tiles.forEach(({t,n},i)=>{
    const {x,z}=ts[i];
    const rotated=['fields','mountains','hills'].includes(t);
    const tile=placeAsset(root,'tile-'+t,[x,-.47,z],rotated?[2.98,.48,2.58]:[2.58,.48,2.98],rotated?Math.PI/2:0);
    assetReady(tile).then(()=>tile.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=false;
      if(t==='forest')o.material=new T.MeshBasicMaterial({map:o.material.map,color:0xcce7ba,side:T.DoubleSide});
    })).catch(()=>{});
    placeAsset(root,'mini-'+t,[x,.025,z-.25],scenerySize[t],Math.sin(i*3)*.14);
    if(!n)return;
    const token=placeAsset(root,'token',[x,.079,z+1.14],[.70,.70,.105]);
    token.rotation.x=-Math.PI/2;
    const label=new T.Mesh(numberPlane,numberLabel(n));
    label.rotation.x=-Math.PI/2;
    label.position.set(x,.136,z+.79);
    root.add(label);
  });
  edges.forEach(([a,b],i)=>{
    const adjacent=vertices[a].tiles.filter(t=>vertices[b].tiles.includes(t));
    if(adjacent.length!==1)return;
    const u=vs[a],v=vs[b],x=(u.x+v.x)/2,z=(u.z+v.z)/2;
    const tile=ts[adjacent[0]],dx=(x-tile.x)/1.299,dz=(z-tile.z)/1.299;
    placeAsset(root,'surf',[x+dx*.29,-.55,z+dz*.29],[1.3,.065,.3],-Math.atan2(v.z-u.z,v.x-u.x));
    if(i%4===0)placeAsset(root,'coast-rock',[x+dx*.57,-.55,z+dz*.57],[.52,.27,.37],i);
  });
  for(const [slug,x,z,size,yaw] of [
    ['sloop',-7.7,2.9,1,-.9],['ketch',7.6,-2.3,.88,.48],['fishing-boat',4.5,6.6,.83,-.45]
  ]){
    const boat=placeAsset(scene,slug,[x,-.5,z],[1.42*size,1.29*size,.68*size],yaw);
    boats.push(boat);
  }
  placeAsset(root,'palm-islet',[-9.9,-.55,-4.4],[1.65,1.3,1.35],-.18);
  placeAsset(root,'palm-islet',[10.3,-.55,3.9],[1.88,1.4,1.63],.62);
  placeAsset(root,'pine-islet',[-7.8,-.55,7],[1.38,.97,1.1],-.42);
  placeAsset(root,'pine-islet',[5.8,-.55,-8],[1.62,1.05,1.22],1.8);
  placeAsset(root,'lighthouse',[-7.7,-.52,-1.6],[.86,1.75,.78],.36);
  const ocean=placeAsset(root,'sea',[0,-.76,0],[74,.19,74]);
  assetReady(ocean).then(()=>ocean.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=false;
    o.material=o.material.clone();
    o.material.color.setHex(0x70bde1);
  })).catch(()=>{});
  scene.add(new T.HemisphereLight(0xfffcf0,0xafc6bf,1.8));
  const sun=new T.DirectionalLight(0xffebc6,2.2);
  sun.position.set(-7,14,-5);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-11,right:11,top:11,bottom:-11,near:.5,far:40});
  sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.018;sun.shadow.bias=-.00025;
  scene.add(sun);
  const hudCanvas=document.createElement('canvas'),ctx=hudCanvas.getContext('2d');
  hudCanvas.setAttribute('aria-hidden','true');
  Object.assign(hudCanvas.style,{position:'absolute',inset:'0',pointerEvents:'none'});
  host.append(hudCanvas);
  let buttons=[], hover='',pressed=null,drag=false,menu=false,selection=0,keys=[],targetYaw=angle,rollingStamp='',diceValues=[3,5];
  const f=(s,w=800)=>w+' '+s+'px "Avenir Next", "Trebuchet MS", system-ui, sans-serif';
  function panel(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=1.5;ctx.strokeStyle=stroke;ctx.stroke()}}
  function txt(str,x,y,size,color='#fff9dc',weight=800,align='left'){ctx.font=f(size,weight);ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(str,x,y)}
  function button(id,label,x,y,w,h,fill='#183e49',color='#fff9df',size=14,disabled=false){ctx.globalAlpha=disabled?.55:1;panel(x,y+3,w,h,12,'#21636c');panel(x,y,w,h,12,hover===id&&!disabled?'#44747b':fill,'#ffffff42');txt(label,x+w/2,y+h/2,size,color,850,'center');ctx.globalAlpha=1;if(!disabled)buttons.push({id,x,y,w,h})}
  const resourceSlugs=['res-lumber','res-brick','res-wool','res-grain','res-ore'];
  let imagesReady=false;
  function resourceIcon(i,x,y,s){
    const img=assetImage(resourceSlugs[i]);
    if(img)ctx.drawImage(img,x-15*s,y-15*s,30*s,30*s);
  }
  function paint(){if(!state)return;const mobile=width<670,margin=mobile?11:24;buttons=[];ctx.setTransform(hudCanvas.width/width,0,0,hudCanvas.height/height,0,0);ctx.clearRect(0,0,width,height);
    const brandX=margin,brandY=mobile?25:32;txt('CATAN',brandX,brandY-3,mobile?23:28,'#143e49',1000);txt('FRONTIER DUEL',brandX,brandY+15,9,'#194a52',900);
    button('menu',menu?'×':'☰',width-margin-40,margin,40,36);
    const scoreW=mobile?136:155,sy=mobile?65:75;
    for(let p=0;p<2;p++){let x=mobile?(p?width-margin-scoreW:margin):margin,y=sy+(mobile?0:p*48);panel(x,y,scoreW,40,12,'#143f49ed','#d9ffef88');panel(x+7,y+6,29,28,8,p?'#e9764d':'#369fe4');txt(p?'R':'Y',x+21.5,y+20,17,'#fff6d7',1000,'center');txt(p?'Rival':'You',x+44,y+20,14);txt(state.points[p]+' VP',x+scoreW-9,y+20,13,'#ffdc87',900,'right')}
    if(!mobile){txt('FIRST TO 10 VP',margin+6,sy+104,10,'#22535c',850)}
    const y=height-(mobile?154:106),trayW=mobile?width-margin*2:Math.min(405,width*.37),rH=mobile?44:65;
    panel(margin,y,trayW,rH,14,'#153f49f5','#a7ecdd');if(!mobile)txt('YOUR RESOURCES',margin+14,y+13,10,'#bddecd',900);
    for(let i=0;i<5;i++){let rx=margin+8+i*(trayW-16)/5,rw=(trayW-16)/5;resourceIcon(i,rx+rw*.26,y+(mobile?17:34),mobile?.88:1.06);txt(String(state.res[i]),rx+rw*.59,y+(mobile?17:34),17);txt(['Lumber','Brick','Wool','Grain','Ore'][i],rx+rw*.48,y+(mobile?35:54),9,'#ddeddf',700,'center');if(i>0){ctx.fillStyle='#ffffff26';ctx.fillRect(rx-2,y+(mobile?11:30),1,20)}}
    const tw=mobile?width-margin*2:Math.min(390,width*.42),tx=width-margin-tw,ty=mobile?height-102:height-123;
    panel(tx,ty,tw,82,15,'#fff4d4','#ffffffaf');txt('TURN '+String(state.turn).padStart(2,'0'),tx+13,ty+15,10,'#62736b',900);txt(state.title,tx+13,ty+41,mobile?18:21,'#21444a',950);
    if(!mobile)txt('Dice  '+diceValues[0]+' + '+diceValues[1],tx+14,ty+65,12,'#52665f',750)
    const bw=mobile?128:136;button('action',state.action,tx+tw-bw-10,ty+14,bw,48,'#f3b74d','#263f3d',15,state.disabled);
    const cmds=[['build','Build'],['trade','Trade'],['raid',state.mode==='raid'?'Cancel raid':'Raid']];let cw=mobile?65:78,ay=mobile?y-43:y-46;
    cmds.forEach(([id,label],i)=>button(id,label,margin+i*(cw+6),ay,cw,34,id==='raid'?'#995137':'#234c54','#fff6dc',13,id==='raid'&&state.raidDisabled));
    const msg=state.hint;if(state.mode||state.moving||state.rolled){let my=mobile?ay-25:height-162;let max=mobile?width-20:Math.min(480,width*.48);let x=mobile?width/2:width/2+40;ctx.font=f(12);let sw=Math.min(max,ctx.measureText(msg).width+24);panel(x-sw/2,my-13,sw,26,12,'#16434be8');txt(msg,x,my,12,'#fff7d7',750,'center')}
    if(!mobile){txt('Drag to orbit   ·   Scroll to zoom',width/2,height-16,11,'#205860',750,'center')}
    if(menu){const items=[['rules','Rulebook'],['legend','Island legend'],['log','Match log'],['sound',state.muted?'Sound: off':'Sound: on'],['resetCam','Reset camera'],['settings','New match']];items.forEach(([id,label],i)=>button(id,label,width-margin-148,margin+45+i*38,148,33))}
    keys=buttons.map(b=>b.id).concat(pick.map(m=>m.userData.key));
  }
  const dieGroups=[new T.Group(),new T.Group()];dieGroups.forEach(d=>scene.add(d));
  const pipPositions=[[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
  const dieFacePoses=[
    [[0,.353,0],[-Math.PI/2,0,0]], [[0,0,.353],[0,0,0]], [[.353,0,0],[0,Math.PI/2,0]],
    [[-.353,0,0],[0,-Math.PI/2,0]], [[0,0,-.353],[0,Math.PI,0]], [[0,-.353,0],[Math.PI/2,0,0]]
  ];
  for(const d of dieGroups){
    placeAsset(d,'die',[0,-.35,0],[.70,.70,.70]);d.visible=false;
  }
  pipPositions.forEach((pips,i)=>{
    const c=document.createElement('canvas');c.width=c.height=96;
    const ctx=c.getContext('2d');ctx.fillStyle='#17313e';
    for(const k of pips){ctx.beginPath();ctx.arc(21+(k%3)*27,21+Math.floor(k/3)*27,6,0,Math.PI*2);ctx.fill()}
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
    const mat=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false});
    for(const d of dieGroups){
      const label=new T.Mesh(numberPlane,mat);
      label.position.set(...dieFacePoses[i][0]);label.rotation.set(...dieFacePoses[i][1]);d.add(label);
    }
  });
  function frameCam(){const a=width/height,mobile=width<670;const span=Math.max(mobile?13:11.8,(mobile?14.8:17.5)/a)/zoom;cam.left=-span*a/2;cam.right=span*a/2;cam.top=span/2;cam.bottom=-span/2;cam.near=.1;cam.far=180;cam.position.set(Math.sin(angle)*Math.cos(pitch)*38,Math.sin(pitch)*38,Math.cos(angle)*Math.cos(pitch)*38);cam.lookAt(0,0,0);cam.updateProjectionMatrix();cam.updateMatrixWorld();const shift=mobile?-.025:.02;cam.setViewOffset(width,height,0,height*shift,width,height)}
  function resize(){
    const w=host.clientWidth,h=host.clientHeight,ratio=Math.min(devicePixelRatio,2);
    if(!w||!h)return;
    if(width===w&&height===h&&hudCanvas.width===Math.round(w*ratio)&&hudCanvas.height===Math.round(h*ratio))return;
    width=w;height=h;renderer.setSize(w,h,false);
    hudCanvas.width=Math.round(w*ratio);hudCanvas.height=Math.round(h*ratio);
    frameCam();paint();
  }
  const selectionGeometries=new Map();
  function hitDisk(x,z,key,r,tile=false){
    const sides=tile?6:16;
    if(!selectionGeometries.has(sides))selectionGeometries.set(sides,new T.CylinderGeometry(1,1,1,sides));
    const material=new T.MeshBasicMaterial({color:tile?0xffdb58:0xffff98,transparent:true,opacity:tile?.31:.88,depthWrite:false});
    const m=new T.Mesh(selectionGeometries.get(sides),material);
    m.scale.set(r,.06,r);m.position.set(x,tile?.045:.70,z);m.userData.key=key;markers.add(m);
    if(tile){
      highlight.push(material);
      const ring=new T.Mesh(new T.RingGeometry(r*.93,r,6,1,Math.PI/2),new T.MeshBasicMaterial({color:0xffe46d,side:T.DoubleSide}));
      ring.rotation.x=-Math.PI/2;ring.position.set(x,.09,z);markers.add(ring);
    }
    pick.push(m);
  }
  function update(s){
    state=s;diceValues=s.dice;pieces.clear();
    markers.traverse(o=>{if(o.geometry?.type==='RingGeometry')o.geometry.dispose();o.material?.dispose()});
    markers.clear();highlight.length=0;pick=[];
    for(const [id,p] of Object.entries(s.roads)){
      const [u,v]=edges[id].map(i=>vs[i]);
      placeAsset(pieces,p?'coral-road':'azure-road',[(u.x+v.x)/2,.055,(u.z+v.z)/2],[1.17,.17,.21],-Math.atan2(v.z-u.z,v.x-u.x));
    }
    for(const [id,[p,n]] of Object.entries(s.owns)){
      const {x,z}=vs[id],city=n===2;
      const slug=city?(p?'coral-city':'azure-city'):(p?'cottage':'azure-cottage');
      placeAsset(pieces,slug,[x,.04,z],city?[.71,.92,.63]:[.55,.68,.52],.16);
    }
    const rp=ts[s.robber];
    placeAsset(pieces,'robber',[rp.x+.52,.07,rp.z+.48],[.40,.83,.36],.22);
    if(s.mode==='raid'||s.moving){s.locations.forEach(i=>hitDisk(ts[i].x,ts[i].z,'tile:'+i,1.43,true))}
    else if(s.mode){s.locations.forEach(id=>{let v=vs[id];if(s.mode==='Road'){const [a,b]=edges[id].map(i=>vs[i]);v={x:(a.x+b.x)/2,z:(a.z+b.z)/2}}hitDisk(v.x,v.z,'place:'+id,.25)})}
    const stamp=s.turn+':'+s.rolled;if(s.rolled&&stamp!==rollingStamp){rollTime=1.45;dieGroups.forEach(d=>d.visible=true)}rollingStamp=stamp;paint();
  }
  function click(id){if(id==='menu'){menu=!menu;paint();return}if(id==='resetCam'){targetYaw=-.18;pitch=.81;zoom=1;menu=false;frameCam();paint();return}menu=false;paint();activate(id)}
  function hudAt(x,y){return buttons.findLast(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)?.id}
  function at(x,y){const hud=hudAt(x,y);if(hud)return hud;pointer.set(2*x/width-1,1-2*y/height);ray.setFromCamera(pointer,cam);return ray.intersectObjects(pick,false)[0]?.object.userData.key}
  canvas.addEventListener('pointerdown',e=>{canvas.focus();pressed={x:e.clientX,y:e.clientY,ax:e.clientX,ay:e.clientY,ui:hudAt(e.clientX,e.clientY)};drag=false;canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(pressed&&!pressed.ui){if(Math.hypot(e.clientX-pressed.ax,e.clientY-pressed.ay)>5)drag=true;if(drag){targetYaw-=(e.clientX-pressed.x)*.008;pitch=T.MathUtils.clamp(pitch+(e.clientY-pressed.y)*.003,.55,1.25);pressed.x=e.clientX;pressed.y=e.clientY;frameCam()}}const id=at(e.clientX,e.clientY)||'';if(id!==hover){hover=id;paint()}canvas.style.cursor=id?'pointer':drag?'grabbing':'grab'});
  canvas.addEventListener('pointerup',e=>{if(pressed&&!drag){const id=at(e.clientX,e.clientY);if(id)click(id)}pressed=null;drag=false});canvas.addEventListener('pointercancel',()=>pressed=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=T.MathUtils.clamp(zoom*Math.exp(-e.deltaY*.001),.74,1.65);frameCam()},{passive:false});
  canvas.tabIndex=0;canvas.setAttribute('aria-label','3D Catan island. Drag to orbit, scroll to zoom. Use the adjacent game controls for keyboard play.');
  function animate(time){requestAnimationFrame(animate);if(document.hidden||!document.getElementById('arena').hidden)return;const dt=Math.min((time-last)/1000,.075);last=time;angle+=(targetYaw-angle)*Math.min(1,dt*12);frameCam();boats.forEach((q,i)=>{q.position.y=-.48+Math.sin(time*.0018+i)*.035;q.rotation.z=Math.sin(time*.0012+i)*.035});if(!imagesReady&&resourceSlugs.every(slug=>assetImage(slug))){imagesReady=true;paint()}highlight.forEach(m=>m.opacity=.24+.12*Math.sin(time*.003));
    if(rollTime>0){rollTime=Math.max(0,rollTime-dt);dieGroups.forEach((q,i)=>{let t=1.45-rollTime,k=Math.min(t/.85,1),spin=1-k;const rot=[[0,0],[ -Math.PI/2,0],[0,Math.PI/2],[0,-Math.PI/2],[Math.PI/2,0],[Math.PI,0]][diceValues[i]-1];q.position.set(i*.96-.48,.45+Math.abs(Math.sin(k*Math.PI*2.1))*spin*2,5.5);q.rotation.set(rot[0]+spin*7,spin*4+.16*i,rot[1]+spin*8);if(!rollTime)q.visible=false})}
    renderer.render(scene,cam)}
  scene.background=new T.Color(0x54c8d2);resize();new ResizeObserver(resize).observe(host);addEventListener('resize',resize);requestAnimationFrame(animate);return {update}
}
