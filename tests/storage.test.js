import {test} from 'node:test';
import assert from 'node:assert/strict';
import {storage} from '../server/integrations.js';

test('Storage sends both apikey and Authorization for server secret keys',async(t)=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls.push(options.headers);
  return new Response(JSON.stringify({id:'veyra-media',public:false}),{status:200});
 });
 await storage({SUPABASE_URL:'https://storage.example',SUPABASE_SECRET_KEY:'sb_secret_test_only'}).ensure();
 assert.equal(calls[0].apikey,'sb_secret_test_only');
 assert.equal(calls[0].Authorization,'Bearer sb_secret_test_only');
 await storage({SUPABASE_URL:'https://storage.example',SUPABASE_SECRET_KEY:'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature'}).ensure();
 assert.equal(calls[1].Authorization,'Bearer eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature');
});

test('rejects malformed Supabase secrets before making a request',async(t)=>{
 let requested=false;
 t.mock.method(globalThis,'fetch',async()=>{requested=true;return new Response('{}',{status:200});});
 assert.throws(()=>storage({SUPABASE_URL:'https://storage.example',SUPABASE_SECRET_KEY:'opaque-test-key'}),/SUPABASE_SECRET_KEY_INVALID_FORMAT/);
 assert.equal(requested,false);
});

test('existing public media bucket is changed to private then re-verified',async(t)=>{
 const calls=[];let publicBucket=true;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls.push({url,method:options.method||'GET',body:options.body});
  if((options.method||'GET')==='PUT'){publicBucket=JSON.parse(options.body).public;return new Response('{}',{status:200});}
  return new Response(JSON.stringify({id:'veyra-media',public:publicBucket}),{status:200});
 });
 await storage({SUPABASE_URL:'https://storage.example',SUPABASE_SECRET_KEY:'sb_secret_test_only'}).ensure();
 assert.deepEqual(calls.map(x=>x.method),['GET','PUT','GET']);
 assert.equal(JSON.parse(calls[1].body).public,false);
});

test('bucket creation collision rereads bucket metadata and checks privacy',async(t)=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  const method=options.method||'GET';calls.push(method);
  if(calls.length===1)return new Response('{}',{status:404});
  if(method==='POST')return new Response('{}',{status:409});
  return new Response(JSON.stringify({id:'veyra-media',public:false}),{status:200});
 });
 await storage({SUPABASE_URL:'https://storage.example',SUPABASE_SECRET_KEY:'sb_secret_test_only'}).ensure();
 assert.deepEqual(calls,['GET','POST','GET']);
});

test('Storage setup errors identify HTTP status without logging response bodies',async(t)=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('{"message":"private-sensitive-detail"}',{status:403}));
 await assert.rejects(storage({SUPABASE_URL:'https://storage.example',SUPABASE_SECRET_KEY:'sb_secret_test_only'}).ensure(),/STORAGE_BUCKET_READ_FAILED_403/);
});

test('Storage 400 diagnostics classify auth failures without exposing response text',async(t)=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('{"code":"AccessDenied","message":"Invalid JWT signature"}',{status:400}));
 await assert.rejects(storage({SUPABASE_URL:'https://storage.example',SUPABASE_SECRET_KEY:'sb_secret_test_only'}).ensure(),error=>{
  assert.equal(error.message,'STORAGE_BUCKET_READ_FAILED_400_AUTH');
  assert.doesNotMatch(error.message,/Invalid JWT signature/);
  return true;
 });
});
