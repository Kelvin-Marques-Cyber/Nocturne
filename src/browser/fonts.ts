// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Font}from'opentype.js';
import {parse}from'opentype.js/dist/opentype.mjs';
import{stored,persist}from'./storage';
import{fontFaces}from'../engine/catalog';
const CJK_URL='https://raw.githubusercontent.com/notofonts/noto-cjk/Sans2.004/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf';
const CJK_SHA='68a3fc98800b2a27b371f2fb79991daf3633bd89309d4ffaa6946fd587f375b5';
let latin:Promise<Font[]>|undefined,cjk:Promise<Font>|undefined;
const faceInfo=new WeakMap<Font,typeof fontFaces[number]>();
export async function loadFilmFonts(text:string){
 latin??=Promise.all(fontFaces.map(async face=>{const r=await fetch(import.meta.env.BASE_URL+face.file);if(!r.ok)throw Error('Fonte indisponível: '+face.file);const font=parse(await r.arrayBuffer());faceInfo.set(font,face);return font;})).catch(e=>{latin=undefined;throw e;});
 const fonts=[...await latin];
 if(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text)){
  cjk??=(async()=>{
   let bytes=await stored<ArrayBuffer>('font-cjk-'+CJK_SHA);
   if(!bytes){const r=await fetch(CJK_URL);if(!r.ok)throw Error('Prepare a fonte CJK com internet antes de usar offline.');bytes=await r.arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==CJK_SHA)throw Error('Checksum da fonte CJK inválido.');await persist('font-cjk-'+CJK_SHA,bytes);}
   if(typeof document!=='undefined'){const face=new FontFace('Noto Sans CJK JP',bytes);document.fonts.add(await face.load());}return parse(bytes);
  })().catch(e=>{cjk=undefined;throw e;});fonts.push(await cjk);
 }
 if(typeof document!=='undefined')await document.fonts.ready;return fonts;
}
// SVG-as-image cannot inherit document fonts. Convert the engine's simple
// <text> elements into cached glyph paths without parsing and serializing the
// *entire* animated SVG tree for every exported frame.
const textPattern=/<text\b([^>]*)>([^<]*)<\/text>/g;
const attributePattern=/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const excluded=new Set(['x','y','font-size','font-family','text-anchor','letter-spacing','font-weight','font-style','font-kerning','transform']);
function decodeXmlText(value:string){
 return value.replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos);/gi,(match,entity:string)=>{
  if(entity[0]==='#'){
   const hex=entity[1]?.toLowerCase()==='x',code=Number.parseInt(entity.slice(hex?2:1),hex?16:10);
   return Number.isInteger(code)&&code>=0&&code<=0x10ffff?String.fromCodePoint(code):match;
  }
  return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"} as Record<string,string>)[entity.toLowerCase()]??match;
 });
}
export function outlineText(svg:string,fonts:Font[],cache:Map<string,{d:string;width:number}>){
 return svg.replace(textPattern,(_tag:string,rawAttrs:string,encoded:string)=>{
  const attrs=new Map<string,string>();
  for(const match of rawAttrs.matchAll(attributePattern))attrs.set(match[1],match[2]??match[3]??'');
  const value=decodeXmlText(encoded).normalize('NFC'),size=Number(attrs.get('font-size')??16);
  const family=(attrs.get('font-family')??'DejaVu Sans Mono').split(',')[0].replace(/['"]/g,'').trim();
  const weight=Number(attrs.get('font-weight')??400),italic=['oblique','italic'].includes(attrs.get('font-style')??'');
  const spacing=Number(attrs.get('letter-spacing')??0);
  const primary=fonts.find(f=>{const face=faceInfo.get(f);return face?.family===family&&face.weight===weight&&face.italic===italic;})??fonts[0];
  // Normalize paths to 1000 px: animated font sizes reuse the same contours.
  const unit=1000,scale=size/unit,tracking=size?Math.round(spacing/size*10000)/10000:0;
  const key=[family,weight,italic,value,tracking,fonts.length].join('|');
  let cached=cache.get(key);
  if(!cached){
   let width=0;
   const parts:string[]=[];
   for(const char of value){
    const font=primary.charToGlyphIndex(char)!==0?primary:fonts.find(f=>f.charToGlyphIndex(char)!==0)??primary;
    const glyph=font.charToGlyph(char);
    parts.push(glyph.getPath(width,0,unit).toPathData(3));
    width+=(glyph.advanceWidth??font.unitsPerEm*.61)*unit/font.unitsPerEm+tracking*unit;
   }
   cached={d:parts.join(''),width:Math.max(0,width-(value.length?tracking*unit:0))};
   if(cache.size>=4096)cache.delete(cache.keys().next().value!);cache.set(key,cached);
  }
  const offset=attrs.get('text-anchor')==='middle'?cached.width*scale/2:attrs.get('text-anchor')==='end'?cached.width*scale:0;
  const transform=(attrs.get('transform')??'')+` translate(${Number(attrs.get('x')??0)-offset} ${Number(attrs.get('y')??0)}) scale(${scale})`;
  if(attrs.has('stroke-width')&&scale)attrs.set('stroke-width',String(Number(attrs.get('stroke-width'))/scale));
  const preserved=[...attrs].filter(([name])=>!excluded.has(name)).map(([name,v])=>`${name}="${v}"`).join(' ');
  return `<path ${preserved} transform="${transform}" d="${cached.d}"/>`;
 });
}
