import type {Session} from './storage';
export function summarize(session:Session,now=new Date()){
 const totals={signal:{seconds:0,bookmarks:0,candidates:0},control:{seconds:0,bookmarks:0,candidates:0}};
 let current:'signal'|'control'|null=null,start=0;
 const close=(time:number)=>{if(current)totals[current].seconds+=Math.max(0,(time-start)/1000);start=time;};
 for(const e of session.events){const t=Date.parse(e.time);if(!Number.isFinite(t))continue;if(e.kind==='experiment-block'){close(t);current=e.detail.signalOn?'signal':'control';start=t;}else if(['signal-stopped','signal-ended','emergency-stop','paused'].includes(e.kind)){close(t);current=null;}else if(current&&e.kind==='manual-bookmark')totals[current].bookmarks++;else if(current&&e.kind==='candidate-light')totals[current].candidates++;}
 close(Date.parse(session.ended||now.toISOString()));return totals;
}
