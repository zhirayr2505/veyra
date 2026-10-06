import {test} from 'node:test';
import assert from 'node:assert/strict';
import {X509Certificate} from 'node:crypto';
import pg from 'pg';
import {databaseConfig} from '../server/db-config.js';

test('pg retains verified Supabase TLS even when the URL has SSL parameters',()=>{
 for(const mode of ['require','no-verify','disable']){
  const client=new pg.Client(databaseConfig('postgresql://aws-1-eu-west-3.pooler.supabase.com:5432/postgres?sslmode='+mode,{}));
  assert.equal(client.ssl.rejectUnauthorized,true);
  const cert=new X509Certificate(client.ssl.ca.at(-1));
  assert.equal(cert.ca,true);
  assert.equal(cert.fingerprint256,'80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA');
  assert.ok(Date.parse(cert.validTo)>Date.now());
 }
});
test('custom CA is scoped to Supabase; plaintext is local development only',()=>{
 assert.equal(databaseConfig('postgresql://localhost/postgres',{DB_SSL:'false'}).ssl,false);
 assert.throws(()=>databaseConfig('postgresql://localhost/postgres',{DB_SSL:'false',NODE_ENV:'production'}));
 assert.throws(()=>databaseConfig('postgresql://db.example/postgres',{DB_SSL:'false'}));
 const config=databaseConfig('postgresql://pooler.supabase.com.example/postgres',{});
 assert.equal(config.ssl.ca,undefined);
 assert.equal(config.ssl.rejectUnauthorized,true);
});
