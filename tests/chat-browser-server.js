// Isolated Messages Core fixture. Never imported by production.
import {createApp} from '../server/app.js';
import {testDB,deps,user} from './helpers.js';
import {react} from '../server/domain.js';
import sharp from 'sharp';
const db=await testDB();for(const id of [401,402])await user(db,id);
await db.query("UPDATE profiles SET name='Жиро' WHERE user_id=401");
await db.query("UPDATE profiles SET name='Алина',bio='Люблю долгие прогулки, красивые разговоры и маленькие спонтанные путешествия.',interests=ARRAY['Кофе','Кино','Путешествия'] WHERE user_id=402");
await db.tx(q=>react(q,'401','402','like'));const {match_id}=await db.tx(q=>react(q,'402','401','like'));
for(let i=0;i<65;i++)await db.query("INSERT INTO messages(id,match_id,sender,body,client_id,created_at,read_at) VALUES(gen_random_uuid(),$1,$2,$3,gen_random_uuid(),now()-interval '2 days'+($4::text||' minutes')::interval,now())",[match_id,i%3?401:402,i===8?'Вспомнила про маленькую кофейню у парка':'История нашего знакомства · '+i,i]);
for(const [sender,body,minutes]of [[402,'Привет! Как прошёл твой день?',18],[402,'Я наконец-то нашла ту самую кофейню ☕',17],[401,'Привет! День был длинный, но теперь гораздо приятнее',15],[401,'У них правда самый вкусный раф?',14],[402,'Да! И столик у окна с видом на парк',12],[402,'Может, проверим вместе в субботу? 😊',10]])await db.query("INSERT INTO messages(id,match_id,sender,body,client_id,created_at) VALUES(gen_random_uuid(),$1,$2,$3,gen_random_uuid(),now()-($4::text||' minutes')::interval)",[match_id,sender,body,minutes]);
const port=Number(process.env.CHAT_TEST_PORT||3100);const dependencies=deps(db);dependencies.env={...dependencies.env,APP_URL:'http://127.0.0.1:'+port};
const photo=await sharp({create:{width:320,height:430,channels:3,background:{r:250,g:218,b:229}}}).webp().toBuffer();const files=new Map();dependencies.storage.putMedia=async(key,data)=>files.set(key,data);dependencies.storage.get=async key=>files.get(key)||photo;dependencies.storage.remove=async key=>files.delete(key);
createApp(dependencies).listen(port,'127.0.0.1');
