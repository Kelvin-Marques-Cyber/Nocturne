// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
export const languages={auto:'Automático',pt:'Português',en:'English',es:'Español',ja:'日本語',ko:'한국어',ru:'Русский',fr:'Français',de:'Deutsch',it:'Italiano',zh:'中文'} as const;
export type Language=keyof typeof languages;
export const filmFont='DejaVu Sans Mono,Noto Sans CJK JP,monospace';
// NFC/NFKC keeps voiced kana and composed Hangul intact. Only Latin accents
// are folded for lookup; stripping every Unicode mark would change Japanese.
export function lexical(s:string){return s.normalize('NFKC').toLowerCase().replace(/\p{Script=Latin}/gu,c=>c.normalize('NFD').replace(/\p{M}/gu,''));}
export function scriptLanguage(s:string):Language{
 if(/\p{Script=Hangul}/u.test(s))return'ko';
 if(/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(s))return'ja';
 if(/\p{Script=Han}/u.test(s))return'zh';
 if(/\p{Script=Cyrillic}/u.test(s))return'ru';
 return'auto';
}
export interface LyricToken{text:string;line:number;}
export function tokenizeLine(text:string,language:Language='auto'):string[]{
 // Whitespace languages keep the author's spelling, quotes and punctuation.
 if(!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text))return text.trim().split(/\s+/).filter(Boolean);
 const locale=language==='auto'?scriptLanguage(text):language;
 const segmenter=new Intl.Segmenter(locale==='auto'?undefined:locale,{granularity:'word'});
 const out:string[]=[];let prefix='';
 for(const part of segmenter.segment(text)){
  if(part.isWordLike){out.push(prefix+part.segment);prefix='';}
  else if(!part.segment.trim())continue;
  else if(/[「『（“‘]/u.test(part.segment))prefix+=part.segment;
  else if(out.length)out[out.length-1]+=part.segment;
  else prefix+=part.segment;
 }
 if(prefix&&out.length)out[out.length-1]+=prefix;
 return out;
}
export function lyricContent(text:string){
 const lines=text.split('\n'),section=(line:string)=>/^\s*\[[^\]\n]+\]\s*$/.test(line),firstSection=lines.findIndex(section),prefix=lines.slice(0,Math.max(0,firstSection)).map((s,i)=>({s:s.trim(),i})).filter(x=>x.s);
 const title=prefix.length===1&&/\p{L}/u.test(prefix[0].s)&&prefix[0].s===prefix[0].s.toUpperCase()?prefix[0]:undefined;
 return{text:lines.map((line,i)=>section(line)||i===title?.i?'':line).join('\n'),title:title?.s};
}
export function tokenizeLyrics(text:string,language:Language='auto'):LyricToken[]{return lyricContent(text).text.split('\n').flatMap((line,i)=>tokenizeLine(line,language).map(text=>({text,line:i})));}
export function glyphWidth(char:string){return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(char)?1:.61;}
export function textWidth(text:string){return[...text.normalize('NFC')].reduce((sum,c)=>sum+( /\p{M}/u.test(c)?0:glyphWidth(c)),0);}
export const joinWords=(words:{text:string}[])=>words.map((w,i)=>w.text+(i<words.length-1&&!( /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(w.text)&&/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(words[i+1].text))?' ':'')).join('');
