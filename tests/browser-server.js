// Isolated test harness. Never imported by server/index.js; no auth bypass exists in production.
import {createApp} from '../server/app.js';import {testDB,deps,user} from './helpers.js';
import sharp from 'sharp';import {readFile} from 'node:fs/promises';import {react} from '../server/domain.js';
const db=await testDB();await user(db,10,{premium:true});await user(db,11);await user(db,12,{moderation:'pending'});
await user(db,30);
for(const [id,name] of [[150,'Алина'],[151,'Диана'],[152,'Мария'],[153,'Катя']]){
 await user(db,id);await db.query('UPDATE profiles SET name=$2,bio=$3,interests=$4 WHERE user_id=$1',[id,name,'Люблю красивые разговоры, вкусный кофе и новые знакомства. Открыта к новым историям.',['Кофе','Кино','Путешествия']]);
 await db.query("INSERT INTO today(user_id,activity,time_slot,expires_at) VALUES($1,'coffee','evening',now()+interval '4 hours')",[id]);
 await db.tx(q=>react(q,String(id),'10','like'));await db.tx(q=>react(q,String(id),'30','like'));
}
await db.query("UPDATE profiles SET name='Жиро',bio='Люблю путешествия, хороший кофе и глубокие разговоры.',interests=ARRAY['Кофе','Спорт','Путешествия','Музыка','Кино','Животные'] WHERE user_id=10");
await db.query("UPDATE profiles SET name='Алина',bio='Люблю красивые разговоры, вкусный кофе и людей с чувством юмора. Открыта к новым знакомствам.',interests=ARRAY['Кофе','Кино','Путешествия'] WHERE user_id=11");
const pair=await db.tx(q=>react(q,'10','151','like'));
await db.query("INSERT INTO messages(id,match_id,sender,body,client_id) VALUES(gen_random_uuid(),$1,151,'Привет! Как проходит твой день? ☕',gen_random_uuid())",[pair.match_id]);
const dependencies=deps(db);dependencies.env={...dependencies.env,APP_URL:'http://127.0.0.1:3100'};
const placeholder=await readFile(new URL('../web/assets/welcome-couple.webp',import.meta.url));
const photos=new Map();dependencies.storage={put:async(key,buffer)=>photos.set(key,await sharp(buffer).webp().toBuffer()),get:async key=>photos.get(key)||placeholder,remove:async key=>photos.delete(key)};
const app=createApp(dependencies);app.listen(3100,'127.0.0.1');
