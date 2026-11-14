import {twoline2satrec,json2satrec,propagate,gstime,eciToEcf,ecfToLookAngles} from './satellite.js';
import {horizontal,project,separation,type Location,type SkyObject,type Vec,type View} from './sky';
export const MAX_CATALOG=60000,MAX_MARKERS=12,MAX_LABELS=4,MAX_PATHS=3,MAX_EPOCH_DAYS=7;
export const PATH_COLORS=['#7edfff','#e7a9f7','#f7ca77'];
export type Orbit={id:string;name:string;record:any};
export type SatellitePoint=SkyObject&{epoch:string;range:number;nextVec:Vec};
export type PathPoint={seconds:number;vec:Vec;alt:number};
export type SatellitePath={id:string;name:string;points:PathPoint[]};
export type SatelliteFrame={time:number;objects:SatellitePoint[];paths:SatellitePath[];total:number;above:number;inView:number;stale:number;invalid:number;scanMs:number};
export function parseCSV(text:string):Record<string,string>[] {
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('Unclosed quote in orbital CSV.');row.push(cell);if(row.some(Boolean))rows.push(row);const header=rows.shift()?.map(s=>s.trim().replace(/^\uFEFF/,''))||[];
 if(!header.includes('NORAD_CAT_ID')||!header.includes('EPOCH'))throw Error('Use a CelesTrak or Space-Track orbital CSV / JSON file.');
 return rows.map(r=>Object.fromEntries(header.map((key,i)=>[key,r[i]||''])));
}
export function parseCatalog(text:string):Orbit[]{
 if(text.length>32*1024*1024)throw Error('Orbital file exceeds 32 MB.');
 if(!text.trim().startsWith('[')&&!text.includes('NORAD_CAT_ID'))return parseTLE(text);
 const input=text.trim().startsWith('[')?JSON.parse(text):parseCSV(text);if(!Array.isArray(input))throw Error('Use an array of orbital records.');if(input.length>MAX_CATALOG)throw Error('Catalog exceeds 60,000 objects. Import a smaller catalog.');
 const records=new Map<string,Orbit>();
 for(const row of input){try{if(!row||typeof row.EPOCH!=='string'||!Number.isFinite(Date.parse(row.EPOCH.endsWith('Z')?row.EPOCH:row.EPOCH+'Z')))continue;
  const id=Number(row.NORAD_CAT_ID),e=Number(row.ECCENTRICITY),n=Number(row.MEAN_MOTION),incl=Number(row.INCLINATION);
  const required=['NORAD_CAT_ID','ECCENTRICITY','MEAN_MOTION','INCLINATION','RA_OF_ASC_NODE','ARG_OF_PERICENTER','MEAN_ANOMALY'];
  if(required.some(k=>row[k]==null||String(row[k]).trim()===''||!Number.isFinite(Number(row[k])))||!Number.isSafeInteger(id)||id<1||id>999999999||e<0||e>=1||n<=0||n>20||incl<0||incl>180)continue;
  const normalized={...row,NORAD_CAT_ID:id,BSTAR:row.BSTAR||0,MEAN_MOTION_DOT:row.MEAN_MOTION_DOT||0,MEAN_MOTION_DDOT:row.MEAN_MOTION_DDOT||0};
  const record=json2satrec(normalized);if(!validRecord(record))continue;const item={id:`sat-${id}`,name:String(row.OBJECT_NAME||id).slice(0,80),record};const old=records.get(item.id);if(!old||old.record.jdsatepoch<record.jdsatepoch)records.set(item.id,item);
 }catch{}}
 if(!records.size)throw Error('No usable orbital records found.');return [...records.values()];
}
function validRecord(r:any){return ['jdsatepoch','inclo','nodeo','ecco','argpo','mo','no'].every(k=>Number.isFinite(r[k]))&&r.no>0&&r.ecco>=0&&r.ecco<1;}
export function parseTLE(text:string):Orbit[]{const lines=text.trim().split(/\r?\n/).map(s=>s.trim()).filter(Boolean),out=new Map<string,Orbit>();for(let i=0;i<lines.length-1;i++){if(lines[i].startsWith('1 ')&&lines[i+1].startsWith('2 ')){try{if(lines[i].length<63||lines[i+1].length<63||lines[i].slice(2,7)!==lines[i+1].slice(2,7))continue;const record=twoline2satrec(lines[i],lines[i+1]);if(!validRecord(record))continue;const id=`sat-${record.satnum}`;out.set(id,{id,name:i>0&&!lines[i-1].startsWith('2 ')?lines[i-1].replace(/^0 /,''):record.satnum,record});}catch{}i++;}}if(!out.size)throw Error('No valid two-line orbital elements found.');if(out.size>MAX_CATALOG)throw Error('Catalog exceeds 60,000 objects.');return [...out.values()];}
export function orbitPosition(orbit:Orbit,loc:Location,date:Date){try{const result=propagate(orbit.record,date);if(!result?.position||typeof result.position==='boolean')return null;const obs={latitude:loc.lat*Math.PI/180,longitude:loc.lon*Math.PI/180,height:0};const look=ecfToLookAngles(obs,eciToEcf(result.position,gstime(date))),az=look.azimuth*180/Math.PI,alt=look.elevation*180/Math.PI;if(!Number.isFinite(az)||!Number.isFinite(alt)||!Number.isFinite(look.rangeSat))return null;return {az,alt,range:look.rangeSat,vec:horizontal(az,alt)};}catch{return null;}}
export function freshOrbit(orbit:Orbit,date:Date){return Math.abs(date.getTime()/86400000+2440587.5-orbit.record.jdsatepoch)<=MAX_EPOCH_DAYS;}
export function satelliteSky(records:Orbit[],loc:Location,date:Date):SkyObject[]{return records.flatMap(orbit=>{if(!freshOrbit(orbit,date))return[];const p=orbitPosition(orbit,loc,date);return p&&p.alt>=0?[{...p,id:orbit.id,name:`${orbit.name} · predicted`,kind:'Satellite',mag:2}]:[];});}
export function trajectory(orbit:Orbit,loc:Location,date:Date):SatellitePath {const points:PathPoint[]=[];for(let seconds=-30;seconds<=120;seconds+=5){const at=new Date(date.getTime()+seconds*1000);if(!freshOrbit(orbit,at))continue;const p=orbitPosition(orbit,loc,at);if(p)points.push({seconds,vec:p.vec,alt:p.alt});}return{id:orbit.id,name:orbit.name,points};}
export function visibleSatellites(objects:SatellitePoint[],view:View,w:number,h:number,selected:string[],focus:Vec|null=null){
 const center=focus||horizontal(view.az,view.alt);const pinned=new Set(selected);
 const candidates=objects.map(object=>({object,point:project(object.vec,view,w,h)})).filter((item):item is {object:SatellitePoint;point:{x:number;y:number}}=>!!item.point&&item.object.alt>=0&&item.point.x>=12&&item.point.x<=w-12&&item.point.y>=12&&item.point.y<=h-12);
 candidates.sort((a,b)=>Number(pinned.has(b.object.id))-Number(pinned.has(a.object.id))||separation(a.object.vec,center)-separation(b.object.vec,center)||a.object.id.localeCompare(b.object.id));
 const visible:typeof candidates=[];for(const item of candidates){if(visible.length>=MAX_MARKERS)break;if(!pinned.has(item.object.id)&&visible.some(v=>Math.hypot(v.point.x-item.point.x,v.point.y-item.point.y)<38))continue;visible.push(item);}return{visible,total:candidates.length};
}
export function toggleSatellite(ids:string[],id:string){return ids.includes(id)?ids.filter(s=>s!==id):[...ids,id].slice(-MAX_PATHS);}
