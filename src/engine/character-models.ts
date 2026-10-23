// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Character,Point} from './model';
import type {Pose,solveRig} from './rig';
import {clamp,esc,ik,mix,n,pt,smooth} from './math';

/** Three independently drawn bodies share the same continuous, planted skeleton.
 * Every visible limb starts at its solved joint, including the far-side limbs.
 * The head stays attached to the torso; looking never deforms its outline. */
export function renderCharacterModel(p:Pose,c:Character,accent:string,pulse:number,ghost:boolean,rig:ReturnType<typeof solveRig>){
 const design=c.design??'line',solid=design==='silhouette',mechanical=design==='mannequin';
 const dx=p.neck[0]-p.hip[0],dy=p.neck[1]-p.hip[1],length=Math.max(1,Math.hypot(dx,dy));
 const up:Point=[dx/length,dy/length],side:Point=[-up[1],up[0]];
 const look=clamp((p.head[0]-p.neck[0])*side[0]+(p.head[1]-p.neck[1])*side[1],-4,4);
 const radius=18*c.head,head:Point=[p.neck[0]+up[0]*(radius+13)+side[0]*look,p.neck[1]+up[1]*(radius+13)+side[1]*look];
 const headBase:Point=[head[0]-up[0]*radius,head[1]-up[1]*radius];
 const path=(root:Point,joint:Point,end:Point,alpha=1,width=c.thickness)=>`<path d="M${pt(root)} L${pt(joint)} L${pt(end)}" opacity="${n(alpha)}" stroke-width="${n(width)}"/>`;
 // A raised hand rotates the elbow outwards instead of sending the forearm
 // through the head. Near the shoulder, projection blends the elbow's depth
 // continuously, avoiding the sudden IK branch flip of the former drawing.
 const arm=(root:Point,solved:[Point,Point],sign:number):[Point,Point]=>{
  const [joint,end]=solved,other=ik(root,end,44,45,sign)[0],distance=Math.hypot(end[0]-root[0],end[1]-root[1]);
  const lifted=smooth((root[1]-end[1]+20)/40),folded=(1-smooth((distance-25)/40))*(other[1]>joint[1]?1:0);
  const depth=Math.max(lifted,folded);
  return [[mix(joint[0],other[0],depth),mix(joint[1],other[1],depth)],end];
 };
 const leftArm=arm(rig.leftShoulder,rig.leftArm,-1),rightArm=arm(rig.rightShoulder,rig.rightArm,1);
 const limbs:[[Point,Point,Point],number][]=[[[rig.leftHip,...rig.leftLeg],.72],[[rig.leftShoulder,...leftArm],.72],[[rig.rightHip,...rig.rightLeg],1],[[rig.rightShoulder,...rightArm],1]];
 const limbWidth=solid?Math.max(6.5,c.thickness*3.1):mechanical?Math.max(2.8,c.thickness*1.4):c.thickness;
 const parts=limbs.map(([points,alpha])=>path(...points,alpha,limbWidth)).join('');
 const body=solid?`<path d="M${pt(p.hip)} L${pt(p.neck)}" stroke-width="${n(limbWidth*1.6)}"/>`:`<path d="M${pt(p.hip)} L${pt(p.neck)}"/>`;
 const connectors=`<path d="M${pt(rig.leftShoulder)} L${pt(rig.rightShoulder)} M${pt(rig.leftHip)} L${pt(rig.rightHip)} M${pt(p.neck)} L${pt(headBase)}" stroke-width="${n(solid?limbWidth*.75:c.thickness)}"/>`;
 const joints=mechanical?limbs.flatMap(([points])=>points.slice(0,2)).map(j=>`<circle cx="${n(j[0])}" cy="${n(j[1])}" r="3.5" fill="#090a0c" stroke-width="1.3"/>`).join(''):'';
 const torso=mechanical?`<path d="M${pt(rig.leftShoulder)} L${pt(rig.rightShoulder)} L${pt(rig.rightHip)} L${pt(rig.leftHip)} Z" fill="${esc(c.stroke)}" fill-opacity=".11" stroke-width="1.2"/>`:'';
 const a=p.rotation*Math.PI/180,points=limbs.flatMap(([ps])=>ps).concat([p.hip,p.neck]);
 const floor=Math.max(0,...points.map(([x,y])=>x*Math.sin(a)+y*p.squash*Math.cos(a)),head[0]*Math.sin(a)+head[1]*p.squash*Math.cos(a)+radius*Math.max(1,p.squash));
 const chest:Point=[mix(p.hip[0],p.neck[0],.7),mix(p.hip[1],p.neck[1],.7)];
 return `<g data-character="${design}" opacity="${ghost?.14:1}" transform="translate(0 ${n(-floor)}) rotate(${n(p.rotation)}) scale(1 ${n(p.squash)})"><g fill="none" stroke="${esc(c.stroke)}" stroke-width="${n(c.thickness)}" stroke-linecap="round" stroke-linejoin="round">${parts}${body}${connectors}${torso}${joints}<circle cx="${n(head[0])}" cy="${n(head[1])}" r="${n(radius)}" fill="${solid?esc(c.stroke):'#090a0c'}"/></g>${c.heart&&!ghost?`<circle cx="${n(chest[0])}" cy="${n(chest[1])}" r="${n(3.5+pulse)}" fill="${esc(accent)}"/>`:''}</g>`;
}
