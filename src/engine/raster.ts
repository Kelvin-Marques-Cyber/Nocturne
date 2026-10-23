// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import sharp from 'sharp';
import{resolve}from'node:path';
// Keep the exported film's font independent of the machine's installed fonts.
process.env.FONTCONFIG_FILE??=resolve('fonts/fonts.conf');
sharp.concurrency(1);
export function rasterize(svg:string){return sharp(Buffer.from(svg)).removeAlpha().png({compressionLevel:2,adaptiveFiltering:false}).toBuffer();}
// Film export streams raw pixels. PNG compression and decoding belong only to
// still-image delivery, not to every intermediate frame of an H.264 movie.
export function rasterizeRGB(svg:string){return sharp(Buffer.from(svg)).removeAlpha().toColourspace('srgb').raw().toBuffer();}
