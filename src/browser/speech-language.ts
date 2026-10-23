// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
// Whisper predicts the language immediately after <|startoftranscript|>.
// Transformers.js 3.8.1 does not do this when language is omitted: it uses en.
import {franc,francAll} from 'franc-min';
import {lyricContent} from '../engine/language';
const languageCodes:Record<string,string>={por:'pt',eng:'en',spa:'es',fra:'fr',deu:'de',ita:'it',rus:'ru',jpn:'ja',kor:'ko',cmn:'zh'};
export function lyricLanguages(lyrics:string):string[]{
 const text=lyricContent(lyrics).text,primary=languageCodes[franc(text,{minLength:30})];
 if(!primary)return[]; // An unknown or short lyric must not silently force English.
 const votes=new Map<string,{count:number;characters:number}>();
 for(const block of text.split(/\n\s*\n/).filter(s=>s.trim().length>=40)){
  const ranked=francAll(block,{only:Object.keys(languageCodes)}),best=ranked[0],primaryScore=ranked.find(([code])=>languageCodes[code]===primary)?.[1]??0;
  if(!best||!languageCodes[best[0]]||best[1]-primaryScore<.2)continue;
  const code=languageCodes[best[0]],vote=votes.get(code)??{count:0,characters:0};vote.count++;vote.characters+=block.length;votes.set(code,vote);
 }
 return[...new Set([primary,...[...votes].filter(([,v])=>v.count>=2||v.characters>=100).map(([code])=>code)])];
}
interface Tensor {data:ArrayLike<number|bigint>;dims:number[];dispose?:()=>void}
export interface LanguageRecognizer {
 processor:(samples:Float32Array)=>Promise<{input_features:Tensor}>;
 model:{generation_config:{decoder_start_token_id:number;lang_to_id:Record<string,number>};generate:(options:Record<string,unknown>)=>Promise<Tensor>};
}
export async function detectAudioLanguage(samples:Float32Array,recognizer:LanguageRecognizer,candidates:string[]=[]):Promise<string>{
 const config=recognizer.model.generation_config,all=Object.entries(config.lang_to_id),entries=candidates.length?all.filter(([token])=>candidates.includes(token.slice(2,-2))):all,allowed=new Set(entries.map(([,id])=>id));
 const features=await recognizer.processor(samples);
 const languageOnly=(_ids:bigint[][],logits:{data:Float32Array;dims:number[]})=>{
  const size=logits.dims.at(-1)!;
  for(let i=0;i<logits.data.length;i++)if(!allowed.has(i%size))logits.data[i]=-Infinity;
  return logits;
 };
 try{
  const result=await recognizer.model.generate({inputs:features.input_features,decoder_input_ids:[[config.decoder_start_token_id]],max_new_tokens:1,return_timestamps:false,return_token_timestamps:false,logits_processor:[languageOnly]});
  const token=Number(result.data[result.data.length-1]);result.dispose?.();
  const language=entries.find(([,id])=>id===token)?.[0].replace(/^<\||\|>$/g,'');
  if(!language)throw Error('Não foi possível detectar o idioma da voz. Selecione o idioma da letra e tente novamente.');
  return language;
 }finally{features.input_features.dispose?.();}
}
