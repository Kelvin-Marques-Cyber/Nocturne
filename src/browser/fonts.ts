// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import{parse,type Font}from'opentype.js';
import{stored,persist}from'./storage';
const CJK_URL='https://raw.githubusercontent.com/notofonts/noto-cjk/Sans2.004/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf';
const CJK_SHA='68a3fc98800b2a27b371f2fb79991daf3633bd89309d4ffaa6946fd587f375b5';
let latin:Promise<Font>|undefined,cjk:Promise<Font>|undefined;
export async function loadFilmFonts(text:string){
 latin??=fetch(import.meta.env.BASE_URL+'DejaVuSansMono.ttf').then(r=>{if(!r.ok)throw Error('Fonte principal indisponível.');return r.arrayBuffer();}).then(b=>parse(b));
 const fonts=[await latin];
 if(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text)){
  cjk??=(async()=>{
   let bytes=await stored<ArrayBuffer>('font-cjk-'+CJK_SHA);
   if(!bytes){const r=await fetch(CJK_URL);if(!r.ok)throw Error('Prepare a fonte CJK com internet antes de usar offline.');bytes=await r.arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==CJK_SHA)throw Error('Checksum da fonte CJK inválido.');await persist('font-cjk-'+CJK_SHA,bytes);}
   const face=new FontFace('Noto Sans CJK JP',bytes);document.fonts.add(await face.load());return parse(bytes);
  })().catch(e=>{cjk=undefined;throw e;});fonts.push(await cjk);
 }
 await document.fonts.ready;return fonts;
}
// SVG rendered as an image cannot borrow document web fonts. Convert text to
// glyph contours once per distinct string/size, preserving the preview layout.
export function outlineText(svg:string,fonts:Font[],cache:Map<string,string>){
 const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
 for(const text of doc.querySelectorAll('text')){
  const value=text.textContent??'',size=Number(text.getAttribute('font-size')??16),key=value+'@'+size;
  let d=cache.get(key);
  if(d===undefined){let x=0;const parts:string[]=[];for(const char of value){const font=fonts.find(f=>f.charToGlyphIndex(char)!==0)??fonts[0],glyph=font.charToGlyph(char);parts.push(glyph.getPath(x,0,size).toPathData(3));x+=(glyph.advanceWidth??font.unitsPerEm*.61)*size/font.unitsPerEm;}d=parts.join('');cache.set(key,d);}
  const path=doc.createElementNS('http://www.w3.org/2000/svg','path');
  for(const attr of text.attributes)if(!['x','y','font-size','font-family','text-anchor'].includes(attr.name))path.setAttribute(attr.name,attr.value);
  const transform=text.getAttribute('transform')??'',x=Number(text.getAttribute('x')??0),y=Number(text.getAttribute('y')??0);
  path.setAttribute('transform',transform+` translate(${x} ${y})`);path.setAttribute('d',d);text.replaceWith(path);
 }
 return new XMLSerializer().serializeToString(doc);
}
