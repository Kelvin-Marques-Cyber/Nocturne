// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
let pending:Promise<IDBDatabase>|undefined;
function database(){return pending??=new Promise((resolve,reject)=>{const r=indexedDB.open('nocturne-studio',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function stored<T>(key:string):Promise<T|undefined>{const db=await database();return new Promise((resolve,reject)=>{const request=db.transaction('files').objectStore('files').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export async function persist(key:string,value:unknown){const db=await database();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??Error('Armazenamento cancelado.'));});}
