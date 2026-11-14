'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {readSatelliteCache,saveSatelliteCache,type CatalogCache} from '@/lib/satellite-cache';
import {toggleSatellite,type SatelliteFrame} from '@/lib/satellites';
import type {Location,View} from '@/lib/sky';
export function useSatellites(loc:Location,view:View,stage:React.RefObject<HTMLElement|null>){
 const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('Not loaded'),[frame,setFrame]=useState<SatelliteFrame|null>(null),[selected,setSelected]=useState<string[]>([]),[meta,setMeta]=useState<CatalogCache|null>(null),[results,setResults]=useState<{id:string;name:string;alt:number|null}[]>([]);
 const worker=useRef<Worker|null>(null),loaded=useRef(false),loading=useRef(false),pending=useRef(false),pendingCatalog=useRef<CatalogCache|null>(null),inputs=useRef({loc,view,enabled,selected}),queryId=useRef(0);
 inputs.current={loc,view,enabled,selected};
 const ensureWorker=useCallback(()=>{if(worker.current)return worker.current;if(!window.Worker)throw Error('Satellite tracking needs a browser with background calculation support.');
 const w=new Worker('/satellite-worker.js');worker.current=w;
 w.onmessage=event=>{const m=event.data;if(m.type==='loaded'){loaded.current=true;setFrame(null);setSelected([]);const data=pendingCatalog.current;if(data){setMeta(data);void saveSatelliteCache(data).catch(()=>setStatus(`${m.count.toLocaleString()} objects loaded · offline storage unavailable`));}setStatus(`${m.count.toLocaleString()} orbital records loaded`);loading.current=false;setBusy(false);}if(m.type==='frame'){pending.current=false;setFrame(m.frame);}if(m.type==='search'&&m.queryId===queryId.current)setResults(m.results);if(m.type==='error'){pending.current=false;loading.current=false;setBusy(false);setStatus(m.message);}};
 w.onerror=()=>{pending.current=false;loaded.current=false;loading.current=false;setBusy(false);setStatus('Satellite calculation stopped. Tap Load catalog to retry.');w.terminate();worker.current=null;setFrame(null);};return w;},[]);
 const load=useCallback(async(imported?:File)=>{if(loading.current)return;loading.current=true;setBusy(true);setStatus(imported?'Reading orbital file…':'Loading public satellite catalog…');
 try{const w=ensureWorker();let data:CatalogCache|undefined;
 if(imported){if(imported.size>32*1024*1024)throw Error('Choose an orbital file smaller than 32 MB.');data={id:'catalog',text:await imported.text(),fetched:new Date().toISOString(),source:`Imported · ${imported.name}`};}
 else{let cached:CatalogCache|undefined;try{cached=await readSatelliteCache();}catch{}
 if(cached&&Date.now()-Date.parse(cached.fetched)<12*3600000)data=cached;
 else try{const response=await fetch('/api/satellites',{signal:AbortSignal.timeout(20000)});const result=await response.json();if(!response.ok)throw Error(result.error||'Satellite source is unavailable.');data={id:'catalog',text:result.text,fetched:result.fetched,source:result.source};}catch(error){if(cached){data=cached;setStatus('Using cached orbital data. Source unavailable.');}else{const [snapshot,metadata]=await Promise.all([fetch('/data/satellite-catalog.csv'),fetch('/data/satellite-catalog-meta.json')]);if(!snapshot.ok||!metadata.ok)throw error;const info=await metadata.json();data={id:'catalog',text:await snapshot.text(),fetched:info.fetched,source:info.source};}}}
 if(!data?.text)throw Error('No orbital data returned.');pendingCatalog.current=data;w.postMessage({type:'load',text:data.text});
 }catch(error){setBusy(false);loading.current=false;setStatus(error instanceof Error?error.message:'Satellite catalog could not load.');}},[ensureWorker]);
 const toggle=useCallback((value:boolean)=>{setEnabled(value);if(value&&!loaded.current)void load();},[load]);
 const select=useCallback((id:string)=>setSelected(ids=>toggleSatellite(ids,id)),[]);
 const search=useCallback((query:string)=>{const id=++queryId.current;if(!worker.current||!loaded.current){setResults([]);return;}worker.current.postMessage({type:'search',query:query.trim().slice(0,80),loc:inputs.current.loc,time:Date.now(),queryId:id});},[]);
 useEffect(()=>{if(!enabled)return;const tick=()=>{if(document.hidden||pending.current||!loaded.current||!worker.current)return;const s=inputs.current,rect=stage.current?.getBoundingClientRect(),aspect=rect?rect.height/rect.width:1;const radius=Math.atan(Math.tan(s.view.fov*Math.PI/360)*Math.hypot(1,aspect))*180/Math.PI;pending.current=true;worker.current.postMessage({type:'frame',loc:s.loc,view:s.view,time:Date.now(),radius,selected:s.selected});};tick();const timer=setInterval(tick,750);return()=>clearInterval(timer);},[enabled,stage]);
 useEffect(()=>()=>worker.current?.terminate(),[]);
 return {enabled,toggle,busy,status,frame,selected,select,clear:()=>setSelected([]),meta,load,search,results};
}
