import {parseCatalog,orbitPosition,freshOrbit,trajectory,type Orbit,type SatelliteFrame,type SatellitePoint} from './satellites';
import {horizontal,separation,type Location,type View} from './sky';
let catalog:Orbit[]=[],above:Orbit[]=[],lastScan=0,lastLoc='',stale=0,invalid=0,scanMs=0;
self.onmessage=(event:MessageEvent)=>{const m=event.data;try{
 if(m.type==='load'){catalog=parseCatalog(m.text);above=[];lastScan=0;self.postMessage({type:'loaded',count:catalog.length});return;}
 if(m.type==='search'){const query=String(m.query||'').toLowerCase();const results=query?catalog.filter(o=>o.name.toLowerCase().includes(query)||o.id.slice(4).includes(query)).slice(0,30).map(o=>({id:o.id,name:o.name,alt:freshOrbit(o,new Date(m.time))?orbitPosition(o,m.loc,new Date(m.time))?.alt??null:null})):[];self.postMessage({type:'search',queryId:m.queryId,results});return;}
 if(m.type!=='frame')return;const loc=m.loc as Location,view=m.view as View,date=new Date(m.time),key=`${loc.lat},${loc.lon}`;
 if(!catalog.length)throw Error('Load satellite data first.');
 if(m.time-lastScan>15000||m.time<lastScan||key!==lastLoc){const start=performance.now();stale=0;invalid=0;above=[];for(const orbit of catalog){if(!freshOrbit(orbit,date)){stale++;continue;}const p=orbitPosition(orbit,loc,date);if(!p){invalid++;continue;}if(p.alt>=-3)above.push(orbit);}lastScan=m.time;lastLoc=key;scanMs=performance.now()-start;}
 const selected=(m.selected as string[]).slice(0,3),center=horizontal(view.az,view.alt);let inView=0,aboveCount=0;
 const pool:{orbit:Orbit;p:NonNullable<ReturnType<typeof orbitPosition>>;angle:number}[]=[];
 for(const orbit of above){const p=orbitPosition(orbit,loc,date);if(!p)continue;if(p.alt>=0)aboveCount++;const angle=separation(center,p.vec);if(p.alt>=0&&angle<Math.min(170,m.radius+10)){inView++;pool.push({orbit,p,angle});}else if(selected.includes(orbit.id))pool.push({orbit,p,angle});}
 pool.sort((a,b)=>Number(selected.includes(b.orbit.id))-Number(selected.includes(a.orbit.id))||a.angle-b.angle);
 const objects:SatellitePoint[]=pool.slice(0,80).map(({orbit,p})=>({...p,id:orbit.id,name:orbit.name,kind:'Satellite',mag:2,epoch:new Date((orbit.record.jdsatepoch-2440587.5)*86400000).toISOString(),nextVec:orbitPosition(orbit,loc,new Date(m.time+1000))?.vec||p.vec}));
 const paths=selected.flatMap(id=>{const orbit=catalog.find(o=>o.id===id);return orbit&&freshOrbit(orbit,date)?[trajectory(orbit,loc,date)]:[];});
 const frame:SatelliteFrame={time:m.time,objects,paths,total:catalog.length,above:aboveCount,inView,stale,invalid,scanMs};self.postMessage({type:'frame',frame});
 }catch(error){self.postMessage({type:'error',message:error instanceof Error?error.message:'Satellite calculations failed.'});}};
