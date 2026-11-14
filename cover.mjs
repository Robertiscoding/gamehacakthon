import {tiles} from './dist/map.mjs';
// Endpoints and widths in harvest world units. Each tile repeats its resource silhouette.
export const layouts={
 hills:[[-15,-11,0,-19,2.5],[0,-19,15,-11,2.5]],
 forest:[[-10,-10,6,-10,3]],
 fields:[[-12,-10,-7,-10,5],[3,-10,8,-10,5]],
 pasture:[[-11,-13,-11,2,1.6]],
 mountains:[[4,-11,8,-11,8]],
 desert:[]
};
const segments=tiles.flatMap(t=>layouts[t.t].map(([a,b,c,d,width])=>{
 const x=(t.x-370)*16/36,z=(t.y-228)*16/36;
 return {x:x+a,z:z+b,dx:c-a,dz:d-b,width}
}));
export function blocked(x,z,pad=0){
 return segments.some(s=>{
 const a=x-s.x,b=z-s.z,t=Math.max(0,Math.min(1,(a*s.dx+b*s.dz)/(s.dx*s.dx+s.dz*s.dz)));
 return (a-t*s.dx)**2+(b-t*s.dz)**2<(s.width/2+pad)**2
 })
}
export function clearLine(a,b){
 const count=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.75);
 for(let i=1;i<=count;i++)if(blocked(a.x+(b.x-a.x)*i/count,a.z+(b.z-a.z)*i/count))return false;
 return true
}
