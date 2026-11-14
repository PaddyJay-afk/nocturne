import test from 'node:test';
import assert from 'node:assert/strict';
import {transform} from 'esbuild';
import fs from 'node:fs';
import vm from 'node:vm';
const {code}=await transform(fs.readFileSync('app/api/satellites/route.ts','utf8'),{loader:'ts',format:'cjs'});
function setup(fetcher){const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,fetch:fetcher,Response,Request,Blob,AbortSignal,Date,Promise});return module.exports;}
const csv='OBJECT_NAME,NORAD_CAT_ID,EPOCH\nISS,25544,2026-09-08T12:00:00';
test('concurrent catalog requests share one upstream download and reuse cached data',async()=>{let calls=0;const {GET}=setup(async()=>{calls++;return new Response(csv);});const results=await Promise.all([GET(),GET(),GET()]);assert.equal(calls,1);assert.ok(results.every(r=>r.status===200));assert.equal((await results[0].json()).text,csv);await GET();assert.equal(calls,1);});
test('provider errors stop repeated downloads and return a useful retry interval',async()=>{let calls=0;const {GET}=setup(async()=>{calls++;return new Response('blocked',{status:403});});const first=await GET();assert.equal(first.status,503);assert.equal(first.headers.get('retry-after'),'7200');assert.equal((await GET()).status,503);assert.equal(calls,1);});
test('HTML masquerading as successful data is rejected',async()=>{const {GET}=setup(async()=>new Response('<html>error</html>'));assert.equal((await GET()).status,503);});
