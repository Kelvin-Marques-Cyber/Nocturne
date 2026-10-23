// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type{FilmFilter,FilterType}from'./model';
import{n,rand,clamp}from'./math';
export const filterLabels:Record<FilterType,string>={monochrome:'Preto e branco',duotone:'Visão esmeralda',contrast:'Contraste',invert:'Negativo',posterize:'Posterização',bloom:'Difusão de luz',chromatic:'Separação RGB',datamosh:'Ruptura digital',halftone:'Retícula',scanlines:'Varredura analógica',vignette:'Vinheta',letterbox:'Barras de cinema',hazard:'Faixas industriais',hud:'Interface de rastreamento'};
export const styleLabels:Record<string,string>={'terminal-noir':'Terminal noir',chalk:'Giz',signal:'Sinal vermelho',datamosh:'Sinal corrompido','acid-industrial':'Industrial ácido',emerald:'Esmeralda'};
export const filter=(type:FilterType,amount:number,id:string=type):FilmFilter=>({id,type,amount,enabled:true});
interface EffectClock{width:number;height:number;frame:number;seed:number;energy:number;beat:number;focus:number;}
export function applyEffects(svg:string,filters:FilmFilter[],clock:EffectClock){
 const enabled=filters.filter(f=>f.enabled&&f.amount>0);if(!enabled.length)return svg;
 const{width:w,height:h,frame,seed,energy,beat,focus}=clock,u=Math.min(w,h)/1080,open=svg.indexOf('>')+1;
 let body=svg.slice(open,-6),defs='';
 for(const[findex,f]of enabled.entries()){
  const id='fx-'+findex,input='fx-source-'+findex,amount=clamp(f.amount),motion=amount*(1-focus*.92);
  const color=(code:string)=>{defs+=`<filter id="${id}" color-interpolation-filters="sRGB" x="-15%" y="-15%" width="130%" height="130%">${code}</filter>`;body=`<g filter="url(#${id})">${body}</g>`;};
  const capture=()=>{body=`<g id="${input}">${body}</g>`;};
  if(f.type==='monochrome')color(`<feColorMatrix type="saturate" values="${n(1-amount)}"/>`);
  if(f.type==='duotone')color(`<feColorMatrix type="matrix" values="${.2126*(1-.55*amount)} ${.7152*(1-.55*amount)} ${.0722*(1-.55*amount)} 0 0 .2126 .7152 .0722 0 ${amount*.012} ${.2126*(1-.3*amount)} ${.7152*(1-.3*amount)} ${.0722*(1-.3*amount)} 0 0 0 0 0 1 0"/>`);
  if(f.type==='contrast'){const slope=1+amount*1.5; color(`<feComponentTransfer>${['R','G','B'].map(c=>`<feFunc${c} type="linear" slope="${slope}" intercept="${-amount*.17}"/>`).join('')}</feComponentTransfer>`);}
  if(f.type==='invert')color(`<feComponentTransfer>${['R','G','B'].map(c=>`<feFunc${c} type="table" tableValues="${amount} ${1-amount}"/>`).join('')}</feComponentTransfer>`);
  if(f.type==='posterize'){const steps=Math.round(9-amount*6),values=Array.from({length:steps},(_,i)=>n(i/(steps-1))).join(' ');color(`<feComponentTransfer>${['R','G','B'].map(c=>`<feFunc${c} type="discrete" tableValues="${values}"/>`).join('')}</feComponentTransfer>`);}
  if(f.type==='bloom')color(`<feGaussianBlur stdDeviation="${n(amount*3.5*u)}" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>`);
  if(f.type==='chromatic'){
   const shift=amount*(1+beat*2)*3*u;
   color(`<feColorMatrix values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red"/><feOffset in="red" dx="${n(shift)}" result="r"/><feColorMatrix in="SourceGraphic" values="0 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0" result="cyan"/><feOffset in="cyan" dx="${n(-shift)}" result="c"/><feBlend in="r" in2="c" mode="screen"/>`);
  }
  if(f.type==='datamosh'&&motion>.01){
   capture();let slices='';const tick=Math.floor(frame/4),strength=motion*(.15+energy*.3+beat*.55);
   for(let i=0;i<12;i++){const y=rand(seed+tick*43+i*137)*h,hh=(3+rand(i*17+tick)*28)*u,dx=(rand(seed+i*31+tick*7)-.5)*95*u*strength;
    defs+=`<clipPath id="${id}-${i}"><rect x="0" y="${n(y)}" width="${w}" height="${n(hh)}"/></clipPath>`;
    slices+=`<g clip-path="url(#${id}-${i})" opacity="${n(strength*.75)}"><use xlink:href="#${input}" transform="translate(${n(dx)} ${n(i%3===0?7*u*strength:0)})"/></g>`;
   }body+=slices;
  }
  if(f.type==='halftone'){defs+=`<pattern id="${id}" width="${8*u}" height="${8*u}" patternUnits="userSpaceOnUse"><circle cx="${4*u}" cy="${4*u}" r="${1.2*u}" fill="#000000"/></pattern>`;body+=`<rect width="${w}" height="${h}" fill="url(#${id})" opacity="${n(amount*.65)}"/>`;}
  if(f.type==='scanlines'){defs+=`<pattern id="${id}" width="${4*u}" height="${6*u}" patternUnits="userSpaceOnUse"><path d="M0 0H${w}" stroke="#000000" stroke-width="${1.5*u}"/></pattern>`;body+=`<rect width="${w}" height="${h}" fill="url(#${id})" opacity="${n(amount*.6)}"/>`;}
  if(f.type==='vignette'){defs+=`<radialGradient id="${id}"><stop offset=".3" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="${n(amount*.8)}"/></radialGradient>`;body+=`<rect width="${w}" height="${h}" fill="url(#${id})"/>`;}
  if(f.type==='letterbox'){const bar=h*.085*amount;body+=`<path d="M0 0H${w}V${n(bar)}H0Z M0 ${n(h-bar)}H${w}V${h}H0Z" fill="#000000"/>`;}
  if(f.type==='hazard'&&motion>.01){
   defs+=`<pattern id="${id}" width="${110*u}" height="${110*u}" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><rect width="${55*u}" height="${110*u}" fill="#d7e1b5"/></pattern>`;
   const border=w*.045;body+=`<path d="M0 0H${w}V${n(h*.13)}H0Z M0 ${n(h*.91)}H${w}V${h}H0Z M0 0H${n(border)}V${h}H0Z M${n(w-border)} 0H${w}V${h}H${n(w-border)}Z" fill="url(#${id})" opacity="${n(motion*.75)}"/>`;
  }
  if(f.type==='hud'&&motion>.01){
   const cx=w*.62,cy=h*.43;let marks=`<path d="M${cx-40*u} ${cy}h80 M${cx} ${cy-40*u}v80" stroke="#b6ef51" fill="none" opacity=".6"/>`;
   for(let i=0;i<44;i++){const x=w*(.17+i*.015),height=(12+rand(i+seed)*32)*u;marks+=`<rect x="${n(x)}" y="${n(h*.8-height)}" width="${n((1+i%3)*u)}" height="${n(height)}" fill="#c6e1b6"/>`;}
   marks+=`<path d="M${w*.12} ${h*.19}h${w*.76} M${w*.12} ${h*.76}h${w*.76}" stroke="#c9e0c1" opacity=".3"/>`;body+=`<g opacity="${n(motion*.6)}">${marks}</g>`;
  }
 }
 return svg.slice(0,open)+`<defs>${defs}</defs>`+body+'</svg>';
}
