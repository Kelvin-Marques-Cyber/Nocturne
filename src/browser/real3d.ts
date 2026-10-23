// SPDX-License-Identifier: Apache-2.0
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import type {Project} from '../engine/model';
import {real3DScene,real3DState} from '../engine/real3d-plan';
import {createCrab} from './crab-model';
/** Shared preview/export renderer. No state is integrated over elapsed time. */
export class Real3DRenderer{
 readonly renderer:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.PerspectiveCamera(34,1,.05,100);
 private crab=createCrab();private environment:T.WebGLRenderTarget;private width=0;private height=0;
 constructor(readonly canvas:HTMLCanvasElement){
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.95;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.scene.background=new T.Color('#242a2b');this.scene.fog=new T.Fog('#242a2b',8,19);
  const pmrem=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.04);this.scene.environment=this.environment.texture;room.dispose();pmrem.dispose();
  const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0x41484a,roughness:.75,metalness:.08}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.scene.add(floor,this.crab.root);
  const light=new T.DirectionalLight(0xffe5ce,3.2);light.position.set(-3,5,4);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-4;light.shadow.camera.right=4;light.shadow.camera.top=4;light.shadow.camera.bottom=-4;light.shadow.normalBias=.015;light.shadow.bias=-.0001;light.shadow.radius=3;this.scene.add(light);
  const rim=new T.DirectionalLight(0xc3e2f5,2);rim.position.set(3,2,-3);this.scene.add(rim,new T.HemisphereLight(0xe5eeee,0x34322d,.65));
 }
 render(p:Project,t:number,width:number,height:number){
  const s=real3DScene(p,t);if(!s)return false;
  if(width!==this.width||height!==this.height){this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.width=width;this.height=height;}
  const state=real3DState(p,s,t);this.crab.animate(state.phase,state.energy,state.wire);this.crab.root.rotation.y=state.yaw;
  const x=state.travel*Math.cos(state.yaw),z=-state.travel*Math.sin(state.yaw);this.crab.root.position.set(x,0,z);
  const portrait=height>width,distance=(portrait?13.8:5.6)*(1-state.close),angle=.25+state.q*.33;
  this.camera.position.set(x+Math.sin(angle)*distance,portrait?3.9:2.5,z+Math.cos(angle)*distance);this.camera.lookAt(x,portrait?1.2:.64,z);this.renderer.render(this.scene,this.camera);return true;
 }
 dispose(){this.crab.dispose();this.environment.dispose();this.scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)m.dispose();}});this.renderer.dispose();this.renderer.forceContextLoss();}
}
