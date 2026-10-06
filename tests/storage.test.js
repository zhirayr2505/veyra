import {test} from 'node:test';
import assert from 'node:assert/strict';
import {storage} from '../server/integrations.js';

test('Storage uses apikey for new secret keys and retains Bearer for legacy JWTs',async(t)=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls.push(options.headers);
  return new Response(JSON.stringify({id:'veyra-media',public:false}),{status:200});
 });
 await storage({SUPABASE_URL:'https://storage.example',SUPABASE_SECRET_KEY:'sb_secret_test_only'}).ensure();
 assert.equal(calls[0].apikey,'sb_secret_test_only');
 assert.equal(calls[0].Authorization,undefined);
 await storage({SUPABASE_URL:'https://storage.example',SUPABASE_SECRET_KEY:'legacy-test-jwt'}).ensure();
 assert.equal(calls[1].Authorization,'Bearer legacy-test-jwt');
});
