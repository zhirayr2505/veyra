import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compressPortrait,MAX_UPLOAD_BYTES} from '../web/v5/compressPortrait.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('camera original larger than 5MB compresses before checking server upload size',async()=>{
 const oldBitmap=globalThis.createImageBitmap,oldDocument=globalThis.document;
 const dim={};
 try{
  globalThis.createImageBitmap=async()=>({width:6000,height:4000,close(){}});
  globalThis.document={createElement:()=>({
   set width(x){dim.width=x},get width(){return dim.width},
   set height(x){dim.height=x},get height(){return dim.height},
   getContext:()=>({drawImage(){},imageSmoothingEnabled:true,imageSmoothingQuality:'high'}),
   toBlob:cb=>cb(new Blob(['webp bytes'],{type:'image/webp'}))
  })};
  const result=await compressPortrait({type:'image/jpeg',size:9*1024*1024,name:'camera.jpg'});
  assert.equal(result.type,'image/webp');
  assert.ok(result.size<MAX_UPLOAD_BYTES);
  assert.equal(dim.width,2048);
  assert.ok(dim.height<=2048);
 }finally{globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument}
});
test('registration uploads photos sequentially with confirmed count, retry and drag guidance',()=>{
 const code=read('web/v5/Registration.jsx');
 assert.match(code,/for\(const job of initial\)/);
 assert.match(code,/const retryUpload=async id/);
 assert.match(code,/const removeUpload=id/);
 assert.match(code,/await compressPortrait\(item\.file/);
 assert.match(code,/uploadPhoto\(compressed,n=>updateJob/);
 assert.match(code,/showDragHint/);
 assert.match(read('web/v5/Registration2026.css'),/@keyframes veyraDragExplain/);
});
