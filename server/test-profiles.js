import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {resetDemoInteractionsInTransaction} from './demo-review.js';
import {one} from './db.js';
import {TEST_PROFILE_IDS} from './test-profile-ids.js';

// Photo source: Unsplash (https://unsplash.com/license). These are illustrative
// model portraits, NOT photos of VEYRA members. Demo profiles are fictional.
const TARGET='https://veyra-3806.onrender.com';
const SEED='owner-demo-gallery-four-photos-rich-interests-2026-10-14';
const PHOTO_BASE='https://images.unsplash.com/';
const FIXTURES=[
 {name:'Алина',age:24,gender:'woman',goal:'relationship',interests:['Кофе','Путешествия','Музыка','Спорт','Книги','Кино','Прогулки','Искусство'],bio:'Люблю неспешные утра, маленькие кофейни и прогулки без маршрута. Ищу человека, с которым легко быть собой.',image:'photo-1534528741775-53994a69daeb'},
 {name:'София',age:26,gender:'woman',goal:'relationship',interests:['Путешествия','Музыка','Фотография','Кофе','Танцы','Кино','Искусство','Прогулки'],bio:'Коллекционирую впечатления, плейлисты и красивые закаты. За искренность и разговоры до утра.',image:'photo-1524504388940-b1c1722653e1'},
 {name:'Мария',age:23,gender:'woman',goal:'dating',interests:['Книги','Йога','Искусство','Кофе','Кино','Прогулки','Путешествия','Театр'],bio:'Читаю больше, чем успеваю, люблю выставки и уютные места. Буду рада интересному знакомству.',image:'photo-1544005313-94ddf0286df2'},
 {name:'Диана',age:28,gender:'woman',goal:'relationship',interests:['Спорт','Музыка','Кино','Танцы','Еда','Путешествия','Кофе','Прогулки'],bio:'Обожаю живые концерты, тренировки и спонтанные выходные. Ценю заботу и чувство юмора.',image:'photo-1517841905240-472988babdf9'},
 {name:'Ева',age:25,gender:'woman',goal:'relationship',interests:['Собаки','Путешествия','Еда','Музыка','Кино','Прогулки','Фотография','Спорт'],bio:'Умею находить хорошие завтраки в любом городе. Дома меня ждёт пёс и список мест, куда хочется поехать.',image:'photo-1524250502761-1ac6f2e30d43'},
 {name:'Лиана',age:27,gender:'woman',goal:'dating',interests:['Танцы','Фотография','Прогулки','Музыка','Кофе','Книги','Кино','Искусство'],bio:'Танцы после работы, красивые кадры и много смеха. Люблю людей, которые не боятся быть настоящими.',image:'photo-1488426862026-3ee34a7d66df'},
 {name:'Артём',age:29,gender:'man',goal:'relationship',interests:['Спорт','Путешествия','Кофе','Кино','Книги','Еда','Прогулки','Музыка'],bio:'Люблю горы, бег по утрам и хорошие разговоры. Ищу близость, а не бесконечные переписки.',image:'photo-1500648767791-00dcc994a43e'},
 {name:'Марк',age:27,gender:'man',goal:'dating',interests:['Музыка','Кино','Книги','Кофе','Путешествия','Технологии','Фотография','Прогулки'],bio:'Пишу музыку для души, обожаю атмосферное кино и уютные кафе. За встречи без лишнего пафоса.',image:'photo-1535713875002-d1d0cf377fde'},
 {name:'Давид',age:30,gender:'man',goal:'relationship',interests:['Путешествия','Фотография','Еда','Спорт','Кино','Кофе','Искусство','Прогулки'],bio:'Люблю открывать новые города и готовить для друзей. Самое важное — доброта и чувство юмора.',image:'photo-1527980965255-d3b416303d12'},
 {name:'Максим',age:26,gender:'man',goal:'relationship',interests:['Спорт','Технологии','Кофе','Музыка','Книги','Путешествия','Кино','Прогулки'],bio:'Работаю над своими идеями, стараюсь держать баланс и не пропускать красивые закаты.',image:'photo-1506794778202-cad84cf45f1d'},
 {name:'Никита',age:25,gender:'man',goal:'dating',interests:['Музыка','Прогулки','Кино','Кофе','Спорт','Танцы','Книги','Путешествия'],bio:'Люблю живую музыку, тёплые вечера и хороший юмор. Не против познакомиться с кем-то особенным.',image:'photo-1504593811423-6dd665756598'},
 {name:'Левон',age:31,gender:'man',goal:'relationship',interests:['Книги','Путешествия','Искусство','Архитектура','Кино','Кофе','Прогулки','Фотография'],bio:'Увлекаюсь архитектурой и путешествиями. Хочу встретить человека, с которым интересно и легко.',image:'photo-1547425260-76bcadfb4f2c'}
];

async function downloadPortrait(fixture){
 const url=PHOTO_BASE+fixture.image+'?w=1080&h=1440&fit=crop&crop=faces&auto=format&q=88';
 const response=await fetch(url,{signal:AbortSignal.timeout(18000)});
 if(!response.ok||!String(response.headers.get('content-type')||'').startsWith('image/'))throw Error('DEMO_PHOTO_SOURCE_UNAVAILABLE_'+fixture.name);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length<8000||bytes.length>8*1024*1024)throw Error('DEMO_PHOTO_INVALID_'+fixture.name);
 return bytes;
}

// Four independent WebP files show ONE demo identity at different crop and zoom.
async function buildPhotoVariants(bytes){
 const image=await sharp(bytes).rotate().resize(1080,1440,{fit:'cover',position:'attention'}).toBuffer();
 const crops=[null,{left:90,top:30,width:900,height:1200},
  {left:0,top:145,width:960,height:1280},
  {left:170,top:110,width:840,height:1120}];
 const result=[];
 for(const [i,crop] of crops.entries()){
  let pipeline=sharp(image);
  pipeline=crop?pipeline.extract(crop).resize(900,1200):pipeline.resize(900,1200);
  if(i===2)pipeline=pipeline.modulate({brightness:1.045,saturation:.93});
  if(i===3)pipeline=pipeline.modulate({brightness:.985,saturation:1.075});
  result.push(await pipeline.webp({quality:88,effort:4}).toBuffer());
 }
 return result;
}

/**
 * Owner-only, repeat-safe demo data. No bot identities, notifications or genuine
 * user photos are used. Images are copied to VEYRA private storage, not hotlinked.
 * Tests can inject loadPortrait to avoid downloading external images.
 */
export async function seedTestProfiles(db,storage,env,{loadPortrait=downloadPortrait}={}){
 if(env.APP_URL!==TARGET||env.RENDER_EXTERNAL_URL!==TARGET)return {status:'not_applicable'};
 if(await one(db,"SELECT 1 FROM audit_log WHERE action='test_profiles.seed' AND subject=$1",[SEED]))
  return {status:'completed',count:TEST_PROFILE_IDS.length,photos_per_profile:4};
 // Fetch outside the DB transaction, so a slow photo CDN does not hold row locks.
 const images=await Promise.all(FIXTURES.map(loadPortrait));
 const galleries=[];
 for(const image of images)galleries.push(await buildPhotoVariants(image));
 const uploaded=[],retired=[];
 try{
  const result=await db.tx(async q=>{
   await q.query("SELECT key FROM feature_flags WHERE key='registrations' FOR UPDATE");
   if(await one(q,"SELECT 1 FROM audit_log WHERE action='test_profiles.seed' AND subject=$1",[SEED]))
    return {status:'completed',count:TEST_PROFILE_IDS.length,photos_per_profile:4};
   const owner=await one(q,'SELECT city,country,lat,lon FROM profiles WHERE user_id=$1',[env.OWNER_TELEGRAM_ID]);
   const city=owner?.city||'Краснодар',country=owner?.country||'Россия';
   const lat=Number(owner?.lat??45.0355),lon=Number(owner?.lon??38.9753);
   for(const [index,item] of FIXTURES.entries()){
    const id=TEST_PROFILE_IDS[index];
    const coordinates=[(index%4-1.5)*0.004,(index%3-1)*0.005];
    await q.query("INSERT INTO users(id,first_name,referral_code,notifications,last_seen) VALUES($1,$2,$3,false,now()-interval '30 days') ON CONFLICT(id) DO NOTHING",
     [id,item.name+' (демо)',randomUUID().slice(0,12)]);
    await q.query(`INSERT INTO profiles(user_id,name,birth_date,gender,looking_for,bio,interests,goal,city,country,lat,lon,min_age,max_age,radius_km,moderation,accepted_terms_at,moderation_reason)
      VALUES($1,$2,(CURRENT_DATE-($3::text||' years')::interval)::date,$4,ARRAY['man','woman','other'],$5,$6,$7,$8,$9,$10,$11,18,110,20000,'approved',NULL,'VEYRA fictional demonstration profile')
      ON CONFLICT(user_id) DO UPDATE SET name=EXCLUDED.name,birth_date=EXCLUDED.birth_date,gender=EXCLUDED.gender,looking_for=EXCLUDED.looking_for,
      bio=EXCLUDED.bio,interests=EXCLUDED.interests,goal=EXCLUDED.goal,city=EXCLUDED.city,country=EXCLUDED.country,lat=EXCLUDED.lat,lon=EXCLUDED.lon,moderation='approved',moderation_reason=EXCLUDED.moderation_reason`,
      [id,item.name,item.age,item.gender,item.bio,item.interests,item.goal,city,country,lat+coordinates[0],lon+coordinates[1]]);
    const old=(await q.query('DELETE FROM photos WHERE user_id=$1 RETURNING object_key',[id])).rows;
    retired.push(...old.map(row=>row.object_key));
    await Promise.all(galleries[index].map(async(buffer,position)=>{
     const photoId=randomUUID();
     const key='test-profiles/'+SEED+'/'+id+'/'+photoId+'.webp';
     uploaded.push(key);
     await storage.put(key,buffer);
     await q.query('INSERT INTO photos(id,user_id,object_key,position) VALUES($1,$2,$3,$4)',[photoId,id,key,position]);
    }));
   }
   const reset=await resetDemoInteractionsInTransaction(q,env.OWNER_TELEGRAM_ID,{source:'seed'});
   await q.query("INSERT INTO audit_log(actor,action,subject,metadata) VALUES($1,'test_profiles.seed',$2,$3)",
    [env.OWNER_TELEGRAM_ID,SEED,JSON.stringify({ids:TEST_PROFILE_IDS,count:TEST_PROFILE_IDS.length,photos_per_profile:4,illustrative_photos:true,synthetic:true,reset})]);
   return {status:'completed',count:TEST_PROFILE_IDS.length,photos_per_profile:4,auto_reset:true,reset_reactions:reset.reset_reactions,reset_matches:reset.reset_matches};
  });
  // Remove previous drawn portraits only after the new transaction commits.
  for(const key of retired)await storage.remove(key).catch(()=>{});
  return result;
 }catch(e){
  for(const key of uploaded)await storage.remove(key).catch(()=>{});
  throw e;
 }
}
