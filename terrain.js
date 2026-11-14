import * as T from 'three';
import {placeAsset,assetReady} from './assets.js';

const settings={
 forest:[.33,['forest-pine','forest-pine','forest-pine','forest-logpile','forest-stump','forest-fern']],
 fields:[.20,['fields-wheat','fields-wheat','fields-wheat','fields-cart','fields-haybale','fields-scarecrow']],
 pasture:[.30,['pasture-oak','pasture-sheep','pasture-sheep','pasture-fence','pasture-trough']],
 hills:[.53,['hills-claybank','hills-kiln','hills-brickpile','hills-wheelbarrow']],
 mountains:[.72,['mountains-crag','mountains-crag','mountains-scree','mountains-crystal','mountains-orecart']],
 desert:[.40,['desert-dune','desert-palm','desert-cactus','desert-arch']]
};
const sizes={
 'forest-pine':[.48,.87,.45],'forest-stump':[.18,.13,.18],'forest-logpile':[.34,.19,.23],'forest-fern':[.24,.18,.24],
 'fields-wheat':[.35,.42,.32],'fields-cart':[.36,.30,.28],'fields-haybale':[.30,.16,.19],'fields-scarecrow':[.20,.44,.13],
 'pasture-oak':[.64,.72,.57],'pasture-sheep':[.23,.20,.16],'pasture-fence':[.48,.18,.06],'pasture-trough':[.30,.15,.15],
 'hills-claybank':[.62,.47,.48],'hills-kiln':[.45,.52,.41],'hills-brickpile':[.33,.16,.26],'hills-wheelbarrow':[.27,.22,.31],
 'mountains-crag':[.65,.90,.57],'mountains-scree':[.38,.20,.36],'mountains-crystal':[.22,.34,.23],'mountains-orecart':[.36,.23,.25],
 'desert-dune':[.68,.28,.51],'desert-palm':[.46,.73,.44],'desert-cactus':[.21,.35,.18],'desert-arch':[.48,.52,.23]};
const sockets=[[-.55,-.56],[.46,-.56],[-.84,.12],[.85,.08],[-.53,.46],[.43,.38]];
export function hexExtent(x,z){return Math.max(Math.abs(x)/1.29904,(Math.abs(z)+Math.abs(x)/Math.sqrt(3))/1.5)}
import {garden} from './garden.js';
export function makeTerrain(parent,tile,id,center){
 const terrain=new T.Group();terrain.position.set(center.x,0,center.z);parent.add(terrain);
 const tint={forest:0xa4d67c,fields:0xe8de82,pasture:0xc4e37c,mountains:0xb2d39a,hills:0xe0c685,desert:0xf1df98}[tile.t];
 const base=new T.Mesh(new T.CylinderGeometry(1.49,1.49,.06,6),new T.MeshStandardMaterial({color:tint,roughness:.93}));
 base.position.y=-.03;base.receiveShadow=true;terrain.add(base);
 const side=new T.Mesh(new T.CylinderGeometry(1.496,1.47,.47,6),new T.MeshStandardMaterial({color:0x8389c8,roughness:1}));side.position.y=-.246;terrain.add(side);
 garden(terrain,id,tile.t);const ready=Promise.resolve();terrain.updateWorldMatrix(true,true);
 const ray=new T.Raycaster(),origin=new T.Vector3(),down=new T.Vector3(0,-1,0);
 function surface(x,z){origin.set(x+center.x,4,z+center.z);ray.set(origin,down);return ray.intersectObject(base,true)[0]?.point.y??.01}
 const props=settings[tile.t][1].map((slug,i)=>{
   const socket=sockets[(i+id%2)%sockets.length];const x=socket[0]+.06*Math.sin(id+i),z=socket[1]+.06*Math.cos(id-i);
   const size=sizes[slug];const object=placeAsset(terrain,slug,[x,0,z],size,id*.27+i*.45);
   return {object,x,z,size,slug};
 });
 const finished=Promise.all([ready,...props.map(p=>assetReady(p.object))]).then(()=>{props.forEach(p=>p.object.position.y=surface(p.x,p.z)-.012);terrain.updateWorldMatrix(true,true)});
 finished.catch(()=>{});
 return {terrain,base,surface,props,ready:finished};
}
