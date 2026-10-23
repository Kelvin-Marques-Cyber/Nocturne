// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Font} from 'opentype.js';
import {outlineText} from '../src/browser/fonts';

// Use deterministic synthetic glyphs; the export transform should run under
// Node without DOMParser, document, Image or a browser canvas.
const font={
 unitsPerEm:1000,
 charToGlyphIndex:(_char:string)=>1,
 charToGlyph:(_char:string)=>({
  advanceWidth:500,
  getPath:(x:number,y:number,_size:number)=>({
   toPathData:()=>`M${x} ${y}h1`,
  }),
 }),
} as unknown as Font;

test('PWA outlines text without rebuilding the entire SVG DOM for every frame',()=>{
 const svg='<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="6" r="7"/><text x="100" y="200" font-family="DejaVu Sans Mono" font-size="20" text-anchor="middle" fill="#ffffff" data-word="one">A&amp;B</text></svg>';
 const cache=new Map<string,{d:string;width:number}>();
 const first=outlineText(svg,[font],cache);
 const second=outlineText(svg,[font],cache);
 assert.equal(first,second);
 assert.equal(cache.size,1);
 assert.ok(first.includes('<circle cx="5" cy="6" r="7"/>'));
 assert.ok(!first.includes('<text '));
 assert.match(first,/data-word="one"/);
 assert.match(first,/fill="#ffffff"/);
 assert.match(first,/transform=" translate\(85 200\) scale\(0.02\)"/);
 assert.match(first,/d="M0 0h1M500 0h1M1000 0h1"/);
});
test('PWA glyph conversion preserves group transforms and Unicode character count',()=>{
 const svg='<svg><g><text x="4" y="5" font-size="20" transform="scale(2)" text-anchor="end">é&amp;☀</text></g></svg>';
 const actual=outlineText(svg,[font],new Map());
 assert.match(actual,/transform="scale\(2\) translate\(-26 5\) scale\(0.02\)"/);
 assert.ok(!actual.includes('<text '));
});
