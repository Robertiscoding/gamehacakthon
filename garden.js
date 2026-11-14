import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const materials=new Map(), shapes=new Map();
function part(parent,key,create,color,x,y,z,w,h,d){
 if(!shapes.has(key))shapes.set(key,create());
 if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.95,flatShading:true}));
 const mesh=new T.Mesh(shapes.get(key),materials.get(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
const rock=(p,c,x,y,z,w,h,d)=>part(p,'rock',()=>new T.CylinderGeometry(.87,1,1,8),c,x,y,z,w,h,d);
const box=(p,c,x,y,z,w,h,d)=>part(p,'box',()=>new RoundedBoxGeometry(1,1,1,1,.065),c,x,y,z,w,h,d);
const orb=(p,c,x,y,z,w,h,d)=>part(p,'orb',()=>new T.SphereGeometry(1,12,9),c,x,y,z,w,h,d);
export function garden(parent,id,t){
 const p=new T.Group();parent.add(p);
 for(let k=0;k<6;k++){const a=k*2.399+id,r=.45+.55*(k%3)/2;rock(p,k%2?0xd9df8a:0xb1cf7e,Math.cos(a)*r,.0015,Math.sin(a)*r,.075+k*.006,.004,.033+k*.006)}
 if(id%3!==1){const x=-.77,z=-.18;rock(p,0x898ad0,x,.10,z,.36,.21,.29);rock(p,0xa7b1ed,x,.215,z,.32,.07,.25);rock(p,0x9fd886,x,.257,z,.28,.035,.215)}
 if(t==='forest'||t==='pasture'||id===9){for(let k=0;k<3;k++){const x=.57+k*.105,z=.52-Math.sin(k)*.15,h=.43+k*.14;rock(p,0x77bd64,x,h/2,z,.052,h,.052);for(let j=1;j<=3;j++)rock(p,0xaad976,x,h*j/3-.025,z,.059,.019,.059);const leaf=orb(p,0x4c9e66,x-.04,h*.6,z,.105,.026,.035);leaf.rotation.z=-.58}}
 if(id%4===0){const q=new T.Group();p.add(q);q.position.set(.65,0,-.32);q.rotation.y=.25;box(q,0x79517e,0,.13,0,.25,.26,.24);box(q,0xb4838c,0,.269,0,.22,.018,.21);for(const v of [-.08,.08])box(q,0x945f72,v,.28,0,.02,.012,.20)}
}
export function adventurer(parent,p){
 const q=new T.Group();parent.add(q);const suit=p?0xf06983:0x43cfd5;
 orb(q,suit,0,1.52,0,.93,1.32,.68);
 for(const s of [-1,1]){orb(q,0x37405c,s*.44,.27,.12,.25,.29,.34);orb(q,suit,s*.92,1.36,0,.24,.28,.23);orb(q,0x30334a,s*.28,1.7,.635,.11,.14,.075)}
 rock(q,p?0x8958a0:0x427aa5,0,2.64,0,1.03,.16,.84);orb(q,p?0xffca65:0xf5d278,0,2.83,0,.68,.41,.6);
 box(q,p?0xef6782:0x5696bc,0,2.68,0,1.26,.15,1.03);return q;
}
