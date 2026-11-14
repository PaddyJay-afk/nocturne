import {orientation} from './sky';
export type MotionStatus='off'|'requesting'|'waiting'|'active'|'error';
type PermissionAPI={prototype?:object;requestPermission?:(absolute?:boolean)=>Promise<string>};
export type MotionHost=EventTarget & {isSecureContext?:boolean;DeviceOrientationEvent?:PermissionAPI};
export type Reading={alpha:number|null;beta:number|null;gamma:number|null;absolute?:boolean;webkitCompassHeading?:number;webkitCompassAccuracy?:number};
export function motionReading(e:Reading){
 const heading=e.webkitCompassHeading;
 const compass=typeof heading==='number'&&Number.isFinite(heading)&&heading>=0&&heading<=360&&!(typeof e.webkitCompassAccuracy==='number'&&e.webkitCompassAccuracy<0);
 if(!Number.isFinite(e.beta)||!Number.isFinite(e.gamma)||(!compass&&!Number.isFinite(e.alpha)))return null;
 const view=orientation(compass?360-heading!:e.alpha!,e.beta!,e.gamma!);
 return {view,absolute:compass||e.absolute===true,accuracy:compass&&Number.isFinite(e.webkitCompassAccuracy)?e.webkitCompassAccuracy!:null};
}
export function motionError(error:unknown){
 const name=(error as {name?:string})?.name;
 if(name==='NotAllowedError'||name==='SecurityError')return 'Motion permission was blocked. Open Nocturne directly in Safari, allow motion access when prompted, then try again. Manual pointing remains available.';
 return error instanceof Error?error.message:'Motion could not start. Open Nocturne in Safari and try again.';
}
// Invoke directly in the button handler: iOS permission must retain user activation.
export function requestMotion(host:MotionHost):Promise<void>{
 if(host.isSecureContext===false)return Promise.reject(Error('Motion requires a secure connection. Open the HTTPS Nocturne link directly in Safari.'));
 const api=host.DeviceOrientationEvent;
 if(!api)return Promise.reject(Error('This browser does not expose motion sensors. Use Share → Open in Safari, then tap Enable motion again.'));
 try{return (api.requestPermission?api.requestPermission.call(api,true):Promise.resolve('granted')).then(result=>{if(result!=='granted')throw new DOMException('Motion permission declined','NotAllowedError');});}catch(error){return Promise.reject(error);}
}
export function watchMotion(host:EventTarget,onReading:(r:NonNullable<ReturnType<typeof motionReading>>)=>void,onTimeout:()=>void,timeoutMs=8000){
 let seenAbsolute=false,last=0,stopped=false;
 const timer=setTimeout(()=>{stop();onTimeout();},timeoutMs);
 const listener=(event:Event)=>{const reading=motionReading(event as unknown as Reading);if(!reading||stopped)return;if(seenAbsolute&&!reading.absolute)return;seenAbsolute ||= reading.absolute;clearTimeout(timer);const now=performance.now();if(last&&now-last<45)return;last=now;onReading(reading);};
 function stop(){stopped=true;clearTimeout(timer);host.removeEventListener('deviceorientation',listener);host.removeEventListener('deviceorientationabsolute',listener);}
 host.addEventListener('deviceorientation',listener);host.addEventListener('deviceorientationabsolute',listener);return stop;
}
