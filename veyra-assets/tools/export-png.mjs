import sharp from 'sharp';
import {readFileSync,mkdirSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve,relative} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(root,'exports','png');
const requested=process.argv.includes('--all');
const files=requested?
 JSON.parse(readFileSync(join(root,'manifest.json'),'utf8')).assets:
 ['brand/veyra-app-icon.svg','brand/veyra-telegram-avatar.svg','brand/veyra-splash.svg','brand/veyra-wordmark-purple.svg','brand/veyra-symbol-purple.svg'];
for(const p of files){
 const src=join(root,p);
 const target=join(out,p.replace(/\.svg$/i,'.png'));
 mkdirSync(dirname(target),{recursive:true});
 let width=p.includes('splash')?1080:p.includes('wordmark')?900:p.startsWith('brand/')?512:p.startsWith('illustrations/')?640:p.startsWith('badges/')?340:96;
 await sharp(src).resize({width,withoutEnlargement:false}).png({compressionLevel:9}).toFile(target);
 console.log(relative(root,target));
}
console.log('Exported '+files.length+' transparent PNG files under exports/png/');
