import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {transform} from 'esbuild';
import {readFile} from 'node:fs/promises';
const {code}=await transform(await readFile('lib/storage.ts','utf8'),{loader:'ts',format:'cjs'});
function setup({failOpen=false,cloneFailure=false,quota=false,abort=false}={}){
 const rows={sessions:new Map(),clips:new Map()};let opened=0;
 const db={transaction(names){const tx={};const staged=Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,new Map(v)]));let count=0,done=false;
 const finish=()=>{if(count||done)return;done=true;if(abort){tx.error=new DOMException('aborted','AbortError');tx.onabort?.();return;}for(const name of (Array.isArray(names)?names:[names]))rows[name]=staged[name];tx.oncomplete?.();};
 const request=(fn)=>{const r={};count++;queueMicrotask(()=>{try{r.result=fn();r.onsuccess?.();}catch(e){done=true;tx.error=e;tx.onerror?.();}count--;queueMicrotask(finish);});return r;};
 tx.objectStore=name=>({put(value){if(cloneFailure&&value.blob)throw new DOMException('blob clone failed','DataCloneError');return request(()=>{if(quota)throw new DOMException('quota','QuotaExceededError');staged[name].set(value.id,value);return value.id;});},getAll:()=>request(()=>[...staged[name].values()]),delete:id=>request(()=>staged[name].delete(id)),openCursor(){const r={},items=[...staged[name].entries()];let i=0;count++;const next=()=>queueMicrotask(()=>{const item=items[i++];r.result=item?{value:item[1],delete:()=>staged[name].delete(item[0]),continue:next}:null;r.onsuccess?.();if(!item){count--;queueMicrotask(finish);}});next();return r;}});return tx;},close(){}};
 const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,Blob,DOMException,Error,Promise,indexedDB:{open(){opened++;const req={result:db};queueMicrotask(()=>{if(failOpen&&opened===1){req.error=new DOMException('temporarily blocked','UnknownError');req.onerror();}else req.onsuccess();});return req;}}});return {api:module.exports,rows,get opened(){return opened;}};
}
const clip={id:'c',sessionId:'s',kind:'video',created:'2026-09-08',name:'test.mp4',blob:new Blob(['test video'],{type:'video/mp4'})};
test('session persistence retries after an initial database failure',async()=>{const f=setup({failOpen:true});await assert.rejects(f.api.listSessions());await f.api.putSession({id:'s',notes:'test'});assert.equal((await f.api.listSessions())[0].notes,'test');assert.equal(f.opened,2);});
test('clip round trip preserves bytes and media type',async()=>{const f=setup();await f.api.putClip(clip);const [saved]=await f.api.listClips();assert.equal(await saved.blob.text(),'test video');assert.equal(saved.blob.type,'video/mp4');});
test('Blob DataCloneError retries using binary data and reads both formats',async()=>{const f=setup({cloneFailure:true});await f.api.putClip(clip);assert.ok(f.rows.clips.get('c').bytes);const [saved]=await f.api.listClips();assert.equal(await saved.blob.text(),'test video');assert.equal(saved.blob.type,'video/mp4');});
test('actual quota failure is preserved for accurate user feedback',async()=>{await assert.rejects(setup({quota:true}).api.putClip(clip),{name:'QuotaExceededError'});});
test('transaction abort cannot report a successful save',async()=>{await assert.rejects(setup({abort:true}).api.putClip(clip),{name:'AbortError'});});
test('deleting a session removes only its own clips in one transaction',async()=>{const f=setup();await f.api.putSession({id:'s'});await f.api.putSession({id:'other'});await f.api.putClip(clip);await f.api.putClip({...clip,id:'keep',sessionId:'other'});await f.api.deleteSession('s');assert.deepEqual(Array.from(await f.api.listSessions(),s=>s.id),['other']);assert.deepEqual(Array.from(await f.api.listClips(),s=>s.id),['keep']);});
