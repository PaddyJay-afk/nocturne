import test from 'node:test';
import assert from 'node:assert/strict';
import {drawSatellites} from '../../lib/satellite-overlay';
import {unproject,type Vec} from '../../lib/sky';
import type {SatelliteFrame,SatellitePoint} from '../../lib/satellites';
const view={az:180,alt:45,roll:0,fov:70};
const objects:SatellitePoint[]=Array.from({length:80},(_,i)=>{const vec=unproject(20+(i%8)*50,20+Math.floor(i/8)*70,view,400,800);return{id:'sat-'+i,name:'TEST '+i,kind:'Satellite',mag:2,alt:45,az:180,vec,nextVec:vec,range:600,epoch:'2026-09-08'};});
const frame:SatelliteFrame={time:1000,objects,paths:[],total:80,above:80,inView:80,stale:0,invalid:0,scanMs:1};
function context(){let fills=0,texts=0;const ctx={save(){},restore(){},setLineDash(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},closePath(){},arc(){},fill(){fills++;},strokeText(){},fillText(){texts++;},measureText(t:string){return{width:t.length*6};}};return{ctx:ctx as unknown as CanvasRenderingContext2D,get fills(){return fills;},get texts(){return texts;}};}
test('overlay bounds markers and labels and uses hollow markers',()=>{const c=context();const hits=drawSatellites(c.ctx,frame,view,400,800,[],[],null,false,65,1000);assert.ok(hits.length<=12&&hits.length>0);assert.ok(c.texts<=4);assert.equal(c.fills,0);});
test('chrome occlusion is filtered before selecting scarce marker slots',()=>{const c=context();const hits=drawSatellites(c.ctx,frame,view,400,800,[],[{x:0,y:0,w:400,h:450}],null,false,65,1000);assert.equal(hits.length,12);assert.ok(hits.every(h=>h.y>450));});
test('unknown point has a clear center and stale frames have no clickable markers',()=>{const c=context(),focus=objects[20].vec as Vec;const hits=drawSatellites(c.ctx,frame,view,400,800,[],[],focus,false,65,1000);assert.ok(!hits.some(h=>h.id===objects[20].id));assert.deepEqual(drawSatellites(c.ctx,frame,view,400,800,[],[],null,false,65,12000),[]);});
