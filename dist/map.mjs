const terrains=['forest','pasture','fields','hills','mountains','forest','pasture','fields','hills','desert','mountains','fields','forest','pasture','hills','forest','mountains','fields','pasture'];
const numbers=[5,2,6,3,8,10,9,12,11,0,4,8,10,9,4,5,6,3,11], terrainRes={forest:0,hills:1,pasture:2,fields:3,mountains:4};
const tiles=[],verts=[],edges=[],vmap=new Map(),emap=new Map();const R=54, W=Math.sqrt(3)*R;
for(let r=-2;r<=2;r++)for(let q=Math.max(-2,-r-2);q<=Math.min(2,-r+2);q++){
 const x=370+W*(q+r/2),y=228+1.5*R*r,id=tiles.length,vs=[];
 for(let a=0;a<6;a++){const ang=(a*60-90)*Math.PI/180,vx=x+R*Math.cos(ang),vy=y+R*Math.sin(ang),key=Math.round(vx)+','+Math.round(vy);if(!vmap.has(key)){vmap.set(key,verts.length);verts.push({x:vx,y:vy,tiles:[],edges:[]})}let v=vmap.get(key);verts[v].tiles.push(id);vs.push(v)}
 for(let i=0;i<6;i++){const va=vs[i],vb=vs[(i+1)%6],key=[va,vb].sort((a,b)=>a-b).join();if(!emap.has(key)){let e=edges.length;emap.set(key,e);edges.push([va,vb]);verts[va].edges.push(e);verts[vb].edges.push(e)}}
 tiles.push({x,y,vs,t:terrains[id],n:numbers[id]})
}

export {tiles,verts,edges,terrainRes};
