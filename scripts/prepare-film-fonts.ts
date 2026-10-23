// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {readFile,writeFile} from 'node:fs/promises';
import opentype from 'opentype.js';
import {fontFaces} from '../src/engine/catalog';
const metrics:Record<string,Record<string,number>>={};
for(const face of fontFaces){
 const bytes=await readFile('fonts/'+face.file),font=opentype.parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),widths:Record<string,number>={};
 for(let i=0;i<font.glyphs.length;i++){const glyph=font.glyphs.get(i);for(const code of glyph.unicodes??[])if(code>=32&&code<=0xffff)widths[String.fromCodePoint(code)]=Number(((glyph.advanceWidth??font.unitsPerEm*.61)/font.unitsPerEm).toFixed(5));}
 metrics[face.id]=widths;
}
await writeFile('src/engine/font-metrics.json',JSON.stringify(metrics));
console.log('Prepared metrics for '+fontFaces.length+' licensed font faces.');
