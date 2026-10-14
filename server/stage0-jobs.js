import {one} from './db.js';
import {RESET_ID,RESET_TARGET,applyRegistrationReset} from './launch-reset.js';
import {stage0Snapshot,requireVerifiedStage0Backup,currentDigests,financialCheckpoint} from './stage0-snapshot.js';

// The only control plane for destructive Stage 0 actions is a privileged SQL
// INSERT into veyra.stage0_jobs. There is NO HTTP endpoint or deploy hook.
// Each task is manually enqueued and claimed exactly once.
let busy=false;
export async function drainStage0Jobs({db,env}){
 if(busy)return;
 if(env.APP_URL!==RESET_TARGET||env.RENDER_EXTERNAL_URL!==RESET_TARGET||!/^[a-f0-9]{40}$/.test(env.RENDER_GIT_COMMIT||''))return;
 busy=true;
 try{
  const claimed=await db.tx(async q=>{
   const job=await one(q,"SELECT id,action,requested_by FROM stage0_jobs WHERE id=$1 AND state='pending' ORDER BY CASE action WHEN 'snapshot' THEN 0 ELSE 1 END FOR UPDATE SKIP LOCKED LIMIT 1",[RESET_ID]);
   if(!job)return null;
   if(String(job.requested_by)!==String(env.OWNER_TELEGRAM_ID))throw Error('STAGE0_OWNER_ONLY');
   if(job.action==='reset'){
    const snapshot=await one(q,"SELECT state FROM stage0_jobs WHERE id=$1 AND action='snapshot'",[RESET_ID]);
    if(snapshot?.state!=='completed')throw Error('STAGE0_SNAPSHOT_NOT_COMPLETED');
   }
   await q.query("UPDATE stage0_jobs SET state='running',started_at=now() WHERE id=$1 AND action=$2",[job.id,job.action]);
   return job;
  });
  if(!claimed)return;
  try{
   let result;
   if(claimed.action==='snapshot')result=await stage0Snapshot(db,env);
   else{
    const proof=await requireVerifiedStage0Backup(db,env);
    const manifest=proof.manifest;
    result=await applyRegistrationReset(db,env,{
     backupManifest:{
      verified_internally:true,
      postgres:{id:RESET_ID+'-db',sha256:manifest.database.sha256,bytes:manifest.database.bytes,restore_tested:true},
      storage:{id:RESET_ID+'-media',sha256:proof.manifest_sha256,bytes:manifest.media.total_bytes,objects:manifest.media.files.length,objects_verified:manifest.media.files.length,restore_tested:true}
     },
     expectedDating:proof.archive.digests,
     expectedFinance:manifest.financial_checkpoint
    });
    if(result.status!=='completed')throw Error('STAGE0_RESET_DID_NOT_COMPLETE');
   }
   await db.query("UPDATE stage0_jobs SET state='completed',finished_at=now(),result=$3::jsonb WHERE id=$1 AND action=$2 AND state='running'",[RESET_ID,claimed.action,JSON.stringify(result)]);
   console.log(JSON.stringify({event:'stage0_job_completed',action:claimed.action,id:RESET_ID,status:'completed'}));
  }catch(error){
   const code=/^[A-Z0-9_]{5,95}$/.test(String(error?.message))?String(error.message):'STAGE0_INTERNAL_ERROR';
   await db.query("UPDATE stage0_jobs SET state='failed',finished_at=now(),error_code=$3 WHERE id=$1 AND action=$2 AND state='running'",[RESET_ID,claimed.action,code]);
   console.error(JSON.stringify({event:'stage0_job_failed',action:claimed.action,id:RESET_ID,code}));
  }
 }catch{
  // A failed owner check leaves the pending row untouched and makes no changes.
  console.error('STAGE0_ADMIN_JOB_UNAUTHORIZED_OR_UNAVAILABLE');
 }finally{busy=false}
}
