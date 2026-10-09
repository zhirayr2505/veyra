// Derive all app/touch icons from the approved vector mark, never a stale dark asset.
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const svg=await readFile(resolve(root,'public/graphics/brand/veyra-app-coral.svg'));
for(const n of [180,192,512]){
 const dest=resolve(root,`public/graphics/brand/veyra-app-${n}.png`);
 const image=await sharp(svg,{density:240}).resize(n,n).png({compressionLevel:9}).toBuffer();
 await writeFile(dest,image);
 console.log(`VEYRA coral icon: ${n}px`);
}
