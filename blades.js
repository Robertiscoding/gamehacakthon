import * as T from 'three';

export function bladeKit(parent, color){
  const group=new T.Group();parent.add(group);
  const metal=new T.MeshStandardMaterial({color:0xfff1aa,metalness:.2,roughness:.43,emissive:0x665225,emissiveIntensity:.25});
  const outline=new T.MeshStandardMaterial({color:0x334252});
  const grip=new T.MeshStandardMaterial({color});
  function prism(points,depth,material){
    const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),material);mesh.rotation.x=Math.PI/2;group.add(mesh);return mesh;
  }
  prism([[-.12,0],[.14,0],[.27,1.13],[.06,1.55],[-.11,1.17]],.06,metal);
  prism([[-.27,-.12],[.28,-.12],[.33,.01],[-.29,.04]],.10,outline);
  prism([[-.08,-.51],[.08,-.51],[.08,-.10],[-.08,-.10]],.09,grip);
  return group;
}
export function returningBlade(){
 const curve=new T.Shape();curve.moveTo(-1.0,.58);curve.lineTo(-.68,-.08);curve.lineTo(0,-.52);curve.lineTo(.68,-.08);curve.lineTo(1,.58);curve.lineTo(0,.02);curve.closePath();
 const m=new T.Mesh(new T.ExtrudeGeometry(curve,{depth:.13,bevelEnabled:false}),new T.MeshStandardMaterial({color:0xffce4f,emissive:0xad631c,emissiveIntensity:.45}));m.rotation.x=-Math.PI/2;
 const group=new T.Group();group.add(m);return group;
}
