const SOURCE='https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=csv';
const TTL=12*3600;
type Payload={text:string;fetched:string;source:string};
let cached:Payload|null=null,pending:Promise<Response>|null=null,failedUntil=0;
async function fetchCatalog(){
 const shared=(globalThis.caches as CacheStorage&{default?:Cache}|undefined)?.default;
 const key=new Request('https://nocturne-cache.internal/celestrak-active-csv-v1');
 if(shared){try{const hit=await shared.match(key);if(hit)return hit;}catch{}}
 if(cached&&Date.now()-Date.parse(cached.fetched)<TTL*1000)return Response.json(cached,{headers:{'Cache-Control':`private,max-age=${TTL}`}});
 if(Date.now()<failedUntil)return Response.json({error:'Satellite source is temporarily unavailable. Use cached data or import an orbital file; automatic retries are paused.'},{status:503});
 try{
 const response=await fetch(SOURCE,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(`Source returned ${response.status}`);
 if(Number(response.headers.get('content-length'))>16*1024*1024)throw Error('Catalog too large');
 const reader=response.body?.getReader();if(!reader)throw Error('Empty source');let bytes=0;const chunks:Uint8Array[]=[];for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>16*1024*1024){await reader.cancel();throw Error('Catalog too large');}chunks.push(value);}
 const text=await new Blob(chunks as BlobPart[]).text();if(!text.startsWith('OBJECT_NAME,')||!text.includes('NORAD_CAT_ID')||!text.includes('EPOCH'))throw Error('Invalid orbital CSV');
 cached={text,fetched:new Date().toISOString(),source:'CelesTrak · public active satellites'};
 const result=Response.json(cached,{headers:{'Cache-Control':`public,max-age=${TTL}`}});if(shared)try{await shared.put(key,result.clone());}catch{}return result;
 }catch{failedUntil=Date.now()+2*3600000;const error=Response.json({error:'CelesTrak is unavailable. Use cached data or import current CSV, JSON or TLE orbital data. Retry after two hours.'},{status:503,headers:{'Cache-Control':'public,max-age=7200','Retry-After':'7200'}});if(shared)try{await shared.put(key,error.clone());}catch{}return error;}
}
export async function GET(){if(!pending)pending=fetchCatalog().finally(()=>{pending=null;});return (await pending).clone();}
