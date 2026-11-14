import * as A from './astronomy';
export type Vec=[number,number,number];
export type SkyObject={id:string;name:string;kind:string;mag:number;az:number;alt:number;ra?:number;dec?:number;vec:Vec;distance?:number};
export type Location={lat:number;lon:number;source:string;accuracy?:number};
export type View={az:number;alt:number;roll:number;fov:number};
const R=Math.PI/180;
export const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export const wrap=(v:number)=>((v%360)+360)%360;
export const dot=(a:Vec,b:Vec)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export function horizontal(az:number,alt:number):Vec{return [Math.cos(alt*R)*Math.sin(az*R),Math.cos(alt*R)*Math.cos(az*R),Math.sin(alt*R)];}
export function basis(v:View){const z=horizontal(v.az,v.alt),right:Vec=[Math.cos(v.az*R),-Math.sin(v.az*R),0],up:Vec=[-Math.sin(v.alt*R)*Math.sin(v.az*R),-Math.sin(v.alt*R)*Math.cos(v.az*R),Math.cos(v.alt*R)];const c=Math.cos(v.roll*R),s=Math.sin(v.roll*R);return {z,right:right.map((n,i)=>n*c+up[i]*s) as Vec,up:up.map((n,i)=>n*c-right[i]*s) as Vec};}
export function project(p:Vec,v:View,w:number,h:number){const b=basis(v),z=dot(p,b.z);if(z<=0.01)return null;const f=w/(2*Math.tan(v.fov*R/2));return {x:w/2+dot(p,b.right)*f/z,y:h/2-dot(p,b.up)*f/z};}
export function unproject(x:number,y:number,v:View,w:number,h:number):Vec{const b=basis(v),f=w/(2*Math.tan(v.fov*R/2)),dx=(x-w/2)/f,dy=(h/2-y)/f;const p=b.z.map((n,i)=>n+b.right[i]*dx+b.up[i]*dy) as Vec,l=Math.hypot(...p);return p.map(n=>n/l) as Vec;}
export function toAngles(p:Vec){return{az:wrap(Math.atan2(p[0],p[1])/R),alt:Math.asin(clamp(p[2],-1,1))/R};}
export function separation(a:Vec,b:Vec){return Math.acos(clamp(dot(a,b),-1,1))/R;}
export function orientation(alpha:number,beta:number,gamma:number){const a=alpha*R,b=beta*R,g=gamma*R;const forward:Vec=[-Math.cos(a)*Math.sin(g)-Math.sin(a)*Math.sin(b)*Math.cos(g),-Math.sin(a)*Math.sin(g)+Math.cos(a)*Math.sin(b)*Math.cos(g),-Math.cos(b)*Math.cos(g)];const top:Vec=[-Math.sin(a)*Math.cos(b),Math.cos(a)*Math.cos(b),Math.sin(b)];const angles=toAngles(forward),flat=basis({...angles,roll:0,fov:65});return {...angles,roll:Math.atan2(-dot(top,flat.right),dot(top,flat.up))/R};}
export type Catalog={stars:any;names:Record<string,any>;lines:any};
export async function loadCatalog():Promise<Catalog>{const [stars,names,lines]=await Promise.all(['/data/stars.json','/data/starnames.json','/data/constellations.json'].map(async u=>{const r=await fetch(u);if(!r.ok)throw Error('Star catalog unavailable. Connect once and retry.');return r.json();}));return{stars,names,lines};}
export function calculateSky(c:Catalog,loc:Location,date:Date){const observer=new A.Observer(loc.lat,loc.lon,0),rotation=A.Rotation_EQJ_EQD(date),lst=A.SiderealTime(date)*15+loc.lon,lat=loc.lat*R;
 const convert=(ra:number,dec:number)=>{const vec=A.RotateVector(rotation,A.VectorFromSphere(new A.Spherical(dec,wrap(ra),1),date)),eq=A.EquatorFromVector(vec),ha=(lst-eq.ra*15)*R,d=eq.dec*R;const east=-Math.cos(d)*Math.sin(ha),north=Math.sin(d)*Math.cos(lat)-Math.cos(d)*Math.cos(ha)*Math.sin(lat),up=Math.sin(d)*Math.sin(lat)+Math.cos(d)*Math.cos(ha)*Math.cos(lat);const v:Vec=[east,north,up];return{...toAngles(v),vec:v};};
 const objects:SkyObject[]=c.stars.features.map((s:any)=>{const [ra,dec]=s.geometry.coordinates,n=c.names[String(s.id)];return{id:String(s.id),name:n?.name||[n?.desig,n?.c].filter(Boolean).join(' ')||`HIP ${s.id}`,kind:'Star',mag:s.properties.mag,ra:wrap(ra)/15,dec,...convert(ra,dec)};});
 for(const body of [A.Body.Sun,A.Body.Moon,A.Body.Mercury,A.Body.Venus,A.Body.Mars,A.Body.Jupiter,A.Body.Saturn,A.Body.Uranus,A.Body.Neptune]){const eq=A.Equator(body,date,observer,true,true),h=A.Horizon(date,observer,eq.ra,eq.dec,'normal'),illum=A.Illumination(body,date);objects.push({id:body,name:body,kind:body===A.Body.Moon?'Moon':body===A.Body.Sun?'Sun':'Planet',mag:illum.mag,ra:eq.ra,dec:eq.dec,az:h.azimuth,alt:h.altitude,vec:horizontal(h.azimuth,h.altitude),distance:eq.dist});}
 const lines=c.lines.features.flatMap((f:any)=>f.geometry.coordinates.map((line:number[][])=>({name:f.id,points:line.map(([ra,dec])=>convert(ra,dec).vec)})));
 return{objects:objects.sort((a,b)=>a.mag-b.mag),lines};
}
