import {telegram} from '../server/integrations.js';
import {webhookSecret} from '../server/core.js';
export async function setupBots(env){const url=(env.APP_URL||env.RENDER_EXTERNAL_URL||'').replace(/\/$/,'');if(!url.startsWith('https://'))throw Error('APP_URL must be HTTPS');for(const[bot,key,path]of [['user',env.USER_BOT_TOKEN,''],['admin',env.ADMIN_BOT_TOKEN,'/admin']]){
 if(!key)throw Error('Missing bot token');const me=await telegram(key,'getMe',{});const expected=bot==='user'?'VeyraAppBot':'VeyraAdminBot';if(me.username!==expected)throw Error('Unexpected '+bot+' bot identity');
 await telegram(key,'setWebhook',{url:url+'/webhooks/'+bot,secret_token:webhookSecret(key),allowed_updates:['message','pre_checkout_query','callback_query'],drop_pending_updates:false});
 await telegram(key,'setChatMenuButton',{menu_button:{type:'web_app',text:bot==='user'?'Открыть VEYRA':'Admin',web_app:{url:url+path}}});
 await telegram(key,'setMyCommands',{commands:bot==='user'?[{command:'start',description:'Открыть VEYRA'},{command:'support',description:'Поддержка'},{command:'paysupport',description:'Помощь с оплатой'},{command:'terms',description:'Условия'},{command:'privacy',description:'Конфиденциальность'}]:[{command:'review',description:'Следующая анкета'},{command:'reject',description:'Отклонить: /reject ID причина'},{command:'start',description:'Панель управления'},{command:'stats',description:'Статистика'},{command:'queue',description:'Очереди модерации и поддержки'}]});
 console.log('Configured @'+expected);}}
if(process.argv[1]?.endsWith('setup-bots.js'))await setupBots(process.env);
