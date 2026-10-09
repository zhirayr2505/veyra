import {one} from './db.js';
import {notify,audit,grant,moderate} from './domain.js';

// Commands reuse the same domain operations as the web console. No Telegram ID from
// a command is trusted as the actor: only the authenticated webhook sender is used.
export async function adminCommand(q,{id,role,command,text,env}){
 const args=text.trim().split(/\s+/).slice(1),reply=t=>notify(q,id,t,'admin');
 const allowed={
  '/user':['owner','moderator'], '/approve':['owner','moderator'], '/changes':['owner','moderator'],
  '/suspend':['owner'], '/premium':['owner'], '/boost':['owner'], '/payments':['owner'],
  '/reports':['owner','moderator'], '/flags':['owner'], '/export':['owner'], '/broadcast':['owner'],
  '/support':['owner','support']
 };
 if(!allowed[command])return false;
 if(!allowed[command].includes(role)){await reply('Недостаточно прав для этой команды.');return true;}
 if(['/export','/broadcast','/support'].includes(command)){
  await notify(q,id,command==='/broadcast'?'Создайте черновик, затем подтвердите отправку в панели.':command==='/export'?'Выгрузки доступны только авторизованному администратору в панели.':'История обращений и ответы доступны в панели.','admin',{inline_keyboard:[[{text:'Открыть панель',web_app:{url:env.APP_URL+'/admin'}}]]});return true;
 }
 if(command==='/reports'){
  const rows=(await q.query("SELECT reporter,target,reason FROM reports WHERE status='open' ORDER BY created_at DESC LIMIT 10")).rows;
  await reply(rows.length?rows.map(r=>`${r.reporter} → ${r.target}: ${r.reason}`).join('\n'):'Открытых жалоб нет.');
 }else if(command==='/payments'){
  const rows=(await q.query('SELECT user_id,total,status,sku FROM orders ORDER BY created_at DESC LIMIT 10')).rows;
  await reply(rows.length?rows.map(r=>`${r.user_id}: ${r.sku} · ${r.total} Stars · ${r.status}`).join('\n'):'Платежей пока нет.');
 }else if(command==='/flags'){
  const rows=(await q.query('SELECT key,enabled FROM feature_flags ORDER BY key')).rows;await reply(rows.map(r=>`${r.key}: ${r.enabled?'on':'off'}`).join('\n'));
 }else{
  const uid=args[0];if(!/^\d{1,16}$/.test(uid||'')){await reply(command+' TELEGRAM_ID'+(command==='/approve'?' REVISION':['/premium','/boost'].includes(command)?' AMOUNT':command==='/changes'||command==='/suspend'?' REASON':''));return true;}
  const user=await one(q,'SELECT u.id,u.status,p.name,p.city,p.moderation,p.revision FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id=$1',[uid]);
  if(!user){await reply('Пользователь не найден.');return true;}
  if(command==='/user')await reply(`${user.id}\n${user.name||'Без анкеты'} · ${user.city||'—'}\nАккаунт: ${user.status}\nАнкета: ${user.moderation||'—'}\nRevision: ${user.revision||'—'}`);
  else if(command==='/approve'){
   if(!/^\d+$/.test(args[1]||'')){await reply('/approve ID REVISION — сначала откройте /user ID.');return true;}
   await moderate(q,id,uid,'approved','',Number(args[1]));await reply('Анкета одобрена.');
  }else if(command==='/changes'){
   const reason=args.slice(1).join(' ').slice(0,1000);if(!reason){await reply('/changes ID причина');return true;}
   await moderate(q,id,uid,'rejected',reason,user.revision);await reply('Причина и запрос исправлений отправлены.');
  }else if(command==='/suspend'){
   const reason=args.slice(1).join(' ').slice(0,1000);if(uid===String(env.OWNER_TELEGRAM_ID)||!reason){await reply('Укажите причину. Владелец защищён от блокировки.');return true;}
   await q.query("UPDATE users SET status='banned' WHERE id=$1",[uid]);await q.query('DELETE FROM sessions WHERE user_id=$1',[uid]);await audit(q,id,'user.banned',uid,{reason});await reply('Аккаунт заблокирован.');
  }else{
   const amount=Number(args[1]);if(!Number.isInteger(amount)||amount<1||amount>365){await reply('Количество должно быть целым числом от 1 до 365.');return true;}
   await grant(q,uid,command==='/premium'?'premium':'boosts',amount);await audit(q,id,'admin.grant',uid,{kind:command.slice(1),amount});await reply('Начислено: '+amount+'.');
  }
 }
 await audit(q,id,'admin.bot',command);return true;
}
