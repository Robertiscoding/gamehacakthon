import {tiles} from './dist/map.mjs';
export const wheat={halfWidth:14,halfDepth:10,offsetZ:-2};
export const sites=tiles.map((t,i)=>{
 const x=(t.x-370)*16/36,z=(t.y-228)*16/36;
 const layout=tiles.slice(0,i).filter(v=>v.t==='forest').length%4;
 const angle=[.35,1.2,2.3,-.65][layout],offset=[5,-7,6,-5][layout];
 const trees=Array.from({length:7},(_,j)=>({x:x+Math.cos(angle)*offset-Math.sin(angle)*(j-3)*2.8,z:z+Math.sin(angle)*offset+Math.cos(angle)*(j-3)*2.8}));
 return {x,z,type:t.t,trees}
});
const woods=sites.filter(s=>s.type==='forest').flatMap(s=>s.trees);
export const mines=sites.filter(s=>s.type==='hills');
export function mineAt(x,z){return mines.find(s=>Math.abs(s.x-x)<4&&Math.abs(s.z-5-z)<4)}
export function hiddenAt(x,z){return !!mineAt(x,z)||sites.some(s=>s.type==='fields'&&Math.abs(x-s.x)<wheat.halfWidth&&Math.abs(z-s.z-wheat.offsetZ)<wheat.halfDepth)}
export function altitude(x,z){for(const s of sites)if(s.type==='mountains'){const r=Math.hypot(x-s.x,z-s.z+4);if(r<15)return (15-r)*.55}return 0}
export function treeAt(x,z,pad=0){return woods.some(v=>(v.x-x)**2+(v.z-z)**2<(1.9+pad)**2)}
export function screened(a,b){const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));for(let i=0;i<=n;i++)if(treeAt(a.x+(b.x-a.x)*i/(n||1),a.z+(b.z-a.z)*i/(n||1)))return true;return false}
const pasture=sites.filter(s=>s.type==='pasture');
export function flock(time){
 return pasture.flatMap((s,i)=>[-1,1].map(side=>{
   const phase=time*.65+i+side*.55;
   return {x:s.x+8*Math.sin(phase),z:s.z+side*4+2*Math.cos(phase),yaw:Math.atan2(8*Math.cos(phase),-2*Math.sin(phase))}
 }))
}
