// Owner-only visual review fixtures. These are stock-photo mockups, NOT members.
 // Never write these records to the dating database, create matches, or send notifications.
const subjects=[
 ['Алина',24,'woman','1534528741775-53994a69daeb','Краснодар','Кофе','Кино','Прогулки','Ищу человека, с которым легко смеяться, обсуждать фильмы и спонтанно уехать к морю.','relationship'],
 ['София',26,'woman','1544005313-94ddf0286df2','Ереван','Путешествия','Музыка','Фотография','Коллекционирую красивые закаты, маленькие кофейни и хорошие разговоры.','relationship'],
 ['Мария',23,'woman','1524504388940-b1c1722653e1','Москва','Искусство','Книги','Йога','Искусство, выставки и тихие вечера с книгой. Но от неожиданного приключения не откажусь.','dating'],
 ['Ева',25,'woman','1517841905240-472988babdf9','Краснодар','Собаки','Прогулки','Еда','Обожаю животных, пешие прогулки и искать самый вкусный завтрак в городе.','relationship'],
 ['Диана',28,'woman','1531123897727-8f129e1688ce','Тбилиси','Спорт','Музыка','Танцы','В движении чувствую себя счастливой. Здорово, когда рядом есть человек с чувством юмора.','dating'],
 ['Лиана',27,'woman','1508214751196-bcfd4ca60f91','Париж','Путешествия','Фото','Кофе','Мой идеальный выходной — новый город, фотоаппарат и кофе с видом.','friends'],
 ['Артём',27,'man','1500648767791-00dcc994a43e','Краснодар','Спорт','Кино','Путешествия','Люблю активные выходные, поездки без долгих сборов и вечера с хорошим кино.','relationship'],
 ['Марк',29,'man','1506794778202-cad84cf45f1d','Ереван','Музыка','Кофе','Искусство','Играю на гитаре, ценю искренность и всегда знаю, где найти вкусный кофе.','relationship'],
 ['Давид',25,'man','1535713875002-d1d0cf377fde','Москва','Фотография','Прогулки','Техника','Фотографирую город и людей, когда есть настроение. Люблю простые моменты.','dating'],
 ['Никита',28,'man','1507003211169-0a1dd7228f2d','Краснодар','Спорт','Собаки','Еда','По выходным выбираюсь на природу. Ищу компанию для завтраков и приключений.','relationship'],
 ['Арсен',30,'man','1527980965255-d3b416303d12','Тбилиси','Путешествия','Книги','Кино','Считаю, что общие впечатления важнее идеальных планов. Люблю узнавать новое.','relationship'],
 ['Леон',26,'man','1531384441138-2736e62e0919','Берлин','Танцы','Музыка','Кофе','За ночные прогулки, живую музыку и разговоры до утра.','friends']
];
export const DEMO_PROFILES=subjects.map((s,i)=>({
 id:'demo-person-'+String(i+1).padStart(2,'0'),name:s[0],age:s[1],gender:s[2],
 city:s[4],country:['Краснодар','Ереван','Москва'].includes(s[4])?(s[4]==='Ереван'?'Армения':'Россия'):(s[4]==='Тбилиси'?'Грузия':s[4]==='Париж'?'Франция':'Германия'),
 interests:s.slice(5,8),bio:s[8],goal:s[9],languages:['ru'],height_cm:160+i*3,
 smoking:'no',distance_km:3+i*3,shared_interests:3-(i%3),shared_goal:i%2===0,shared_language:true,
 test_profile:true,demo_profile:true,online:false,last_seen:null,
 photos:[0,1,2].map(j=>'demo-photo-'+String(i+1).padStart(2,'0')+'-'+j)
}));
export const isDemoProfile=id=>/^demo-person-(0[1-9]|1[0-2])$/.test(String(id||''));
export const getDemoProfile=id=>DEMO_PROFILES.find(p=>p.id===String(id))||null;
export const isDemoPhoto=id=>/^demo-photo-(0[1-9]|1[0-2])-[012]$/.test(String(id||''));
export function demoPhotoUrl(id){
 if(!isDemoPhoto(id))return null;
 const match=/^demo-photo-(\d+)-(\d)$/.exec(String(id));
 const row=subjects[Number(match[1])-1],variant=Number(match[2]);
 // Three responsive crops of one photographer portrait for each mockup: do not
 // mix the faces of unrelated people and imply they are the same person.
 const dims=[[1200,1600],[1080,1350],[1200,1200]][variant];
 return 'https://images.unsplash.com/photo-'+row[3]+'?auto=format&fit=crop&crop=faces&w='+dims[0]+'&h='+dims[1]+'&q=90';
}
export function getDemoProfiles(kind='feed',{collection=null,choice='all',city=null}={}){
 let rows=DEMO_PROFILES;
 if(collection==='common')rows=rows.filter(p=>p.interests.includes('Кофе')||p.interests.includes('Музыка'));
 if(collection==='serious')rows=rows.filter(p=>p.goal==='relationship');
 if(collection==='travel')rows=rows.filter(p=>p.interests.includes('Путешествия'));
 if(kind==='nearby'){
  rows=[...rows].sort((a,b)=>a.distance_km-b.distance_km);
  if(choice==='common')rows=rows.filter(p=>p.shared_interests>0);
  // Location is illustrative, never asserted as a live position.
  if(city)rows=rows.map(p=>({...p,city,country:null}));
 }
 if(kind==='for_you')rows=[...rows].sort((a,b)=>b.shared_interests-a.shared_interests);
 return rows;
}
