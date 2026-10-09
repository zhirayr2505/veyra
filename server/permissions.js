import {fail} from './core.js';
import {one} from './db.js';

export function adminRole(user,env){
 if(!user||user.status!=='active')return null;
 return String(user.id)===String(env.OWNER_TELEGRAM_ID)?'owner':user.admin_role;
}
export async function botRole(q,id,env){
 if(String(id)===String(env.OWNER_TELEGRAM_ID))return 'owner';
 return adminRole(await one(q,'SELECT id,status,admin_role FROM users WHERE id=$1',[id]),env);
}
export function guardAdmin(env){
 return (req,res,next)=>{
  const role=adminRole(req.user,env);
  if(req.user.scope!=='admin'||!role)fail(403,'ADMIN_FORBIDDEN');
  req.adminRole=role;
  if(role==='owner')return next();
  const path=req.path;
  const allowed=path==='/access'||path==='/dashboard'
   ||(role==='moderator'&&((req.method==='GET'&&['/profiles','/reports'].includes(path))||(req.method==='POST'&&(path==='/profiles/bulk'||/^\/(profiles\/\d+\/moderate|reports\/[a-f0-9-]+\/resolve)$/.test(path)))))
   ||(role==='support'&&((req.method==='GET'&&path==='/tickets')||(req.method==='POST'&&/^\/tickets\/[a-f0-9-]+\/reply$/.test(path))));
  if(!allowed)fail(403,'ROLE_FORBIDDEN');
  next();
 };
}
