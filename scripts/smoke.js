// Public acceptance probe. It never authenticates, creates accounts or sends messages.
const input=process.argv[2]||process.env.APP_URL;
if(!input)throw Error('Usage: node scripts/smoke.js https://your-existing-service.onrender.com');
const base=new URL(input);
const expectedRevision=(process.argv[3]||process.env.EXPECTED_REVISION||'').trim();
if(expectedRevision&&!/^[a-f\d]{7,40}$/i.test(expectedRevision))throw Error('Expected revision must be a Git commit prefix (7-40 hex characters)');
if(base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname)))throw Error('HTTPS origin required');
const checks=[['/healthz',200],['/readyz',200],['/',200],['/api/me',401],['/api/admin/export.zip',401],['/api/admin/users/1',401]];
const results=await Promise.all(checks.map(async([path,expected])=>{
 try{
  const r=await fetch(new URL(path,base),{signal:AbortSignal.timeout(45000),redirect:'error'});
  const result={path,status:r.status,expected,ok:r.status===expected};
  if(path==='/healthz'&&r.ok){const body=await r.json();result.ok=result.ok&&body.ok===true&&body.service==='veyra';result.revision=body.revision||null;
   if(expectedRevision)result.ok=result.ok&&typeof result.revision==='string'&&result.revision.toLowerCase().startsWith(expectedRevision.toLowerCase());}
  if(path==='/readyz'&&r.ok)result.ok=result.ok&&(await r.json()).ok===true;
  if(path==='/'&&r.ok)result.ok=result.ok&&/id=["']root["']/.test(await r.text());
  return result;
 }catch{return {path,expected,ok:false,error:'CONNECTION_FAILED'};}
}));
console.log(JSON.stringify({origin:base.origin,...(expectedRevision?{expectedRevision}:{}),ok:results.every(x=>x.ok),checks:results},null,2));
if(results.some(x=>!x.ok))process.exitCode=1;
