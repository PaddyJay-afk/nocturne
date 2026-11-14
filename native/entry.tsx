import React from 'react';
import {createRoot} from 'react-dom/client';
import {Capacitor} from '@capacitor/core';
import {Filesystem,Directory} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import App from '../app/page';
if(Capacitor.isNativePlatform()){
 (window as any).nocturneExport=async(blob:Blob,name:string)=>{
  const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
  const file=await Filesystem.writeFile({path:name.replace(/[^a-zA-Z0-9._-]/g,'-'),data,directory:Directory.Cache});
  await Share.share({title:'Nocturne observation',url:file.uri});
 };
}
createRoot(document.getElementById('root')!).render(<App/>);
