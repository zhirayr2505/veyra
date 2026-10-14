/**
 * VEYRA production smoke check.
 * Runs on GitHub Actions AFTER main is pushed. No user tokens or credentials:
 * verifies public /healthz and /readyz, Render revision and four approved static SVG assets.
 * A successful local build is not treated as proof of a successful deploy.
 */
const origin=(process.env.VEYRA_PRODUCTION_URL||'https://veyra-3806.onrender.com').replace(/\/$/,'');
const revision=String(process.env.VEYRA_EXPECTED_SHA||process.env.GITHUB_SHA||'').trim();
const attempts=Number(process.env.VEYRA_PROBE_ATTEMPTS||20);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const resources=[
 '/veyra-approved/dating_stage02/for_you_glossy_heart.svg',
 '/veyra-approved/dating_stage02/for_you_common_headphones.svg',
 '/veyra-approved/dating_stage02/for_you_serious_hearts.svg',
 '/veyra-approved/dating_stage02/for_you_travel_plane.svg'
];
if(!/^[0-9a-f]{40}$/.test(revision)){
 console.error('VEYRA live check requires the expected 40-character commit SHA.');
 process.exitCode=2;
}else{
 let verified=false,reason='';
 for(let i=1;i<=attempts;i++){
  try{
   const response=await fetch(origin+'/healthz',{headers:{'accept':'application/json'},signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error('healthz HTTP '+response.status);
   const data=await response.json();
   if(!data.ok||data.service!=='veyra')throw Error('unexpected healthz payload');
   const readiness=await fetch(origin+'/readyz',{headers:{'accept':'application/json'},signal:AbortSignal.timeout(20000)});
   if(!readiness.ok)throw Error('readyz HTTP '+readiness.status);
   const live=String(data.revision||'');
   if(live!==revision)throw Error('Render is on '+(live?live.slice(0,8):'an unknown revision')+', expected '+revision.slice(0,8));
   for(const path of resources){
    const asset=await fetch(origin+path,{headers:{'accept':'image/svg+xml'},signal:AbortSignal.timeout(20000)});
    if(!asset.ok)throw Error(path+': HTTP '+asset.status);
    const source=await asset.text();
    if(!source.includes('<svg'))throw Error(path+': invalid SVG response');
   }
   const app=await fetch(origin+'/',{signal:AbortSignal.timeout(20000)});
   if(!app.ok||(await app.text()).toLowerCase().includes('<html')===false)throw Error('HTML app entrypoint unavailable');
   console.log('VEYRA production verified: revision '+live.slice(0,8)+', /readyz, app HTML and '+resources.length+' vector assets');
   verified=true;break;
  }catch(e){
   reason=String(e?.message||e);
   console.log('Production smoke '+i+'/'+attempts+': '+reason);
   if(i<attempts)await sleep(15000);
  }
 }
 if(!verified){
  console.error('VEYRA production verification FAILED: '+reason);
  process.exitCode=1;
 }
}
