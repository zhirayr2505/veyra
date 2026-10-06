import {test} from 'node:test';
import assert from 'node:assert/strict';
import {storage} from '../server/integrations.js';

for(const [label,status,body] of [
 ['legacy Render failure',400,{statusCode:'404',error:'Bucket not found',message:'Bucket not found'}],
 ['modern missing bucket',404,{code:'NoSuchBucket',message:'The specified bucket does not exist'}],
 ['modern code wrapped in HTTP 400',400,{code:'NoSuchBucket'}],
 ['plain 404',404,{}],
])test('creates and verifies a private bucket: '+label,async(t)=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls.push({url,...options});
  if(calls.length===1)return Response.json(body,{status});
  if(options.method==='POST')return Response.json({name:'veyra-media'});
  return Response.json({id:'veyra-media',public:false});
 });
 await storage({SUPABASE_URL:'https://storage.example/',SUPABASE_SECRET_KEY:'sb_secret_test_only'}).ensure();
 assert.deepEqual(calls.map(x=>x.method||'GET'),['GET','POST','GET']);
 assert.equal(calls[0].url,'https://storage.example/storage/v1/bucket/veyra-media');
 assert.deepEqual(JSON.parse(calls[1].body),{id:'veyra-media',name:'veyra-media',public:false,file_size_limit:5242880,allowed_mime_types:['image/webp']});
 assert.ok(calls.every(x=>x.signal instanceof AbortSignal));
});

test('legacy HTTP 400 creation collision is reread, not treated as startup failure',async(t)=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{
  calls++;
  if(calls===1)return Response.json({message:'Bucket not found'},{status:400});
  if(calls===2)return Response.json({statusCode:'409',error:'Duplicate',message:'The resource already exists'},{status:400});
  return Response.json({id:'veyra-media',public:false});
 });
 await storage({SUPABASE_URL:'https://storage.example',SUPABASE_SECRET_KEY:'sb_secret_test_only'}).ensure();
 assert.equal(calls,3);
});

for(const [status,body] of [[400,{code:'InvalidJWT',message:'Invalid JWT signature'}],[403,{code:'AccessDenied'}],[404,{code:'TenantNotFound'}],[500,{message:'Bucket not found'}]])test('does not create bucket on unrelated error '+status+' '+(body.code||'server'),async(t)=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push(options.method||'GET');return Response.json(body,{status});});
 await assert.rejects(storage({SUPABASE_URL:'https://storage.example',SUPABASE_SECRET_KEY:'sb_secret_test_only'}).ensure(),/STORAGE_BUCKET_READ_FAILED_/);
 assert.deepEqual(calls,['GET']);
});

test('successful create response cannot bypass private metadata verification',async(t)=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{
  if(++calls===1)return Response.json({message:'Bucket not found'},{status:400});
  return Response.json({name:'veyra-media'});
 });
 await assert.rejects(storage({SUPABASE_URL:'https://storage.example',SUPABASE_SECRET_KEY:'sb_secret_test_only'}).ensure(),/STORAGE_BUCKET_PRIVACY_UNCONFIRMED/);
 assert.equal(calls,3);
});

test('Storage sends new secret keys only as apikey and legacy JWT keys as both headers',async(t)=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls.push(options.headers);
  return new Response(JSON.stringify({id:'veyra-media',public:false}),{status:200});
 });
 await storage({SUPABASE_URL:'https://storage.example',SUPABASE_SECRET_KEY:'sb_secret_test_only'}).ensure();
 assert.equal(calls[0].apikey,'sb_secret_test_only');
 assert.equal(calls[0].Authorization,undefined);
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
  assert.equal(error.message,'STORAGE_BUCKET_READ_FAILED_400_AUTH_INVALID_JWT');
  assert.doesNotMatch(error.message,/Invalid JWT signature/);
  return true;
 });
});

test('Storage diagnostics report allowlisted failure reasons without the response body',async(t)=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('{\"error\":\"InvalidBucketName\",\"message\":\"Invalid bucket name: private-sensitive-detail\"}',{status:400}));
 await assert.rejects(storage({SUPABASE_URL:'https://storage.example',SUPABASE_SECRET_KEY:'sb_secret_test_only'}).ensure(),error=>{
  assert.match(error.message,/STORAGE_BUCKET_READ_FAILED_400_REQUEST_INVALID_BUCKET/);
  assert.doesNotMatch(error.message,/private-sensitive-detail|InvalidBucketName/);
  return true;
 });
});
