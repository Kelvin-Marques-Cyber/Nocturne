// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import{access}from'node:fs/promises';
import{execFile}from'node:child_process';
import{promisify}from'node:util';
import type{Project}from'../src/engine/model';
let pending:Promise<void>|undefined;
export async function ensureProjectFonts(p:Pick<Project,'lyrics'>){
 if(!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(p.lyrics))return;
 try{await access('public/NotoSansCJKjp-Regular.otf');await access('fonts/NotoSansCJKjp-Regular.otf');return;}catch{}
 pending??=promisify(execFile)(process.env.PYTHON??'python3',['scripts/fonts.py'],{timeout:60000}).then(()=>{}).finally(()=>{pending=undefined;});
 await pending;
}
