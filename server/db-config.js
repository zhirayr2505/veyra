import {readFileSync} from 'node:fs';
import {rootCertificates} from 'node:tls';

const supabaseCA=readFileSync(new URL('./certs/supabase-root-2021.crt',import.meta.url),'utf8');

export function databaseConfig(connectionString,env=process.env){
 const url=new URL(connectionString);
 const local=['localhost','127.0.0.1','[::1]','db'].includes(url.hostname);
 if(env.DB_SSL==='false'&&(!local||env.NODE_ENV==='production'))throw Error('DB_SSL=false is only supported for a local development database');
 // pg lets URL ssl options override the explicit ssl object. Keep one policy here.
 for(const key of ['ssl','sslmode','sslrootcert','sslcert','sslkey','uselibpqcompat'])url.searchParams.delete(key);
 const supabase=url.hostname.endsWith('.pooler.supabase.com')||url.hostname.endsWith('.supabase.co');
 const ssl=env.DB_SSL==='false'?false:{rejectUnauthorized:true,minVersion:'TLSv1.2',...(supabase?{ca:[...rootCertificates,supabaseCA]}:{})};
 return {connectionString:url.toString(),options:'-c search_path=veyra,public',max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:20000,ssl};
}
