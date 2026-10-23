// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import metrics from './font-metrics.json';
import {typographyRecipes} from './catalog';
export type Typography=typeof typographyRecipes[number];
const tables:Record<string,Record<string,number>>=metrics;
export function typographyFor(id?:string){return typographyRecipes.find(t=>t.id===id)??typographyRecipes[0];}
export function typeWidth(text:string,type:Typography){
 const chars=[...text.normalize('NFC')],table=tables[type.face.id];
 return(chars.reduce((sum,char)=>sum+( /\p{M}/u.test(char)?0:table[char]??(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(char)?1:.7)),0)+Math.max(0,chars.length-1)*type.tracking)*type.width;
}
