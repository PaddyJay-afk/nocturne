import {build} from 'esbuild';
await build({entryPoints:['lib/satellite-worker.ts'],outfile:'public/satellite-worker.js',bundle:true,minify:true,format:'iife',platform:'browser',target:'es2020'});
console.log('Satellite background worker built.');
