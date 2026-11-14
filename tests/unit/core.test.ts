import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {initialSettings,segments,validate,randomSchedule} from '../../lib/signals';
import {horizontal,project,unproject,separation,orientation,calculateSky} from '../../lib/sky';
import {parseTLE,satelliteSky} from '../../lib/satellites';

test('Chilbolton reconstruction retains its verified 23×73 transcription',()=>{const d=JSON.parse(readFileSync('public/data/chilbolton.json','utf8'));assert.equal(d.bits.length,1679);assert.equal(d.width,23);assert.equal(d.height,73);assert.equal(d.bits.split('1').length-1,428);assert.equal(createHash('sha256').update(d.bits).digest('hex'),'6eb11753b32702e0a0eecde6ca8e837e4989e43ff515bbef5ff72548393708bc');});

test('CE5 count pattern emits three and four pulses with independent listening gaps',()=>{const a=segments({...initialSettings,mode:'ce5'});assert.equal(a.filter(s=>s.on).length,7);assert.equal(a.filter(s=>s.duration===8).length,2);assert.equal(a.reduce((n,s)=>n+s.duration,0),23);});

test('binary zero and one retain distinct tone frequencies and light polarity',()=>{const a=segments({...initialSettings,mode:'binary',bits:'01'});assert.equal(a[0].on,false);assert.equal(a[0].frequency,330);assert.equal(a[2].on,true);assert.equal(a[2].frequency,440);const b=segments({...initialSettings,mode:'binary',bits:'01',polarity:true});assert.equal(b[0].on,true);assert.equal(b[2].on,false);});

test('malformed and unbounded signal parameters are rejected',()=>{for(const bad of [{rate:0},{rate:NaN},{rate:30},{duration:Infinity},{frequency:-2},{duty:100},{bits:'101x'},{bits:''}])assert.throws(()=>validate({...initialSettings,...bad}));});

test('randomized controls preserve a balanced count',()=>{const a=randomSchedule(20,()=>.314);assert.equal(a.length,20);assert.equal(a.filter(Boolean).length,10);assert.notDeepEqual(a,Array.from({length:20},(_,i)=>i%2===0));});

test('sky projection centers a target and round-trips a selected camera ray',()=>{const v={az:285,alt:45,roll:17,fov:65},p=project(horizontal(285,45),v,390,844)!;assert.ok(Math.abs(p.x-195)<1e-6);assert.ok(Math.abs(p.y-422)<1e-6);const ray=unproject(80,240,v,390,844),r=project(ray,v,390,844)!;assert.ok(Math.abs(r.x-80)<1e-6);assert.ok(Math.abs(r.y-240)<1e-6);assert.ok(separation(ray,ray)<1e-5);assert.equal(project(horizontal(105,-45),v,390,844),null);});

test('device orientation maps portrait north and east pointing',()=>{const north=orientation(0,90,0),east=orientation(270,90,0);assert.ok(Math.abs(north.az)<1e-7);assert.ok(Math.abs(north.alt)<1e-7);assert.ok(Math.abs(east.az-90)<1e-7);});

test('astronomy positions are finite and Sun is near zenith at equinox local noon',()=>{const c={stars:{features:[]},names:{},lines:{features:[]}};const s=calculateSky(c,{lat:0,lon:0,source:'test'},new Date('2025-03-20T12:07:00Z'));assert.equal(s.objects.length,9);assert.ok(s.objects.every(o=>Number.isFinite(o.alt)&&Number.isFinite(o.az)));assert.ok(s.objects.find(o=>o.id==='Sun')!.alt>89);});

test('bundled star and constellation data resolve into finite positions',()=>{const c={stars:JSON.parse(readFileSync('public/data/stars.json','utf8')),names:JSON.parse(readFileSync('public/data/starnames.json','utf8')),lines:JSON.parse(readFileSync('public/data/constellations.json','utf8'))};const s=calculateSky(c,{lat:38.473,lon:-77.996,source:'test'},new Date('2026-09-08T02:00:00Z'));assert.ok(s.objects.length>4000);assert.ok(s.objects.every(o=>Number.isFinite(o.alt)));assert.ok(s.lines.length>80);});

test('invalid satellite input is rejected',()=>{assert.throws(()=>parseTLE('not TLE'));assert.deepEqual(satelliteSky([],{lat:0,lon:0,source:'test'},new Date()),[]);});

import {SignalEngine} from '../../lib/signals';
test('audio scheduler terminates at session boundary and stop silences all nodes',()=>{
 const param={value:0,setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}};
 let stops=0;
 class FakeContext{currentTime=0;destination={};createGain(){return{gain:{...param},connect(){},disconnect(){}};}createMediaStreamDestination(){return{stream:{},connect(){}};}createOscillator(){return{frequency:{...param},type:'sine',connect(){},disconnect(){},start(){},stop(){stops++;},onended:null};}resume(){return Promise.resolve();}close(){return Promise.resolve();}}
 (globalThis as any).window={AudioContext:FakeContext};const e=new SignalEngine();e.settings={...initialSettings,duration:1};e.sequence=segments(e.settings);e.started=0;e.next=59.96;e.context.currentTime=59.95;e.running=true;e.tick();assert.equal(e.next,60);assert.ok(e.nodes.size>0);e.stop();assert.equal(e.running,false);assert.equal(e.nodes.size,0);assert.equal(e.master.gain.value,0);assert.ok(stops>0);
});

import {summarize} from '../../lib/experiment';
test('session comparison measures separate exposure windows without counting after stop',()=>{const base=Date.parse('2026-09-08T00:00:00Z'),entry=(s:number,kind:string,detail={})=>({time:new Date(base+s*1000).toISOString(),kind,detail});const result=summarize({id:'test',title:'test',started:new Date(base).toISOString(),ended:new Date(base+90000).toISOString(),notes:'',events:[entry(0,'experiment-block',{signalOn:true}),entry(10,'manual-bookmark'),entry(30,'experiment-block',{signalOn:false}),entry(40,'candidate-light'),entry(60,'signal-ended'),entry(70,'manual-bookmark')]});assert.equal(result.signal.seconds,30);assert.equal(result.control.seconds,30);assert.equal(result.signal.bookmarks,1);assert.equal(result.control.candidates,1);});

import {envelopePath} from '../../lib/signals';
test('timed gate preview represents actual binary bits and CE5 listening windows',()=>{const zero=envelopePath({...initialSettings,mode:'binary',bits:'0000'}),one=envelopePath({...initialSettings,mode:'binary',bits:'1111'}),ce5=envelopePath({...initialSettings,mode:'ce5'});assert.ok(!zero.includes(',17'));assert.ok(one.includes(',17'));const points=[...ce5.matchAll(/[ML]([\d.]+),([\d.]+)/g)].map(m=>({x:Number(m[1]),y:Number(m[2])}));const pulses=points.slice(1).filter((p,i)=>p.y===17&&points[i].y===17&&p.x>points[i].x);assert.equal(pulses.length,3);assert.ok(Math.abs(pulses.reduce((sum,p)=>sum+(p.x-points[points.indexOf(p)-1].x)/340*8,0)-1.05)<.001);assert.notEqual(ce5,envelopePath(initialSettings));});

test('whitespace-only binary sequence is rejected',()=>assert.throws(()=>validate({...initialSettings,bits:' \n\t '})));
test('Stop cancels a pending audio start before it can emit output',async()=>{
 let resume!:()=>void;const param={value:0,setTargetAtTime(){},setValueAtTime(){},cancelScheduledValues(){}};
 class FakeContext{currentTime=0;destination={};createGain(){return{gain:{...param},connect(){}};}createMediaStreamDestination(){return{stream:{}};}resume(){return new Promise<void>(resolve=>resume=resolve);}}
 (globalThis as any).window={AudioContext:FakeContext};const engine=new SignalEngine();const pending=engine.start(initialSettings,()=>{});engine.stop();resume();assert.equal(await pending,false);assert.equal(engine.running,false);assert.equal(engine.timer,null);
});
