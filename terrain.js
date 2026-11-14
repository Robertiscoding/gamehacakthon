import * as T from 'three';
import {sites,altitude,wheat} from './landmarks.mjs';
const materials=new Map(),textures=new Map(),loader=new T.TextureLoader();
const box=new T.BoxGeometry(),cone=new T.ConeGeometry(1,1,10),hex=new T.CylinderGeometry(1.49,1.46,.34,6);
function piece(p,shape,color,x,y,z,w,h,d){if(!materials.has(color))materials.set(color,new T.MeshLambertMaterial({color,flatShading:true}));const obj=new T.Mesh(shape,materials.get(color));obj.scale.set(w,h,d);obj.position.set(x,y,z);p.add(obj);return obj}
export function hexExtent(x,z){return Math.max(Math.abs(x)/1.29904,(Math.abs(z)+Math.abs(x)/Math.sqrt(3))/1.5)}
export function makeTerrain(parent,tile,id,center){
 const terrain=new T.Group();terrain.position.set(center.x,0,center.z);parent.add(terrain);
 const base=piece(terrain,hex,0xa48b69,0,-.17,0,1,1,1),site=sites[id];
 if(!textures.has(tile.t)){const map=loader.load('art/'+tile.t+'.png');map.colorSpace=T.SRGBColorSpace;textures.set(tile.t,new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}))}
 const art=new T.Mesh(new T.PlaneGeometry(2.598,3),textures.get(tile.t));art.rotation.x=-Math.PI/2;art.position.y=.008;terrain.add(art);
 const block=(...args)=>piece(terrain,box,...args);
 if(tile.t==='forest')for(const tree of site.trees){const x=(tree.x-site.x)/16,z=(tree.z-site.z)/16;block(0x765137,x,.13,z,.10,.26,.10);piece(terrain,cone,0x246948,x,.39,z,.17,.58,.17);piece(terrain,cone,0x499254,x,.57,z,.12,.37,.12)}
 if(tile.t==='hills'){const z=-5/16;for(const x of [-.24,.24])block(0x875943,x,.17,z,.09,.34,.52);block(0x493a33,0,.17,z-.22,.5,.34,.07);for(const sign of [-1,1])block(0x985239,sign*.145,.4,z,.35,.09,.62).rotation.z=-sign*.33;for(const x of [-.09,.09])block(0x534c49,x,.025,z+.37,.026,.035,.65);for(let i=0;i<4;i++)block(0x996e45,0,.018,z+.17+i*.14,.28,.028,.05)}
 if(tile.t==='fields'){
   const width=wheat.halfWidth/8,depth=wheat.halfDepth/8;
   for(let row=0;row<7;row++){
     const z=wheat.offsetZ/16+((row+.5)/7-.5)*depth;
     block(0xb58838,0,.14,z,width,.28,.12);
     for(let k=0;k<8;k++)piece(terrain,cone,0xf4c455,((k+.5)/8-.5)*width,.32,z,.11,.27,.09)
   }
 }
 if(tile.t==='mountains'){piece(terrain,cone,0x788297,0,.258,-.25,15/16,.516,15/16);piece(terrain,cone,0xf5eedb,0,.45,-.25,.25,.14,.25)}
 // Repeated foliage shares one draw per shape and material on this hex.
 const batches=new Map();
 for(const mesh of terrain.children){
   if(mesh===base||mesh===art)continue;
   const key=mesh.geometry.uuid+mesh.material.uuid;
   if(!batches.has(key))batches.set(key,[]);
   batches.get(key).push(mesh);
 }
 for(const group of batches.values()){
   if(group.length<2)continue;
   const batch=new T.InstancedMesh(group[0].geometry,group[0].material,group.length);
   group.forEach((mesh,i)=>{mesh.updateMatrix();batch.setMatrixAt(i,mesh.matrix);terrain.remove(mesh)});
   batch.computeBoundingSphere();terrain.add(batch)
 }
 return {terrain,base,props:[],surface:(x,z)=>altitude(site.x+x*16,site.z+z*16)/16,ready:Promise.resolve()}
}
