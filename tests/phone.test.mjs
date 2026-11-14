import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const handlers={};
vm.runInNewContext(readFileSync('public/sw.js','utf8'),{self:{addEventListener:(name,fn)=>handlers[name]=fn},location:{origin:'https://example.test'},URL,Response});
test('offline worker leaves sign-in, sign-out, callback and API requests to the network',()=>{
 for(const path of ['/signin-with-chatgpt','/signout-with-chatgpt','/callback?code=test','/api/satellites']){
  let intercepted=false;handlers.fetch({request:new Request('https://example.test'+path),respondWith:()=>intercepted=true});assert.equal(intercepted,false,path);
 }
});
test('offline worker never replaces the document with a React server payload',()=>{
 for(const headers of [{RSC:'1'},{Accept:'text/x-component'}]){
  let intercepted=false;handlers.fetch({request:new Request('https://example.test/',{headers}),respondWith:()=>intercepted=true});assert.equal(intercepted,false);
 }
});
test('Home Screen manifest resolves all icons with valid PNG dimensions',()=>{
 const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons){assert.ok(existsSync('public'+icon.src));if(icon.type==='image/png'){const png=readFileSync('public'+icon.src),n=Number(icon.sizes.split('x')[0]);assert.equal(png.readUInt32BE(16),n);assert.equal(png.readUInt32BE(20),n);}}
 assert.ok(existsSync('public/apple-touch-icon.png'));
});
test('a successful network response survives an offline-cache quota failure',async()=>{
 const events={};vm.runInNewContext(readFileSync('public/sw.js','utf8'),{self:{addEventListener:(name,fn)=>events[name]=fn},location:{origin:'https://example.test'},URL,Response,caches:{open:async()=>({put:async()=>{throw new DOMException('full','QuotaExceededError');},match:async()=>undefined})},fetch:async()=>new Response('fresh page')});let result;events.fetch({request:new Request('https://example.test/'),respondWith:p=>result=p});const response=await result;assert.equal(response.status,200);assert.equal(await response.text(),'fresh page');
});
