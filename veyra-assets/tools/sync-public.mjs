import {cpSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,join} from 'node:path';
const here=dirname(fileURLToPath(import.meta.url));
const kit=resolve(here,'..'); const project=resolve(kit,'..');
const destination=join(project,'public','veyra-v2');
const folders=['brand','icons','interests','gender','illustrations','badges'];
const dry=process.argv.includes('--dry-run');
for(const folder of folders){
 const source=join(kit,folder);
 if(!existsSync(source))throw Error('Missing '+source);
 if(!dry){mkdirSync(destination,{recursive:true});cpSync(source,join(destination,folder),{recursive:true,force:true})}
 console.log((dry?'[dry] ':'copied ')+folder+' -> '+join(destination,folder));
}
console.log(dry?'No files changed.':'VEYRA V2 assets are now at /veyra-v2/ for the next UI rebuild.');
