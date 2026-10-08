// Isolated Messages Core fixture. Never imported by production.
import {createApp} from '../server/app.js';
import {testDB,deps,user} from './helpers.js';
import {react} from '../server/domain.js';
import {readFile} from 'node:fs/promises';
const db=await testDB();for(const id of [401,402])await user(db,id);
await db.query("UPDATE profiles SET name='Жиро' WHERE user_id=401");
await db.query("UPDATE profiles SET name='Алина',bio='Люблю долгие прогулки, красивые разговоры и маленькие спонтанные путешествия.',interests=ARRAY['Кофе','Кино','Путешествия'] WHERE user_id=402");
await db.tx(q=>react(q,'401','402','like'));const {match_id}=await db.tx(q=>react(q,'402','401','like'));
for(let i=0;i<65;i++)await db.query("INSERT INTO messages(id,match_id,sender,body,client_id,created_at,read_at) VALUES(gen_random_uuid(),$1,$2,$3,gen_random_uuid(),now()-interval '2 days'+($4::text||' minutes')::interval,now())",[match_id,i%3?401:402,i===8?'Вспомнила про маленькую кофейню у парка':'История нашего знакомства · '+i,i]);
for(const [sender,body,minutes]of [[402,'Привет! Как прошёл твой день?',18],[402,'Я наконец-то нашла ту самую кофейню ☕',17],[401,'Привет! День был длинный, но теперь гораздо приятнее',15],[401,'У них правда самый вкусный раф?',14],[402,'Да! И столик у окна с видом на парк',12],[402,'Может, проверим вместе в субботу? 😊',10]])await db.query("INSERT INTO messages(id,match_id,sender,body,client_id,created_at) VALUES(gen_random_uuid(),$1,$2,$3,gen_random_uuid(),now()-($4::text||' minutes')::interval)",[match_id,sender,body,minutes]);
const dependencies=deps(db);dependencies.env={...dependencies.env,APP_URL:'http://127.0.0.1:3100'};
const photo=await readFile(new URL('../web/assets/welcome-couple.webp',import.meta.url));dependencies.storage.get=async()=>photo;
createApp(dependencies).listen(3100,'127.0.0.1');
