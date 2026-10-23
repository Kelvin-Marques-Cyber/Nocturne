// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import{analyzeSamples}from'./analyze';
self.onmessage=(event:MessageEvent<{samples:Float32Array;sampleRate:number}>)=>{try{self.postMessage({analysis:analyzeSamples(event.data.samples,event.data.sampleRate)});}catch(error){self.postMessage({error:String(error)});}};
