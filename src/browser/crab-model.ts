// SPDX-License-Identifier: Apache-2.0
// Original articulated crustacean: continuous 3D limbs and procedural shell.
import * as T from 'three';
import {clamp,rand,smooth} from '../engine/math';
type V3=[number,number,number];
const up=new T.Vector3(0,1,0);
export function createCrab(){
 const root=new T.Group(),shellGroup=new T.Group();root.add(shellGroup);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(1024,512);
 for(let y=0;y<512;y++)for(let x=0;x<1024;x++){
  const i=(y*1024+x)*4,cloud=Math.sin(x*.047+Math.cos(y*.035)*3)*Math.cos(y*.059+x*.013),grain=rand(x+y*1024+172),speck=grain>.96?-.38:grain<.09?.15:0;
  const a=clamp(.42+cloud*.16+(grain-.5)*.11+speck),edge=Math.sin(y/512*Math.PI);
  pixels.data[i]=Math.round(68+a*106+edge*24);pixels.data[i+1]=Math.round(32+a*65);pixels.data[i+2]=Math.round(21+a*44);pixels.data[i+3]=255;
 }
 ctx.putImageData(pixels,0,0);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const shell=new T.MeshPhysicalMaterial({map:texture,color:0x706449,roughness:.48,metalness:.02,clearcoat:.4,clearcoatRoughness:.36,bumpMap:texture,bumpScale:.038});
 const legMat=new T.MeshPhysicalMaterial({map:texture,color:0xc3a48a,roughness:.52,clearcoat:.25,clearcoatRoughness:.42,bumpMap:texture,bumpScale:.022});
 const pale=new T.MeshPhysicalMaterial({color:0x5e3e29,roughness:.59}),dark=new T.MeshPhysicalMaterial({color:0x151914,roughness:.18,clearcoat:1});
 const sphere=new T.SphereGeometry(1,48,28),segment=new T.CylinderGeometry(.56,1,1,18,8);
 const ellipsoid=(at:V3,scale:V3,mat:T.Material,parent:T.Object3D=shellGroup)=>{const mesh=new T.Mesh(sphere,mat);mesh.position.set(...at);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const carapace=ellipsoid([0,.81,0],[.9,.205,.57],shell);
 // A shallow front notch and unequal lobes keep the shell from reading as a ball.
 const positions=carapace.geometry.attributes.position;
 const shellGeometry=new T.SphereGeometry(1,96,48),vertices=shellGeometry.attributes.position;
 for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),fold=Math.sin(x*16)*.014*Math.max(0,z);const pore=(Math.sin(x*91+z*37)*Math.cos(z*87-x*19)+Math.sin(z*131+x*73)*.5)*.013*Math.max(0,y);vertices.setXYZ(i,x*(1+Math.sin(z*8)*.035),y+fold+pore,z*(1-Math.max(0,z)*.09));}
 shellGeometry.computeVertexNormals();carapace.geometry=shellGeometry;
 ellipsoid([0,.71,0],[.78,.12,.49],pale);ellipsoid([0,.74,.48],[.33,.08,.13],legMat);
 const cone=(at:V3,end:V3,r:number,parent:T.Object3D=shellGroup)=>{const a=new T.Vector3(...at),b=new T.Vector3(...end),mesh=new T.Mesh(new T.ConeGeometry(r,a.distanceTo(b),9),shell);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(up,b.sub(a).normalize());mesh.castShadow=true;parent.add(mesh);};
 for(const sign of [-1,1])for(let i=0;i<9;i++){
  const z=-.4+i*.092,x=sign*.86*Math.sqrt(Math.max(.1,1-(z/.66)**2));cone([x,.8,z],[x+sign*(.07+Math.sin(i/8*Math.PI)*.1),.81,z+.025],.043);
 }
 // Small dark eyes on real stalks, antennae and segmented mouthparts.
 const lineSegment=(a:V3,b:V3,r:number,mat:T.Material=legMat,parent:T.Object3D=shellGroup)=>{const from=new T.Vector3(...a),to=new T.Vector3(...b),mesh=new T.Mesh(segment,mat);mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(up,to.sub(from).normalize());mesh.scale.set(r,from.distanceTo(new T.Vector3(...b)),r*.84);mesh.castShadow=true;parent.add(mesh);return mesh;};
 for(const sign of [-1,1]){lineSegment([sign*.25,.83,.44],[sign*.38,1.02,.65],.024,pale);ellipsoid([sign*.38,1.02,.65],[.027,.025,.026],dark);lineSegment([sign*.13,.78,.54],[sign*.18,.8,.89],.007,pale);for(let i=0;i<4;i++)ellipsoid([sign*(.055+i*.035),.72,.55+i*.02],[.035,.065,.028],legMat);}
 const legs:{side:number;index:number;pieces:T.Mesh[];joints:T.Mesh[];wire:T.Line}[]=[];
 const wireMat=new T.LineBasicMaterial({color:0xe6e9dc,transparent:true,opacity:0,depthTest:false});
 const wireRoot=new T.Group();root.add(wireRoot);
 const shellWire=new T.LineSegments(new T.WireframeGeometry(shellGeometry),wireMat);shellWire.position.copy(carapace.position);shellWire.scale.copy(carapace.scale);wireRoot.add(shellWire);
 for(const side of [-1,1])for(let index=0;index<4;index++){
  const pieces=[0,1,2].map(i=>{const m=lineSegment([0,0,0],[0,1,0],.05,legMat,root);if(i===2)m.geometry=new T.ConeGeometry(1,1,14);return m;}),joints=[0,1,2].map(()=>ellipsoid([0,0,0],[.043,.043,.043],legMat,root));
  const wire=new T.Line(new T.BufferGeometry().setFromPoints([0,1,2,3].map(()=>new T.Vector3())),wireMat);wireRoot.add(wire);legs.push({side,index,pieces,joints,wire});
 }
 const claws:{side:number;upper:T.Mesh;lower:T.Mesh;palm:T.Mesh;finger:T.Group}[]=[];
 for(const side of [-1,1]){
  const upper=lineSegment([0,0,0],[0,1,0],.075),lower=lineSegment([0,0,0],[0,1,0],.09),palm=ellipsoid([0,0,0],[.22,.14,.32],legMat),finger=new T.Group();shellGroup.add(finger);
  palm.geometry=sphere.clone().scale(.22,.14,.32);palm.scale.set(1,1,1);
  // Curved tapered pincers, with small interlocking inner teeth.
  const curve=(points:V3[],r:number,parent:T.Object3D)=>{const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),geometry=new T.TubeGeometry(path,22,r,10,false),a=geometry.attributes.position;for(let i=0;i<a.count;i++){const u=Math.floor(i/11)/22,center=path.getPointAt(u),scale=1-u*u*.97;a.setXYZ(i,center.x+(a.getX(i)-center.x)*scale,center.y+(a.getY(i)-center.y)*scale,center.z+(a.getZ(i)-center.z)*scale);}geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,legMat);mesh.castShadow=true;parent.add(mesh);};
  curve([[0,0,0],[-.09,0,.17],[-.08,0,.38],[.015,.005,.49]],.052,palm);
  curve([[0,0,0],[.12,0,.17],[.11,0,.34],[.01,0,.46]],.043,finger);
  for(let i=0;i<5;i++){cone([-.05,0,.13+i*.052],[.015,0,.15+i*.052],.018,palm);cone([.07,0,.13+i*.052],[.015,0,.15+i*.052],.014,finger);}
  claws.push({side,upper,lower,palm,finger});
 }
 const orient=(mesh:T.Mesh,a:V3,b:V3,r1:number,r2=r1)=>{const from=new T.Vector3(...a),to=new T.Vector3(...b);mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(up,to.clone().sub(from).normalize());mesh.scale.set(r1,from.distanceTo(to),r2);};
 function animate(phase:number,energy:number,wire:number){
  const bob=Math.cos(phase*Math.PI*2)*.012;shellGroup.position.y=bob;
  for(const leg of legs){
   const {side,index}=leg,p=((phase*.5+(index%2)*.5+(side<0?.5:0))%1+1)%1,stance=.64,footX=p<stance?.16*(1-2*p/stance):-.16+.32*smooth((p-stance)/(1-stance)),lift=p<stance?0:Math.sin(Math.PI*(p-stance)/(1-stance))**2*.19;
   const z=(index-1.5)*.3,spread=[.42,.17,-.2,-.48][index];
   const foot=new T.Vector3(side*(1.83+index*.04)+footX,lift+.015,z+spread*1.17),origin=new T.Vector3(side*.68,.71+bob,z),ankle=foot.clone().add(new T.Vector3(-side*.08,.16,0));
   const direction=ankle.clone().sub(origin),distance=Math.min(1.749,Math.max(.02,direction.length()));direction.normalize();
   const along=(.78*.78-.97*.97+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,.78*.78-along*along)),pole=new T.Vector3(0,1,0).addScaledVector(direction,-direction.y).normalize(),knee=origin.clone().addScaledVector(direction,along).addScaledVector(pole,height);
   const points:V3[]=[origin.toArray(),knee.toArray(),ankle.toArray(),foot.toArray()] as V3[];
   for(let i=0;i<3;i++){orient(leg.pieces[i],points[i],points[i+1],.065-i*.018,.045-i*.012);leg.joints[i].position.set(...points[i]);}
   const a=leg.wire.geometry.attributes.position;points.forEach((p,i)=>a.setXYZ(i,...p));a.needsUpdate=true;
  }
  for(const claw of claws){const s=claw.side,reach=Math.sin(phase*Math.PI*.5+s)*.035;
   const a:V3=[s*.53,.73,.34],b:V3=[s*1.02,.61+reach,.71],c:V3=[s*.92,.54+reach,1.14];
   orient(claw.upper,a,b,.075);orient(claw.lower,b,c,.06);claw.palm.position.set(...c);claw.palm.rotation.set(-.12,s*.22,s*.12);claw.finger.position.set(c[0]+s*.065,c[1],c[2]+.1);claw.finger.rotation.set(-.09,s*(.22+energy*.16),0);
  }
  wireMat.opacity=wire*.72;root.traverse(obj=>{if(obj instanceof T.Mesh){const mats=Array.isArray(obj.material)?obj.material:[obj.material];for(const mat of mats){mat.transparent=true;mat.opacity=1-wire*.87;}}});
 }
 return {root,animate,dispose(){root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});texture.dispose();shell.dispose();legMat.dispose();pale.dispose();dark.dispose();wireMat.dispose();}};
}
