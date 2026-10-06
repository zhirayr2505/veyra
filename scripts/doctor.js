import {database} from '../server/db.js';import {telegram,storage,geo} from '../server/integrations.js';import {createClient} from 'redis';import {normalizeRedis} from '../server/core.js';
export async function doctor(env){const checks=[];const check=async(name,fn)=>{try{await fn();checks.push({service:name,ok:true});}catch(e){checks.push({service:name,ok:false,code:e.code||e.cause?.code||e.name});}};
 await check('user_bot',()=>telegram(env.USER_BOT_TOKEN,'getMe',{}));await check('admin_bot',()=>telegram(env.ADMIN_BOT_TOKEN,'getMe',{}));
 await check('database',async()=>{const db=database(env.DATABASE_URL);try{await db.query('SELECT 1');}finally{await db.close();}});
 await check('redis',async()=>{const r=createClient({url:normalizeRedis(env.REDIS_URL),socket:{connectTimeout:5000,reconnectStrategy:false}});r.on('error',()=>{});try{await r.connect();await r.ping();}finally{if(r.isOpen)await r.quit();}});
 await check('storage_key_format',async()=>{if(!env.SUPABASE_SECRET_KEY?.startsWith('sb_secret_')&&!/^eyJ[^.]+\.[^.]+\.[^.]+$/.test(env.SUPABASE_SECRET_KEY||''))throw Error('Storage requires sb_secret key or service_role JWT');});
 await check('storage',async()=>{const r=await fetch(env.SUPABASE_URL+'/storage/v1/bucket',{headers:{apikey:env.SUPABASE_SECRET_KEY,Authorization:'Bearer '+env.SUPABASE_SECRET_KEY},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Storage authorization failed');});
 await check('geoapify',()=>geo(env,{text:'Paris'}));console.log(JSON.stringify(checks,null,2));return checks.every(c=>c.ok);}
if(process.argv[1]?.endsWith('doctor.js')){let env=process.env;if(process.argv.includes('--stdin')){let s='';for await(const c of process.stdin)s+=c;env={...env,...JSON.parse(s)};}process.exitCode=await doctor(env)?0:1;}
