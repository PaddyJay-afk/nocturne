import fs from 'node:fs';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
const messages=[];
const self={postMessage:message=>messages.push(message)};
vm.runInNewContext(fs.readFileSync('public/satellite-worker.js','utf8'),{self,performance,Date,console,setTimeout});
const text=fs.readFileSync('public/data/satellite-catalog.csv','utf8');
const start=performance.now();self.onmessage({data:{type:'load',text}});const parseMs=performance.now()-start;
if(messages.at(-1).type!=='loaded')throw Error(JSON.stringify(messages.at(-1)));
const count=messages.at(-1).count;
const loc={lat:38.473,lon:-77.996,source:'benchmark'},view={az:285,alt:45,roll:0,fov:70};
const time=Date.parse(JSON.parse(fs.readFileSync('public/data/satellite-catalog-meta.json','utf8')).fetched);
const samples=[];
for(let i=0;i<8;i++){const begin=performance.now();self.onmessage({data:{type:'frame',loc,view,time:time+i*1000,radius:60,selected:messages.at(-1)?.frame?.objects?.slice(0,3).map(o=>o.id)||[]}});const duration=performance.now()-begin,frame=messages.at(-1).frame;if(!frame)throw Error(JSON.stringify(messages.at(-1)));samples.push({durationMs:+duration.toFixed(2),scanMs:+frame.scanMs.toFixed(2),transferredObjects:frame.objects.length,paths:frame.paths.length,bytes:JSON.stringify(frame).length,above:frame.above,stale:frame.stale});}
console.log(JSON.stringify({catalogRecords:count,downloadBytes:Buffer.byteLength(text),workerBytes:fs.statSync('public/satellite-worker.js').size,parseMs:+parseMs.toFixed(2),samples,environment:'Node VM on test server, not an iPhone benchmark'},null,2));
