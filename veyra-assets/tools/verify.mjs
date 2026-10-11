import {readdirSync,readFileSync,existsSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const req=['brand','icons/outline','icons/active','icons/on-dark','interests','gender','illustrations','badges','tokens','styles'];
let checked=0,invalid=[];
for(const d of req)if(!existsSync(join(root,d)))invalid.push('Missing directory '+d);
function walk(dir){
 for(const item of readdirSync(dir,{withFileTypes:true})){
  const p=join(dir,item.name);
  if(item.isDirectory())walk(p);
  else if(p.endsWith('.svg')){
   const s=readFileSync(p,'utf8');checked++;
   if(!s.startsWith('<svg ')||!/<\/svg>\s*$/.test(s)||/<script\b|<foreignObject\b|onload\s*=|javascript:|xlink:href\s*=|href\s*=\s*["']https?:/i.test(s))
    invalid.push('Invalid SVG '+p);
  }
 }
}
for(const d of ['brand','icons','interests','gender','illustrations','badges'])if(existsSync(join(root,d)))walk(join(root,d));
for(const file of ['tokens/tokens.json','tokens/tokens.css','styles/components.css','styles/motion.css','USAGE.md','manifest.json'])if(!existsSync(join(root,file)))invalid.push('Missing '+file);
if(checked<300)invalid.push('Expected at least 300 SVGs; saw '+checked);
if(invalid.length){console.error(invalid.join('\n'));process.exit(1)}
console.log('VEYRA v2 asset pack OK: '+checked+' SVG files');
