import {build} from 'esbuild';
import {readdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const out=await mkdtemp(join(tmpdir(),'nocturne-tests-'));
try{
 const files=(await readdir('tests/unit')).filter(f=>f.endsWith('.test.ts'));
 await build({entryPoints:files.map(f=>'tests/unit/'+f),outdir:out,bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
 const result=spawnSync(process.execPath,['--test',...files.map(f=>join(out,f.replace(/\.ts$/,'.mjs')))],{stdio:'inherit'});
 process.exitCode=result.status??1;
}finally{await rm(out,{recursive:true,force:true});}
