import * as T from 'three';
import {layouts} from './cover.mjs';
const paint={forest:[0xa5d683,0x835637],hills:[0xe9bc92,0xb45b46],pasture:[0xc4e38b,0x507e54],fields:[0xe8db83,0xbd913f],mountains:[0xb7c7ae,0x727d9e],desert:[0xf3df9d,0]};
const hex=new T.CylinderGeometry(1.48,1.48,.32,6),block=new T.BoxGeometry();
const materials=new Map();
function material(color){if(!materials.has(color))materials.set(color,new T.MeshLambertMaterial({color}));return materials.get(color)}
export function makeTerrain(parent,tile,id,center){
 const [ground,cover]=paint[tile.t],base=new T.Mesh(hex,material(ground));
 base.position.set(center.x,-.16,center.z);parent.add(base);
 for(const [a,b,c,d,width] of layouts[tile.t]){
 const wall=new T.Mesh(block,material(cover)),height=tile.t==='mountains'?.35:.21;
 wall.position.set(center.x+(a+c)/32,height/2,center.z+(b+d)/32);
 wall.scale.set((Math.hypot(c-a,d-b)+width*.55)/16,height,width/16);
 wall.rotation.y=-Math.atan2(d-b,c-a);parent.add(wall)
 }
 return {ready:Promise.resolve(),surface:()=>0}
}
