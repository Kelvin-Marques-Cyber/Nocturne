// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {StageContext,Hero,Words} from './stage';
import {newSceneKinds,scenePreset,type NewSceneKind} from './scene-catalog';
import {n,rand,smooth} from './math';

interface Ink {v:number;t:number;q:number;beat:number;a:string;fg:string;bg:string;path:(d:string,accent?:boolean,opacity?:number,width?:number,fill?:string)=>string;circle:(x:number,y:number,r:number,accent?:boolean,opacity?:number,fill?:string)=>string;rect:(x:number,y:number,w:number,h:number,accent?:boolean,opacity?:number,fill?:string)=>string;}
const many=(count:number,draw:(i:number)=>string)=>Array.from({length:count},(_,i)=>draw(i)).join('');
const wave=(d:Ink,y:number,amount=18)=>d.path(`M-30 ${y}Q220 ${n(y+Math.sin(d.t*.6)*amount)} 500 ${y}T1030 ${y}`,false,.24);
const stone=(d:Ink,x:number,y:number,size=40)=>d.path(`M${x-size} ${y}l${size*.3} ${-size*.7} ${size} ${-size*.25} ${size*.8} ${size*.6} ${-size*.1} ${size*.35}Z`,false,.5,1.5,d.bg);
const plant=(d:Ink,x:number,y:number,height=180)=>{
 const sway=Math.sin(d.t*.7+x)*9;
 return d.path(`M${x} ${y}Q${x+12} ${y-height*.6} ${n(x+sway)} ${y-height}`,false,.55)+d.path(`M${x+3} ${y-height*.4}q-80 -80 -85 -35q20 50 85 35 M${x+5} ${y-height*.64}q80 -75 90 -30q-30 45 -90 30`,true,.55);
};
const trees=(d:Ink,count=5)=>many(count,i=>{const x=60+i*900/Math.max(1,count-1),height=190+rand(i*43)*130;return d.path(`M${x} 0v${-height}m0 ${height*.35}l-40 -60m40 10l48 -62`,false,.23);});
const mountains=(d:Ink)=>many(3,i=>d.path(`M-30 ${-75-i*80}L${140+i*120} ${-370-i*60}L${400+i*100} ${-125-i*70}L${750-i*70} ${-490-i*25}L1030 ${-60-i*55}`,i===0,.18+i*.08));

// Each builder constructs a different physical object/world. The variant adds
// staging, props and atmosphere, shared by editor, browser MP4 and offline export.
const builders:Record<NewSceneKind,(d:Ink)=>string>={
 abyss:d=>{
  let out=d.path('M0 0H410L360 60L425 130L390 250 M630 250L580 150L650 70L610 0H1000',false,.65,2);
  out+=many(7,i=>d.path(`M${80+i*32} ${-i*4}l${-35+i*3} ${80+i*19} M${750+i*23} 0l35 ${130+i*20}`,i%2===0,.18));
  if(d.v===1||d.v===7)out+=d.path(`M350 -500Q${n(495+Math.sin(d.t)*8)} -230 460 80`,true,.65,2);
  if(d.v===4)out+=many(5,i=>stone(d,420+i*34,25+i*32+Math.sin(d.t+i)*4,13));
  if(d.v===7)out+=d.path('M350 0H660 M350 -55H660',true,.6,2);
  return out;
 },
 valley:d=>mountains(d)+d.path('M0 -330Q290 -280 440 0 M1000 -400Q720 -290 560 0',false,.7,2)+d.path(`M430 0Q${n(500+Math.sin(d.t*.1)*20)} -180 550 -270`,true,.5)+many(d.v===4?8:3,i=>stone(d,150+i*95,-5,12+i*2)),
 mountain:d=>mountains(d)+d.path('M80 0L470 -580L920 0 M470 -580l-50 125 58 -37 42 45 17 -58',false,.7,2)+d.path('M150 0L380 -210L315 -220L450 -420',true,.5)+ (d.v===7?d.path('M470 -580v-70l65 18-65 18',true,.8):''),
 lighthouse:d=>{
  const x=d.v%2?330:680,beam=Math.sin(d.t*.32)*150;
  return wave(d,25)+stone(d,x,0,170)+d.path(`M${x-48} -15l20 -410h57l25 410Z M${x-44} -427h95v-65h-95Z M${x-60} -495l62 -40 62 40Z M${x-30} -440h70`,false,.75,2,d.bg)+d.path(`M${x} -460L${x-650} ${n(-560+beam)}L${x-650} ${n(-390+beam)}Z`,true,.1,1,d.a)+d.rect(x-8,-220,18,32,true,.7)+(d.v===7?d.path('M10 -5H260V-50 M80 -50V20 M200 -50V20',false,.5):'');
 },
 river:d=>mountains(d)+d.path('M470 -350C950 -230 180 -170 430 30 M550 -350C1050 -220 390 -100 700 30',true,.6,2)+many(6,i=>d.path(`M${460+i*18} ${-270+i*48}q${n(35+Math.sin(d.t+i)*15)} -12 75 0`,false,.25))+(d.v===7?d.path('M350 -55L670 -100 M350 -70L670 -115',false,.7,2):''),
 waterfall:d=>{
  let out=d.path('M30 0L190 -500H380 M620 -500H820L980 0',false,.55,2);
  out+=many(17,i=>{const x=382+i*14,offset=(d.t*110+i*31)%380;return d.path(`M${x} ${-475+offset}q${Math.sin(i)*9} 50 0 90`,i%3===0,.25+i%3*.08);});
  out+=many(5,i=>wave(d,-10+i*15,10+i*8));return out+stone(d,240,0,55)+(d.v===7?d.path('M190 -240Q500 -170 800 -240',true,.6):'');
 },
 lake:d=>mountains(d)+many(8,i=>wave(d,-80+i*15,5+i*2))+(d.v===4?stone(d,580,-50,100):'')+d.path('M0 0Q260 -40 1000 15',false,.55)+ (d.v===7?d.path('M680 0v-60h140v60 M660 -60h180',true,.5):''),
 island:d=>{
  const x=d.v%2?350:650;
  return many(5,i=>wave(d,i*18))+d.path(`M${x-230} 0Q${x} -150 ${x+230} 0Z`,false,.65,2,d.bg)+plant(d,x+60,-70,260)+(d.v===4||d.v===7?d.path('M60 15Q160 -90 270 15 M800 15Q880 -50 990 15',true,.35):'');
 },
 cave:d=>many(4,i=>{const x=20+i*65,y=-30-i*22;return d.path(`M${x} 0L${x-30} -280Q500 ${-1050+i*110} ${1000-x+30} -280L${1000-x} 0`,i===3,.18+i*.13,2);})+many(8,i=>d.path(`M${200+i*80} ${-480-i%3*24}l12 72 16 -65`,false,.3))+(d.v===4?stone(d,470,-5,65):'')+(d.v===7?d.path('M360 0V-180Q500 -430 640 -180V0',true,.8,2):''),
 canyon:d=>many(5,i=>d.path(`M${i*36} 0V${-440-i*30}l${200-i*22} ${80+i*12}v${280-i*30} M${1000-i*36} 0V${-500+i*20}l${-160+i*18} 80v${290-i*25}`,i%2===0,.18+i*.1,2))+(d.v===7?d.path('M250 0L750 -30 M250 -50L750 -80',true,.65,2):''),
 home:d=>{
  const x=d.v%2?260:570;
  let out=d.path(`M${x-170} 0v-280l170 -150 170 150V0Z M${x-200} -280l200 -175 200 175 M${x-35} 0v-185h70V0`,false,.7,2,d.bg);
  out+=d.rect(x-125,-230,55,65,true,.65)+d.path(`M${x-98} -230v65 M${x-125} -198h55`,true,.5);
  out+=d.path(`M${x-35} 0L${x-100} 90 M${x+35} 0L${x+170} 90`,false,.25);
  if(d.v===4)out+=d.path(`M${x+80} -330l-25 55 40 25-30 65`,true,.7);
  if(d.v===7)out+=d.path(`M${x-35} 0v-185l65 20V0 M${x+15} -70h5`,true,.8);
  return out;
 },
 sanctuary:d=>many(4,i=>{const x=65+i*90;return d.path(`M${x} 0v-320Q500 ${-940+i*120} ${1000-x} -320V0`,i===3,.18+i*.17,2);})+d.path('M0 0H1000 M160 -270H240 M760 -270H840',false,.45)+(d.v===7?d.path('M400 0v-250q100 -100 200 0V0',true,.7):''),
 table:d=>{
  let out=d.path('M220 -175H770L820 -135H180Z M230 -135L205 0 M760 -135L785 0 M270 -135L285 0 M710 -135L695 0',false,.8,2,d.bg);
  for(const x of d.v===6?[130,870]:[150])out+=d.path(`M${x-35} -90h70v90 M${x-35} -90v-110h70v110 M${x+35} -90V0`,false,.6,2);
  out+=d.circle(400,-160,22,false,.65)+d.path('M520 -190h30l-7 35h-16Z',true,.8);
  if(d.v===1||d.v===5)out+=d.path('M615 -175v-100h12v100 M621 -282q-15 -20 0 -35q15 20 0 35',true,.65);
  if(d.v===7)out+=many(4,i=>d.circle(300+i*120,-158,18,true,.5));return out;
 },
 garden:d=>trees(d,4)+many(5+d.v%3,i=>plant(d,70+i*140,0,130+i%2*60))+d.path('M390 0Q600 -170 570 -340 M570 -340Q400 -150 620 0',true,.4)+(d.v===7?d.path('M350 0v-260q150 -120 300 0V0 M350 -180h300',false,.7,2):''),
 roots:d=>{
  let out=d.path('M500 -25V-500 M500 -280L370 -390L320 -480 M500 -360L620 -450L680 -470 M500 -430L450 -510',false,.7,3)+d.path('M0 -25H1000',false,.25);
  out+=many(9,i=>{const x=120+i*95;return d.path(`M500 -25Q${x} 0 ${x} ${100+i%3*35}m0 -40l${i%2?35:-35} 55`,true,.35+i%3*.1);});
  return out+(d.v===4?d.path('M490 -120l30 -35-25 -24 20 -35',true,.8):'');
 },
 seed:d=>{
  const growth=smooth(d.q),height=80+growth*240;
  return d.path('M0 0H1000',false,.4)+d.path('M475 15q-40 -80 25 -95q55 40 -5 95',true,.8,2)+plant(d,500,-30,height)+many(5,i=>d.path(`M500 15q${(i-2)*45} 40 ${(i-2)*68} 115`,true,.3))+(d.v===7?plant(d,650,0,height*.6):'');
 },
 flower:d=>{
  const x=d.v%2?370:610,y=-300,sway=Math.sin(d.t*.7)*8;
  let out=d.path(`M${x} 0Q${x-30} -140 ${n(x+sway)} ${y}`,false,.7,2);
  out+=many(7,i=>{const a=i*Math.PI*2/7,r=55+smooth(d.q)*24;return d.circle(x+sway+Math.sin(a)*r,y+Math.cos(a)*r,42,true,.6);});
  out+=d.circle(x+sway,y,28,false,.9,d.bg)+d.path(`M${x} -120q-85 -85 -95 -30q40 40 95 30`,false,.55);
  return out+(d.v===4?d.path('M760 -20q-40 -35 -60 0q30 25 60 0',true,.7):'')+(d.v===7?plant(d,800,0,160):'');
 },
 wings:d=>{
  const flap=Math.sin(d.t*1.3)*35,x=500,y=-390;
  return d.path(`M${x} ${y}Q310 ${-560-flap} 110 -450Q250 -410 330 -350Q440 -360 ${x} ${y}Q690 ${-560-flap} 890 -450Q750 -410 670 -350Q560 -360 ${x} ${y}l-15 45 30 0Z`,false,.75,2)+many(5,i=>d.path(`M${180+i*50} ${-455+i*13}l40 38 M${820-i*50} ${-455+i*13}l-40 38`,true,.35))+(d.v===4?many(5,i=>d.path(`M${150+i*140} ${-180+i%2*45}l-20 35 35 -10`,true,.4)):'');
 },
 broken:d=>{
  const gap=(1-smooth(d.q))*(d.v===7?20:70),cx=520,cy=-320;
  return many(12,i=>{const a=i*Math.PI/6,b=a+.42,x=Math.cos(a)*gap,y=Math.sin(a)*gap;return d.path(`M${n(cx+x)} ${n(cy+y)}L${n(cx+x+Math.cos(a)*180)} ${n(cy+y+Math.sin(a)*180)}L${n(cx+x+Math.cos(b)*180)} ${n(cy+y+Math.sin(b)*180)}Z`,i%3===0,.35+i%3*.18,1.5);});
 },
 thread:d=>{
  const bow=Math.sin(d.t*.6)*20;
  return d.circle(190,-250,75,false,.6)+d.circle(190,-250,22,true,.7)+d.path(`M190 -250C320 ${n(-520+bow)} 570 -20 820 -300`,true,.7,2)+many(7,i=>d.path(`M${155+i*10} -316v132`,false,.2))+(d.v===4?d.path('M480 -245l-15 28 M520 -220l15 -28',false,.9,3):d.path('M480 -240q-45 -60 -65 -15q20 45 65 15q35 -60 65 -15q-10 45 -65 15',true,.65));
 },
 compass:d=>{
  const a=Math.sin(d.t*.35)*(1-smooth(d.q))*.7,x=500,y=-340;
  return d.circle(x,y,220,false,.6)+d.circle(x,y,190,false,.25)+many(16,i=>{const a=i*Math.PI/8;return d.path(`M${n(x+Math.sin(a)*205)} ${n(y+Math.cos(a)*205)}l${n(-Math.sin(a)*15)} ${n(-Math.cos(a)*15)}`,i%4===0,.65);})+`<g transform="rotate(${n(a*180/Math.PI)} 500 -340)">${d.path('M500 -515L460 -300L500 -340L540 -300Z',true,.8,2,d.bg)}${d.path('M500 -165L460 -380L500 -340L540 -380Z',false,.6)}</g>`+d.circle(x,y,9,true,.9,d.a);
 },
 map:d=>{
  let out=d.path('M170 -470L390 -520L610 -470L830 -520V-90L610 -40L390 -90L170 -40Z M390 -520V-90 M610 -470V-40',false,.65,2,d.bg);
  out+=d.path('M250 -130L330 -250L470 -210L600 -390L745 -420',true,.75,2)+many(4,i=>d.circle(280+i*150,-150-i*80,9,true,.7));
  out+=many(5,i=>d.path(`M${210+i*110} ${-350-i%2*50}l20 -30 25 35`,false,.25));return out+(d.v===4?d.path('M465 -210l-15 22 24 5-10 20',false,.8,4):'');
 },
 train:d=>{
  const shift=(d.t*28)%260;let out=d.path('M0 0H1000 M0 25H1000',false,.5,2)+many(18,i=>d.path(`M${i*60-shift%60} 0l15 25`,false,.3));
  out+=many(3,i=>{const x=-100+i*370-shift;return d.rect(x,-240,340,200,false,.7,d.bg)+many(4,j=>d.rect(x+22+j*80,-215,58,65,true,.45))+d.circle(x+65,-25,25,false,.8,d.bg)+d.circle(x+275,-25,25,false,.8,d.bg);});
  return out;
 },
 station:d=>d.path('M0 0H1000 M30 -380H970L850 -460H160Z M100 -380V0 M900 -380V0 M150 -100H410 M180 -100V0 M380 -100V0 M170 -160H400',false,.6,2)+d.circle(740,-300,60,true,.65)+d.path(`M740 -300l${n(Math.sin(d.t*.06)*40)} ${n(-Math.cos(d.t*.06)*40)} M740 -300l-23 -10`,true,.8,2)+(d.v===7?d.path('M460 -15h300 M720 -45l40 30-40 30',true,.7,2):''),
 boat:d=>{
  const bob=Math.sin(d.t*.85)*8;
  return many(5,i=>wave(d,i*15))+`<g transform="translate(0 ${n(bob)})">${d.path('M280 -110H740L670 -25H360Z M500 -110V-530L700 -150H515 M485 -500L310 -150H485',false,.8,2,d.bg)}${d.path('M500 -530l55 12-55 15',true,.75)}</g>`;
 },
 anchor:d=>d.path('M500 -50V-400 M390 -310H610 M315 -175Q330 -15 500 -50Q670 -15 685 -175 M315 -175l-15 75 75 -30 M685 -175l15 75-75 -30',false,.7,3)+d.circle(500,-440,40,true,.8)+many(7,i=>d.circle(500+Math.sin(d.t*.5+i*.15)*10,-505-i*24,12,i%2===0,.45))+(d.v===4?d.path('M485 -580h30',false,.9,5):''),
 hourglass:d=>{
  const q=d.v===7?1-smooth(d.q):smooth(d.q);
  return d.path('M320 -550H680 M320 -70H680 M350 -540Q340 -390 485 -310Q345 -230 350 -80 M650 -540Q660 -390 515 -310Q655 -230 650 -80',false,.7,2)+d.path(`M375 ${n(-495+q*140)}H625L500 -323Z M380 -95L500 ${n(-100-q*130)}L620 -95Z`,true,.3,1,d.a)+d.path('M500 -315V-150',true,.75,1.5)+many(8,i=>d.circle(499+i%2*3,-310+(d.t*110+i*23)%140,1.7,true,.8));
 },
 book:d=>{
  const flip=Math.sin(d.t*.45)*25;
  return d.path('M500 -120Q340 -190 180 -130V-470Q340 -530 500 -450Q660 -530 820 -470V-130Q660 -190 500 -120Z M500 -450V-120 M180 -120V-100Q340 -150 500 -95Q660 -150 820 -100V-120',false,.75,2,d.bg)+many(7,i=>d.path(`M220 ${-430+i*34}q120 -30 240 12 M540 ${-418+i*34}q100 -30 240 -12`,i===3,.28))+d.path(`M500 -450Q${n(580+flip)} -550 620 -480Q${n(530+flip)} -270 500 -120`,true,.45);
 },
 letter:d=>{
  const open=smooth(d.q)*140;
  return d.rect(220,-320,560,280,false,.7,d.bg)+d.path(`M220 -320L500 ${n(-450-open)}L780 -320 M220 -40L500 -240L780 -40 M220 -320L500 -120L780 -320`,false,.6,2)+d.rect(340,-450-open*.4,320,240,true,.55,d.bg)+many(5,i=>d.path(`M375 ${-410-open*.4+i*33}h${i===4?130:245}`,false,.4))+(d.v===4?d.path('M500 -510l-30 55 35 30-25 50',true,.9,3):'');
 },
 photograph:d=>{
  const tilt=Math.sin(d.t*.3)*2;
  let out=`<g transform="rotate(${n(tilt)} 500 -300)">${d.rect(300,-530,380,450,false,.7,d.bg)}${d.rect(325,-505,330,320,true,.5)}${d.circle(480,-390,36,false,.65)}${d.path('M410 -220q20 -120 70 -120q70 0 95 120 M340 -260l100 -65 60 20 125 -75',false,.45)}</g>`;
  if(d.v===6)out+=d.rect(80,-430,180,240,false,.45)+d.circle(170,-350,24,true,.5);
  if(d.v===4)out+=d.path('M500 -530l-30 60 45 45-25 80 32 65-22 70',true,.8);return out;
 },
 fire:d=>{
  let out=d.path('M330 -5L650 -50 M340 -45L650 -5',false,.65,12);
  out+=many(5,i=>{const x=370+i*65,height=160+Math.sin(d.t*1.9+i)*40+d.beat*35;return d.path(`M${x-50} -45Q${x-90} ${-height*.6} ${x} ${-height-140}Q${x-10} ${-height*.4} ${x+45} -45Z`,true,.22+i*.08,1.5);});
  return out+many(14,i=>{const age=(d.t*.22+i/14)%1;return d.circle(350+rand(i*71)*330,-80-age*430,1.5+i%3,true,(1-age)*.65);});
 },
 candle:d=>{
  const flame=(x:number)=>d.rect(x-28,-280,56,260,false,.7,d.bg)+d.path(`M${x-28} -260q20 40 25 10t31 15 M${x} -280v-20 M${x} -305Q${n(x-30+Math.sin(d.t*2)*5)} -355 ${x+5} -385Q${x+35} -335 ${x} -305Z`,true,.85,2)+d.path(`M${x-80} -10h160 M${x-28} -20h56`,false,.55,3)+d.circle(x,-345,90,true,.09);
  return flame(d.v===6?350:520)+(d.v===6?flame(690):'');
 },
 snow:d=>trees(d,5)+many(35,i=>{const x=(rand(i*79)*1100+d.t*12)%1100-50,y=-650+(d.t*(18+i%7)+i*97)%650;return d.path(`M${n(x-3)} ${n(y)}h6 M${n(x)} ${n(y-3)}v6`,false,.25+i%3*.15);})+many(4,i=>wave(d,-5+i*8,8))+(d.v===4?d.path('M350 0l80 -30 70 20 65 -35 100 30',true,.6):''),
 wind:d=>trees(d,3)+many(10,i=>{const x=(i*143+d.t*(25+i*3))%1250-130,y=-100-i*42;return d.path(`M${n(x)} ${y}q140 -35 240 0t180 0`,i%3===0,.2+i%3*.1);})+many(9,i=>{const x=(i*113+d.t*45)%1100,y=-350+Math.sin(d.t+i)*80;return d.path(`M${n(x)} ${n(y)}q25 -35 45 -5q-25 25 -45 5`,true,.45);}),
 sunrise:d=>{
  const y=-90-smooth(d.q)*280;
  return mountains(d)+d.circle(550,y,115,true,.7)+many(12,i=>{const a=i*Math.PI/6;return d.path(`M${n(550+Math.sin(a)*140)} ${n(y+Math.cos(a)*140)}l${n(Math.sin(a)*80)} ${n(Math.cos(a)*80)}`,true,.25);})+d.path('M0 -40H1000',false,.5);
 },
 moon:d=>{
  const x=d.v%2?410:660,y=-420,r=d.v===1?135:110;
  return d.circle(x,y,r,false,.8,d.bg)+many(8,i=>d.circle(x+Math.sin(i*1.7)*r*.65,y+Math.cos(i*2.3)*r*.6,9+i%3*7,false,.2))+(d.v!==1?d.circle(x+48,y-12,r,false,1,d.bg):'')+many(14,i=>d.circle(rand(i*41)*1000,-200-rand(i*61)*400,1.5,false,.2+.25*Math.sin(d.t*.5+i)));
 },
 cross:d=>{
  const x=d.v%2?390:650;
  let out=d.path(`M${x-20} 0V-550h40V0 M${x-140} -400h280v40h-280Z`,false,.8,2,d.bg)+d.path(`M${x-115} -402Q${x} ${n(-310+Math.sin(d.t*.5)*8)} ${x+110} -402`,true,.6,3)+many(d.v===4?8:3,i=>stone(d,x-130+i*45,5,18+i%3*7));
  if(d.v===7)out+=d.path(`M${x-70} 0L${x-230} 100 M${x+70} 0L${x+240} 100`,true,.5);return out;
 },
 crown:d=>{
  const y=-320+Math.sin(d.t*.5)*5;
  return d.path(`M270 ${y}L220 ${y-160}L365 ${y-90}L500 ${y-240}L635 ${y-90}L780 ${y-160}L730 ${y}Z M270 ${y+25}H730V${y}`,false,.8,2,d.bg)+many(5,i=>d.circle(320+i*90,y-20-i%2*12,9,true,.8))+(d.v===4?many(13,i=>d.path(`M${245+i*39} ${y+14}l22 -40 3 30`,true,.7)):'');
 },
 scales:d=>{
  const angle=Math.sin(d.t*.7)*(d.v===7?2:10)*(1-d.q*.7);
  return d.path('M500 0V-500 M390 0h220 M450 -40L500 -100L550 -40',false,.65,3)+`<g transform="rotate(${n(angle)} 500 -440)">${d.path('M220 -440H780 M280 -440l-80 210h160Z M720 -440l-80 210h160Z',false,.7,2)}${d.circle(280,-270,24,true,.8)}${d.rect(690,-290,60,50,true,.6)}</g>`;
 },
 hands:d=>{
  const gap=85*(1-smooth(d.q)),shift=Math.sin(d.t*.6)*3;
  const hand=(flip:boolean)=>`<g transform="translate(${n(flip?1000+gap:-gap)} ${n(shift)}) scale(${flip?-1:1} 1)">${d.path('M0 -130L260 -180L365 -285L415 -315Q435 -326 439 -308L406 -263L477 -300Q499 -308 501 -290L430 -240L494 -261Q517 -265 515 -246L440 -213L493 -220Q516 -217 504 -200L421 -178Q377 -130 300 -110L0 -45',false,.75,2,d.bg)}${d.path('M260 -180L300 -110 M350 -180l45 -55',true,.4)}</g>`;
  return hand(false)+hand(true)+(d.v===4?d.path('M390 -200l16 15 M610 -200l-16 15',true,.9,3):'');
 }
};

function atmosphere(d:Ink){
 if(d.v===1)return d.circle(820,-590,37,false,.3)+many(12,i=>d.circle(60+rand(i*41)*860,-400-rand(i*79)*240,1.5,false,.3));
 if(d.v===2)return many(28,i=>{const x=rand(i*59)*1040-20,y=-650+(d.t*170+i*37)%650;return d.path(`M${n(x)} ${n(y)}l-10 30`,false,.17);});
 if(d.v===3)return many(5,i=>d.path(`M-50 ${-100-i*86}Q${n(350+Math.sin(d.t*.2+i)*35)} ${-160-i*86} 1050 ${-100-i*86}`,false,.07,22));
 if(d.v===4)return many(4,i=>d.path(`M${90+i*250} 35l38 -30-14 -24 31 -28-10 -32`,true,.26,1.5));
 if(d.v===5)return many(3,i=>d.path(`M${370+i*80} -690L${80+i*280} 0H${340+i*260}Z`,true,.035+i*.008,0,d.a));
 if(d.v===7)return many(6,i=>d.path(`M${95+i*40} 10q10 -5 17 0 M${115+i*40} 20q10 -5 17 0`,true,.22));
 return'';
}

export function libraryWorlds<C extends StageContext>(hero:Hero<C>,words:Words<C>):Record<NewSceneKind,(c:C)=>string>{
 return Object.fromEntries(newSceneKinds.map(kind=>[kind,(c:C)=>{
  const preset=scenePreset(c.s),v=preset?.variant??((c.s.variant%8)+8)%8,k=Math.min(c.w*.9/1000,c.h*.45/700),x=c.w*.5-500*k;
  const d:Ink={v,t:c.local,q:c.q,beat:c.beat,a:c.accent,fg:c.fg,bg:c.p.style.background,
   path:(path,accent=false,opacity=.5,width=1.5,fill='none')=>`<path d="${path}" stroke="${accent?c.accent:c.fg}" opacity="${n(opacity)}" stroke-width="${n(width)}" fill="${fill}" stroke-linecap="round" stroke-linejoin="round"/>`,
   circle:(cx,cy,r,accent=false,opacity=.5,fill='none')=>`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" stroke="${accent?c.accent:c.fg}" opacity="${n(opacity)}" fill="${fill}"/>`,
   rect:(xx,y,w,h,accent=false,opacity=.5,fill='none')=>`<rect x="${n(xx)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" stroke="${accent?c.accent:c.fg}" opacity="${n(opacity)}" fill="${fill}"/>`};
  const art=builders[kind](d),reflection=v===6?`<g transform="translate(0 25) scale(1 -.23)" opacity=".17">${art}</g>`:'';
  let hx=[300,700,310,680,300,700,300,500][v],hy=0,scale=1.3;
  if(kind==='abyss'||kind==='canyon')hx=v===7?330:v%2?710:290;
  if(kind==='boat'){hx=500;hy=-110+Math.sin(c.local*.85)*8;scale=1.05;}
  if(kind==='train'){hx=850;hy=65;}
  if(kind==='table')hx=v%2?840:110;
  if(kind==='home')hx=v%2?710:280;
  const floor=['abyss','canyon','river','waterfall','lake','island','boat'].includes(kind)?'':d.path('M0 0H1000',false,.22);
  return words(c,c.s.accent,c.w*.5,c.h*.24,c.w*.062,Math.min(1,c.local))+`<g data-world="${kind}" data-scene-preset="${preset?.id??kind+'-'+v}" transform="translate(${n(x)} ${n(c.ground)}) scale(${n(k)})">${atmosphere(d)}${reflection}${art}${floor}</g>`+hero(c,x+hx*k,c.ground+hy*k,scale*k/c.u);
 }])) as Record<NewSceneKind,(c:C)=>string>;
}
