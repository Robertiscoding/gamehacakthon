import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createIsland(tiles, vertices, edges, activate) {
  const renderer = new T.WebGLRenderer({antialias:true,alpha:false});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
  const host=document.getElementById('island');
  host.append(renderer.domElement);
  const canvas=renderer.domElement,scene=new T.Scene(),root=new T.Group(),pieces=new T.Group(),markers=new T.Group();
  scene.add(root,pieces,markers);
  const cam=new T.OrthographicCamera(), ray=new T.Raycaster(), pointer=new T.Vector2();
  const colors={forest:0x5eb75d,fields:0xf6c35b,pasture:0x9dd963,mountains:0x91a5ad,hills:0xe98855,desert:0xf6d185};
  const foam=0xd5ffed, player=[0x1b93e4,0xec583e],materials=new Map();
  let angle=-.18, pitch=.81, zoom=1, last=0, state, width=1,height=1, pick=[], boats=[], spinning=[],highlight=[], rolls=[], rollTime=0, geometrySet=new Map();
  const group=(parent,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g};
  function mat(c){if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,flatShading:true,roughness:.78}));return materials.get(c)}
  function shape(p,key,make,c,x,y,z,sx=1,sy=1,sz=1){if(!geometrySet.has(key))geometrySet.set(key,make());let m=new T.Mesh(geometrySet.get(key),typeof c==='object'?c:mat(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);p.add(m);return m}
  const box=(p,c,x,y,z,w,h,d)=>shape(p,'box',()=>new T.BoxGeometry(),c,x,y,z,w,h,d);
  const ball=(p,c,x,y,z,w,h=w,d=w)=>shape(p,'gem',()=>new T.IcosahedronGeometry(1,0),c,x,y,z,w,h,d);
  function cyl(p,c,x,y,z,r,h,n=12,ratio=1){return shape(p,'c'+n+'_'+ratio,()=>new T.CylinderGeometry(ratio,1,1,n),c,x,y,z,r,h,r)}
  function shadow(p,x,z,w,d){const a=cyl(p,0x70895a,x,.018,z,1,.016,16);a.scale.x=w;a.scale.z=d}
  const world=v=>({x:(v.x-370)/36,z:(v.y-228)/36});
  const ts=tiles.map(world),vs=vertices.map(world);
  const rng=i=>{let a=Math.sin(i*89.137+13.52)*43758.545;return a-Math.floor(a)};
  function pine(p,x,z,s){const t=group(p,x,0,z);t.scale.setScalar(s);cyl(t,0x98613e,0,.22,0,.09,.45,6);cyl(t,0x268358,0,.56,0,.4,.73,7,0);cyl(t,0x39985b,0,.87,0,.33,.66,7,0);cyl(t,0x64af5e,0,1.12,0,.22,.52,7,0)}
  function rock(p,x,z,s,c){let m=ball(p,c,x,s*.25,z,s*.63,s*.65,s*.51);m.rotation.y=x*2}
  function sheep(p,x,z,s,a){const q=group(p,x,0,z);q.rotation.y=a;q.scale.setScalar(s);for(let dx of [-.13,.13])for(let dz of [-.1,.1])box(q,0x544e44,dx,.11,dz,.055,.21,.06);ball(q,0xfff7db,0,.27,0,.28,.23,.19);ball(q,0x55574d,.24,.27,0,.115,.13,.12);ball(q,0xf0ead1,.19,.38,0,.12,.09,.11)}
  function mill(p,x,z,s){const q=group(p,x,0,z);q.scale.setScalar(s);cyl(q,0xf3dfad,0,.36,0,.27,.72,8,.75);cyl(q,0xcb6344,0,.81,0,.3,.34,8,0);box(q,0x72563f,0,.16,.25,.12,.3,.05);const rotor=group(q,0,.64,.25);for(let j=0;j<4;j++){const blade=group(rotor);blade.rotation.z=j*Math.PI/2;box(blade,0x8e6c45,.018,.26,0,.038,.54,.04);box(blade,0xffedbd,.066,.35,0,.11,.31,.045)}spinning.push(rotor)}
  function hut(p,x,z,c,city){const q=group(p,x,.02,z);q.rotation.y=.16;const w=city?.53:.42;box(q,0xffe9c0,0,.21,0,w,.39,.42);let roof=cyl(q,c,0,.49,0,w*.92,.36,4,0);roof.rotation.y=Math.PI/4;box(q,0x654b3d,0,.12,.217,.094,.22,.016);box(q,0x7bb4be,.12,.25,.217,.07,.075,.02);if(city){box(q,0xffdfac,-.26,.28,-.05,.23,.56,.25);cyl(q,c,-.26,.65,-.05,.21,.24,4,0)}cyl(q,0x71523e,.17,.58,-.075,.042,.25,6);cyl(q,c,0,.02,0,w*.9,.09,8)}
  function crop(p,x,z,rot){const q=group(p,x,.012,z);q.rotation.y=rot;box(q,0xca9148,0,0,0,.85,.048,.54);for(let k=0;k<4;k++){const b=box(q,k%2?0xffcd51:0xf3b23d,0,.085,k*.12-.18,.78,.11,.07);for(let j=0;j<5;j++){const e=ball(q,0xffdf76,j*.145-.29,.155,b.position.z,.043,.11,.045);e.rotation.z=.16}}}
  function token(p,n){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#fff2c7';ctx.fillRect(0,0,128,128);ctx.fillStyle=n===8||n===6?'#c44731':'#314941';ctx.textAlign='center';ctx.font='1000 79px system-ui';ctx.fillText(n,64,82);const dots=6-Math.abs(7-n);for(let k=0;k<dots;k++){ctx.beginPath();ctx.arc(64+(k-(dots-1)/2)*10,97,3,0,7);ctx.fill()}const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.CircleGeometry(.32,32),new T.MeshBasicMaterial({map:tx}));m.rotation.x=-Math.PI/2;m.position.set(0,.09,.79);p.add(m);cyl(p,0xd39c43,0,.045,.79,.34,.085,32)}
  tiles.forEach(({t,n},i)=>{const {x,z}=ts[i],p=group(root,x,0,z);
    cyl(p,0xe1aa70,0,-.28,0,1.5,.42,6,.99);cyl(p,0xf1ca7d,0,-.115,0,1.51,.14,6,.992);cyl(p,colors[t],0,-.032,0,1.47,.1,6,.99);
    if(t==='forest'){for(let j=0;j<9;j++){let a=j*2.4,r=.36+.64*Math.sqrt(j/9);pine(p,Math.cos(a)*r,Math.sin(a)*r*.62-.27,.52+.48*rng(i*9+j))}rock(p,-.84,.43,.25,0xa6b396)}
    if(t==='mountains'){for(let [a,b,r,h] of [[-.52,-.15,.53,.8],[.03,-.4,.7,1.35],[.62,-.2,.48,.85]]){const q=group(p,a,0,b);q.rotation.y=.3+i;cyl(q,0x788b9b,0,h/2,0,r,h,5,0);cyl(q,0xf4f4e4,0,h*.83,0,r*.35,h*.35,5,0)}rock(p,-.66,.5,.33,0x85969d);rock(p,.65,.48,.22,0xb6c3c3)}
    if(t==='fields'){crop(p,-.51,-.05,.1);crop(p,.46,-.45,-.12);crop(p,.66,.23,-.12);mill(p,-.5,-.55,.84)}
    if(t==='pasture'){for(let j=0;j<3;j++)sheep(p,(j-1)*.62,-.08+(j%2)*-.4,.74+rng(i+j)*.3,i+j);for(let j=0;j<5;j++)ball(p,0xffe997,.57+j*.055,.07,.51+Math.sin(j)*.11,.04);for(let j=0;j<3;j++){box(p,0xbc8653,-.85+j*.26,.14,-.66,.055,.28,.055)}box(p,0xd6ae70,-.59,.19,-.66,.58,.06,.045)}
    if(t==='hills'){for(let j=0;j<6;j++){const a=j*2.4,r=.23+.58*Math.sqrt(j/6),s=.37+.22*rng(i+j),xx=Math.cos(a)*r,zz=Math.sin(a)*r*.65-.25;cyl(p,j%2?0xbf6944:0xd47448,xx,s*.52,zz,s,s,6,.86);cyl(p,0xe89861,xx,s*1.05,zz,s*.84,.12,6,.89)}rock(p,-.7,.48,.29,0xc97349)}
    if(t==='desert'){for(let j=0;j<3;j++){const a=ball(p,0xeab568,(j-1)*.65,.05,-.35+Math.sin(j)*.13,.48,.23,.34);a.rotation.y=.2}for(let j=0;j<2;j++){const q=group(p,.7-j*1.45,0,-.24+j*.48);cyl(q,0x48986a,0,.23,0,.085,.46,7);box(q,0x48986a,.1,.2,0,.18,.08,.1);cyl(q,0x58a475,.17,.27,0,.06,.21,6)}}
    if(n)token(p,n);
  });
  // Only exposed hex edges receive surf and coast rocks.
  edges.forEach(([a,b],i)=>{if(vertices[a].tiles.filter(t=>vertices[b].tiles.includes(t)).length!==1)return;const u=vs[a],v=vs[b],x=(u.x+v.x)/2,z=(u.z+v.z)/2;const tile=ts[vertices[a].tiles.find(t=>vertices[b].tiles.includes(t))],dx=(x-tile.x)/1.299,dz=(z-tile.z)/1.299;
    for(let j=0;j<3;j++){let o=.14+j*.15,m=box(root,j===0?0xb9f4da:j===1?0x87e1d0:0x6cd6c7,x+dx*o,-.51-j*.008,z+dz*o,1.38-j*.18,.022,.12-j*.025);m.rotation.y=-Math.atan2(v.z-u.z,v.x-u.x)}
    if(i%3===0)rock(root,x+dx*.5,z+dz*.5,.29,0x829fa5)
  });
  function boat(x,z,s,spin){const q=group(scene,x,-.5,z);q.scale.setScalar(s);q.rotation.y=spin;const hull=ball(q,0x925c3a,0,.05,0,.33,.2,.76);box(q,0xe1ac69,0,.16,0,.36,.07,.94);cyl(q,0x89623e,0,.65,0,.034,1.15,8);const sail=new T.BufferGeometry();sail.setAttribute('position',new T.Float32BufferAttribute([0,1.18,0,.06,.38,-.59,.02,.36,-.035,0,1.03,.055,.05,.39,.055,.035,.42,.48],3));sail.computeVertexNormals();const m=new T.Mesh(sail,new T.MeshStandardMaterial({color:0xfff3ca,side:T.DoubleSide}));q.add(m);box(q,0xef6f54,0,1.19,.095,.045,.105,.21);boats.push(q)}
  boat(-7.7,2.9,.95,-.9);boat(7.6,-2.3,.74,.48);boat(4.5,6.6,.65,-.45);
  function islet(x,z,s,palm){const q=group(root,x,-.54,z);q.scale.setScalar(s);cyl(q,0xe3b784,0,.13,0,1.05,.33,9,.91);cyl(q,0xa0ca75,0,.32,0,.92,.1,9,.92);if(palm){for(let j=0;j<2;j++){const t=group(q,j*.45-.3,.32,j*.21);const trunk=cyl(t,0xb18a54,0,.55,0,.09,1.1,7,.73);trunk.rotation.z=.12;for(let k=0;k<7;k++){const a=k*.898;let f=ball(t,k%2?0x44a66d:0x76b965,Math.cos(a)*.28,1.05,Math.sin(a)*.28,.45,.12,.14);f.rotation.y=-a}}}else{pine(q,-.18,.04,.8);rock(q,.52,.18,.55,0x95a9a3)}}
  islet(-9.9,-4.4,.75,true);islet(10.3,3.9,.85,true);islet(-7.8,7,.49,false);islet(5.8,-8,.48,false);
  const water=new T.Mesh(new T.PlaneGeometry(500,500),new T.MeshBasicMaterial({color:0x54c8d2}));water.rotation.x=-Math.PI/2;water.position.y=-.56;scene.add(water);
  for(let j=0;j<850;j++){const x=(rng(j+190)-.5)*52,z=(rng(j+370)-.5)*42;if(Math.hypot(x,z)<5.8)continue;const m=ball(root,j%4?0x84dfdf:0xaeebe7,x,-.547,z,.08+rng(j)*.24,.015,.025+rng(j+2)*.03);m.rotation.y=-.1}
  scene.add(new T.HemisphereLight(0xfffcf0,0xb4c5aa,2.05));const sun=new T.DirectionalLight(0xffebc6,2.35);sun.position.set(-7,14,-5);sun.castShadow=true;Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:38});sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.018;sun.shadow.bias=-.00025;scene.add(sun);
  water.material=new T.MeshStandardMaterial({color:0xffffff,roughness:1});
  water.material.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 seaPosition;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nseaPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');shader.fragmentShader='varying vec3 seaPosition;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat d=length(seaPosition.xz*vec2(1.,1.04));float swell=.5+.5*sin(seaPosition.x*.8+cos(seaPosition.z*.7));diffuseColor.rgb=mix(vec3(.16,.64,.55),vec3(.034,.34,.51),smoothstep(5.,15.,d+swell));')};water.receiveShadow=true;
  // Batch miniature scenery into one draw call per material.
  function batch(parent,exclude=[]){parent.updateWorldMatrix(true,true);const batches=new Map(),inv=parent.matrixWorld.clone().invert();const kept=new Set(exclude.flatMap(o=>{const a=[];o.traverse(n=>a.push(n));return a}));parent.traverse(m=>{if(!m.isMesh||kept.has(m))return;const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,m.matrixWorld));if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push(geo)});exclude.forEach(o=>parent.attach(o));for(let m of [...parent.children])if(!exclude.includes(m))parent.remove(m);for(let [material,gs] of batches){const merged=mergeGeometries(gs);if(merged)parent.add(new T.Mesh(merged,material));gs.forEach(g=>g.dispose())}}
  batch(root,spinning);root.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});
  const hudScene=new T.Scene(),hudCam=new T.OrthographicCamera(-1,1,1,-1,.1,10);hudCam.position.z=2;
  const hudCanvas=document.createElement('canvas'),ctx=hudCanvas.getContext('2d'),texture=new T.CanvasTexture(hudCanvas);texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;
  const hudPlane=new T.Mesh(new T.PlaneGeometry(2,2),new T.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));hudScene.add(hudPlane);renderer.autoClear=false;
  let buttons=[], hover='',pressed=null,drag=false,menu=false,selection=0,keys=[],targetYaw=angle,rollingStamp='',diceValues=[3,5];
  const f=(s,w=800)=>w+' '+s+'px "Avenir Next", "Trebuchet MS", system-ui, sans-serif';
  function panel(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=1.5;ctx.strokeStyle=stroke;ctx.stroke()}}
  function txt(str,x,y,size,color='#fff9dc',weight=800,align='left'){ctx.font=f(size,weight);ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(str,x,y)}
  function button(id,label,x,y,w,h,fill='#183e49',color='#fff9df',size=14,disabled=false){ctx.globalAlpha=disabled?.55:1;panel(x,y+3,w,h,12,'#21636c');panel(x,y,w,h,12,hover===id&&!disabled?'#44747b':fill,'#ffffff42');txt(label,x+w/2,y+h/2,size,color,850,'center');ctx.globalAlpha=1;if(!disabled)buttons.push({id,x,y,w,h})}
  function pip(n,x,y,s){ctx.save();ctx.translate(x,y);panel(0,2,s,s,5,'#cbaf72');panel(0,0,s,s,5,'#fff7d7');const dots=[[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]][n-1];ctx.fillStyle='#234850';for(let k of dots){ctx.beginPath();ctx.arc((k%3+1)*s/4,(Math.floor(k/3)+1)*s/4,s*.064,0,7);ctx.fill()}ctx.restore()}
  function polygon(points,c){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=c;ctx.fill()}
  function resourceIcon(i,x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);const ellipse=(x,y,rx,ry,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,7);ctx.fill()};if(i===0){for(let [dx,dy] of [[-3,2],[4,3],[0,-3]]){polygon([[dx-8,dy],[dx+3,dy-7],[dx+10,dy-3],[dx-1,dy+5]],'#875b3a');ellipse(dx-5,dy+2,4,3.3,'#e0b676');ellipse(dx-5,dy+2,2,1.7,'#ac7e50')}}if(i===1){for(let [dx,dy] of [[-3,4],[3,-3]]){polygon([[dx-9,dy-2],[dx+3,dy-6],[dx+10,dy-2],[dx-2,dy+3]],'#ef9968');polygon([[dx-9,dy-2],[dx-2,dy+3],[dx+10,dy-2],[dx+10,dy+3],[dx-2,dy+8],[dx-9,dy+3]],'#ba6343')}}if(i===2){ellipse(0,0,10,7,'#ced6c5');for(let k=0;k<5;k++)ellipse(Math.sin(k*2)*5,Math.cos(k*2)*3,5,5,'#fff8df');ellipse(7,3,4,4,'#5b6053')}if(i===3){ctx.strokeStyle='#916e32';ctx.lineWidth=1.6;for(let j=-1;j<=1;j++){ctx.save();ctx.rotate(.28+j*.23);ctx.beginPath();ctx.moveTo(j*3,10);ctx.lineTo(j*3,-9);ctx.stroke();for(let k=0;k<4;k++)ellipse(j*3+(k%2?2:-2),-8+k*3,2.5,3.1,'#e9ac37');ctx.restore()}}if(i===4){polygon([[-11,5],[-6,-5],[1,-8],[9,-4],[11,5],[1,9]],'#728997');polygon([[-6,-5],[1,-8],[6,-3],[1,3]],'#b9c7c6');polygon([[1,3],[6,-3],[9,-4],[11,5],[1,9]],'#92a6ac')}ctx.restore()}
  function paint(){if(!state)return;const mobile=width<670,margin=mobile?11:24;buttons=[];ctx.setTransform(hudCanvas.width/width,0,0,hudCanvas.height/height,0,0);ctx.clearRect(0,0,width,height);
    const brandX=margin+32, brandY=mobile?25:32;ctx.save();ctx.translate(margin+13,brandY);polygon([[0,-15],[14,-8],[14,8],[0,16],[-14,8],[-14,-8]],'#16444c');polygon([[-10,6],[-4,-5],[0,1],[4,-8],[11,6]],'#ffdf87');ctx.restore();txt('CATAN',brandX,brandY-3,mobile?23:28,'#143e49',1000);txt('FRONTIER DUEL',brandX,brandY+15,9,'#194a52',900);
    button('menu',menu?'×':'☰',width-margin-40,margin,40,36);
    const scoreW=mobile?136:155,sy=mobile?65:75;
    for(let p=0;p<2;p++){let x=mobile?(p?width-margin-scoreW:margin):margin,y=sy+(mobile?0:p*48);panel(x,y,scoreW,40,12,'#143f49ed','#d9ffef88');panel(x+7,y+6,29,28,8,p?'#e9764d':'#369fe4');txt(p?'R':'Y',x+21.5,y+20,17,'#fff6d7',1000,'center');txt(p?'Rival':'You',x+44,y+20,14);txt(state.points[p]+' VP',x+scoreW-9,y+20,13,'#ffdc87',900,'right')}
    if(!mobile){txt('FIRST TO 10 VP',margin+6,sy+104,10,'#22535c',850)}
    const y=height-(mobile?154:106),trayW=mobile?width-margin*2:Math.min(405,width*.37),rH=mobile?44:65;
    panel(margin,y,trayW,rH,14,'#153f49f5','#a7ecdd');if(!mobile)txt('YOUR RESOURCES',margin+14,y+13,10,'#bddecd',900);
    for(let i=0;i<5;i++){let rx=margin+8+i*(trayW-16)/5,rw=(trayW-16)/5;resourceIcon(i,rx+rw*.26,y+(mobile?17:34),mobile?.88:1.06);txt(String(state.res[i]),rx+rw*.59,y+(mobile?17:34),17);txt(['Lumber','Brick','Wool','Grain','Ore'][i],rx+rw*.48,y+(mobile?35:54),9,'#ddeddf',700,'center');if(i>0){ctx.fillStyle='#ffffff26';ctx.fillRect(rx-2,y+(mobile?11:30),1,20)}}
    const tw=mobile?width-margin*2:Math.min(390,width*.42),tx=width-margin-tw,ty=mobile?height-102:height-123;
    panel(tx,ty,tw,82,15,'#fff4d4','#ffffffaf');txt('TURN '+String(state.turn).padStart(2,'0'),tx+13,ty+15,10,'#62736b',900);txt(state.title,tx+13,ty+41,mobile?18:21,'#21444a',950);
    if(!mobile){pip(diceValues[0],tx+14,ty+55,18);pip(diceValues[1],tx+36,ty+55,18)}
    const bw=mobile?128:136;button('action',state.action,tx+tw-bw-10,ty+14,bw,48,'#f3b74d','#263f3d',15,state.disabled);
    const cmds=[['build','Build'],['trade','Trade'],['raid',state.mode==='raid'?'Cancel raid':'Raid']];let cw=mobile?65:78,ay=mobile?y-43:y-46;
    cmds.forEach(([id,label],i)=>button(id,label,margin+i*(cw+6),ay,cw,34,id==='raid'?'#995137':'#234c54','#fff6dc',13,id==='raid'&&state.raidDisabled));
    const msg=state.hint;if(state.mode||state.moving||state.rolled){let my=mobile?ay-25:height-162;let max=mobile?width-20:Math.min(480,width*.48);let x=mobile?width/2:width/2+40;ctx.font=f(12);let sw=Math.min(max,ctx.measureText(msg).width+24);panel(x-sw/2,my-13,sw,26,12,'#16434be8');txt(msg,x,my,12,'#fff7d7',750,'center')}
    if(!mobile){txt('Drag to orbit   ·   Scroll to zoom',width/2,height-16,11,'#205860',750,'center')}
    if(menu){const items=[['rules','Rulebook'],['legend','Island legend'],['log','Match log'],['sound',state.muted?'Sound: off':'Sound: on'],['resetCam','Reset camera'],['settings','New match']];items.forEach(([id,label],i)=>button(id,label,width-margin-148,margin+45+i*38,148,33))}
    keys=buttons.map(b=>b.id).concat(pick.map(m=>m.userData.key)); texture.needsUpdate=true;
  }
  const dieGroups=[new T.Group(),new T.Group()];dieGroups.forEach(d=>scene.add(d));
  const pipPositions=[[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
  function dieFace(p,n,pos,rot){const face=group(p,...pos);face.rotation.set(...rot);for(const k of pipPositions[n-1]){let dot=cyl(face,0x203e49,(k%3-1)*.17,.003,(Math.floor(k/3)-1)*.17,.045,.009,12)}}
  dieGroups.forEach((p,i)=>{shape(p,'die',()=>new RoundedBoxGeometry(.7,.7,.7,3,.09),0xfff5d7,0,0,0);dieFace(p,1,[0,.35,0],[0,0,0]);dieFace(p,6,[0,-.35,0],[Math.PI,0,0]);dieFace(p,2,[0,0,.35],[Math.PI/2,0,0]);dieFace(p,5,[0,0,-.35],[-Math.PI/2,0,0]);dieFace(p,3,[.35,0,0],[0,0,-Math.PI/2]);dieFace(p,4,[-.35,0,0],[0,0,Math.PI/2]);batch(p);p.visible=false});
  function frameCam(){const a=width/height,mobile=width<670;const span=Math.max(mobile?13:11.8,(mobile?14.8:17.5)/a)/zoom;cam.left=-span*a/2;cam.right=span*a/2;cam.top=span/2;cam.bottom=-span/2;cam.near=.1;cam.far=180;cam.position.set(Math.sin(angle)*Math.cos(pitch)*38,Math.sin(pitch)*38,Math.cos(angle)*Math.cos(pitch)*38);cam.lookAt(0,0,0);cam.updateProjectionMatrix();cam.updateMatrixWorld();const shift=mobile?-.025:.02;cam.setViewOffset(width,height,0,height*shift,width,height)}
  function resize(){width=host.clientWidth;height=host.clientHeight;renderer.setSize(width,height,false);const ratio=Math.min(devicePixelRatio,2);hudCanvas.width=Math.round(width*ratio);hudCanvas.height=Math.round(height*ratio);frameCam();paint()}
  function hitDisk(x,z,key,r,tile=false){const m=cyl(markers,tile?0xffdb56:0xffff98,x,tile?.045:.65,z,r,.06,tile?6:16);m.userData.key=key;if(tile){m.material=new T.MeshBasicMaterial({color:0xffdb58,transparent:true,opacity:.31,depthWrite:false});highlight.push(m.material);const ring=new T.Mesh(new T.RingGeometry(r*.93,r,6,1,Math.PI/2),new T.MeshBasicMaterial({color:0xffe46d,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.09,z);markers.add(ring)}pick.push(m)}
  function update(s){state=s;diceValues=s.dice;pieces.clear();markers.traverse(o=>{if(o.geometry?.type==='RingGeometry'){o.geometry.dispose();o.material.dispose()}});markers.clear();highlight.forEach(m=>m.dispose());highlight=[];pick=[];
    for(const [id,p] of Object.entries(s.roads)){const [u,v]=edges[id].map(i=>vs[i]),m=box(pieces,player[p],(u.x+v.x)/2,.105,(u.z+v.z)/2,1.16,.16,.16);m.rotation.y=-Math.atan2(v.z-u.z,v.x-u.x)}
    for(const [id,[p,n]] of Object.entries(s.owns)){let {x,z}=vs[id];hut(pieces,x,z,player[p],n===2)}
    const rp=ts[s.robber];cyl(pieces,0x394653,rp.x,.24,rp.z+.1,.19,.46,10,.62);ball(pieces,0x48596a,rp.x,.52,rp.z+.1,.14);cyl(pieces,0x293e4b,rp.x,.05,rp.z+.1,.23,.09,12);
    if(s.mode==='raid'||s.moving){s.locations.forEach(i=>hitDisk(ts[i].x,ts[i].z,'tile:'+i,1.43,true))}
    else if(s.mode){s.locations.forEach(id=>{let v=vs[id];if(s.mode==='Road'){const [a,b]=edges[id].map(i=>vs[i]);v={x:(a.x+b.x)/2,z:(a.z+b.z)/2}}hitDisk(v.x,v.z,'place:'+id,.25)})}
    pieces.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});const stamp=s.turn+':'+s.rolled;if(s.rolled&&stamp!==rollingStamp){rollTime=1.45;dieGroups.forEach(d=>d.visible=true)}rollingStamp=stamp;paint();
  }
  function click(id){if(id==='menu'){menu=!menu;paint();return}if(id==='resetCam'){targetYaw=-.18;pitch=.81;zoom=1;menu=false;frameCam();paint();return}menu=false;paint();activate(id)}
  function hudAt(x,y){return buttons.findLast(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)?.id}
  function at(x,y){const hud=hudAt(x,y);if(hud)return hud;pointer.set(2*x/width-1,1-2*y/height);ray.setFromCamera(pointer,cam);return ray.intersectObjects(pick,false)[0]?.object.userData.key}
  canvas.addEventListener('pointerdown',e=>{canvas.focus();pressed={x:e.clientX,y:e.clientY,ax:e.clientX,ay:e.clientY,ui:hudAt(e.clientX,e.clientY)};drag=false;canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(pressed&&!pressed.ui){if(Math.hypot(e.clientX-pressed.ax,e.clientY-pressed.ay)>5)drag=true;if(drag){targetYaw-=(e.clientX-pressed.x)*.008;pitch=T.MathUtils.clamp(pitch+(e.clientY-pressed.y)*.003,.55,1.25);pressed.x=e.clientX;pressed.y=e.clientY;frameCam()}}const id=at(e.clientX,e.clientY)||'';if(id!==hover){hover=id;paint()}canvas.style.cursor=id?'pointer':drag?'grabbing':'grab'});
  canvas.addEventListener('pointerup',e=>{if(pressed&&!drag){const id=at(e.clientX,e.clientY);if(id)click(id)}pressed=null;drag=false});canvas.addEventListener('pointercancel',()=>pressed=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=T.MathUtils.clamp(zoom*Math.exp(-e.deltaY*.001),.74,1.65);frameCam()},{passive:false});
  canvas.tabIndex=0;canvas.setAttribute('aria-label','3D Catan island. Drag to orbit, scroll to zoom. Use the adjacent game controls for keyboard play.');
  function animate(time){requestAnimationFrame(animate);if(document.hidden||!document.getElementById('arena').hidden)return;const dt=Math.min((time-last)/1000,.075);last=time;angle+=(targetYaw-angle)*Math.min(1,dt*12);frameCam();boats.forEach((q,i)=>{q.position.y=-.48+Math.sin(time*.0018+i)*.035;q.rotation.z=Math.sin(time*.0012+i)*.035});spinning.forEach(q=>q.rotateZ(dt*.5));highlight.forEach(m=>m.opacity=.24+.12*Math.sin(time*.003));
    if(rollTime>0){rollTime=Math.max(0,rollTime-dt);dieGroups.forEach((q,i)=>{let t=1.45-rollTime,k=Math.min(t/.85,1),spin=1-k;const rot=[[0,0],[ -Math.PI/2,0],[0,Math.PI/2],[0,-Math.PI/2],[Math.PI/2,0],[Math.PI,0]][diceValues[i]-1];q.position.set(i*.96-.48,.45+Math.abs(Math.sin(k*Math.PI*2.1))*spin*2,5.5);q.rotation.set(rot[0]+spin*7,spin*4+.16*i,rot[1]+spin*8);if(!rollTime)q.visible=false})}
    renderer.clear();renderer.render(scene,cam);renderer.clearDepth();renderer.render(hudScene,hudCam)}
  scene.background=new T.Color(0x54c8d2);resize();addEventListener('resize',resize);requestAnimationFrame(animate);return {update}
}
