import {visibleSatellites,PATH_COLORS,MAX_LABELS,type SatelliteFrame,type SatellitePoint} from './satellites';
import {project,clamp,type Vec,type View} from './sky';
type Rect={x:number;y:number;w:number;h:number};
export type SatelliteHit={id:string;name:string;x:number;y:number};
export function drawSatellites(ctx:CanvasRenderingContext2D,frame:SatelliteFrame,view:View,w:number,h:number,selected:string[],blocked:Rect[],focus:Vec|null,night:boolean,opacity:number,time=Date.now()):SatelliteHit[]{
 if(time-frame.time>10000)return[];
 const t=clamp((time-frame.time)/1000,0,1);
 const objects:SatellitePoint[]=frame.objects.map(o=>{const vec=o.vec.map((v,i)=>v+(o.nextVec[i]-v)*t) as Vec,n=Math.hypot(...vec);return{...o,vec:vec.map(v=>v/n) as Vec};});
 const protectedPoint=focus?project(focus,view,w,h):null;
 const obscured=(x:number,y:number)=>blocked.some(b=>x>b.x-5&&x<b.x+b.w+5&&y>b.y-5&&y<b.y+b.h+5);
 const protect=(x:number,y:number)=>!!protectedPoint&&Math.hypot(x-protectedPoint.x,y-protectedPoint.y)<24;
 const available=objects.filter(o=>{const p=project(o.vec,view,w,h);return p&&!obscured(p.x,p.y)&&!protect(p.x,p.y);});
 const {visible}=visibleSatellites(available,view,w,h,selected,focus);
 const color=(index:number)=>night?['#ff9b8b','#cf726b','#eeb5a6'][index]:PATH_COLORS[index];
 ctx.save();ctx.lineWidth=1.5;ctx.globalAlpha=Math.min(.75,opacity/100);
 for(const path of frame.paths){const index=selected.indexOf(path.id);if(index<0)continue;ctx.strokeStyle=color(index);let previous:{x:number;y:number}|null=null;
  for(const point of path.points){const p=point.alt>=0?project(point.vec,view,w,h):null;if(!p||p.x<0||p.y<0||p.x>w||p.y>h||obscured(p.x,p.y)||protect(p.x,p.y)){previous=null;continue;}
   if(previous&&Math.hypot(p.x-previous.x,p.y-previous.y)<w*.4){ctx.setLineDash(point.seconds<0?[2,5]:index===0?[]:index===1?[7,4]:[2,3]);ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(p.x,p.y);ctx.stroke();}
   if(point.seconds===30||point.seconds===60||point.seconds===120){ctx.setLineDash([]);ctx.fillStyle=color(index);ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();}
   previous=p;
  }
 }
 ctx.setLineDash([]);const hits:SatelliteHit[]=[],labels:Rect[]=[];
 for(const {object,point:p} of visible){if(obscured(p.x,p.y)||protect(p.x,p.y))continue;const index=selected.indexOf(object.id);ctx.globalAlpha=index>=0?.9:.55;ctx.strokeStyle=index>=0?color(index):night?'#d68d83':'#9bdae6';ctx.lineWidth=index>=0?2:1.2;
  // Hollow diamond preserves the camera pixels at the predicted point.
  const r=index>=0?8:5;ctx.beginPath();ctx.moveTo(p.x,p.y-r);ctx.lineTo(p.x+r,p.y);ctx.lineTo(p.x,p.y+r);ctx.lineTo(p.x-r,p.y);ctx.closePath();ctx.stroke();hits.push({id:object.id,name:object.name,x:p.x,y:p.y});
  if(labels.length>=MAX_LABELS)continue;ctx.font='500 13px Arial';const text=`${index>=0?index+1+'. ':''}${object.name.slice(0,24)}`,width=ctx.measureText(text).width,x=clamp(p.x+12,5,Math.max(5,w-width-5)),y=p.y-10;
  if(y<15||[...blocked,...labels].some(b=>x+width>b.x&&x<b.x+b.w&&y>b.y&&y-16<b.y+b.h))continue;
  ctx.globalAlpha=opacity/100;ctx.lineWidth=3;ctx.strokeStyle='#080c14';ctx.strokeText(text,x,y);ctx.fillStyle=index>=0?color(index):night?'#d68d83':'#b6e0e8';ctx.fillText(text,x,y);labels.push({x,y:y-18,w:width+10,h:24});
 }
 ctx.restore();return hits;
}
