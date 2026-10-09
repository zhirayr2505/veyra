import {randomUUID} from 'node:crypto';
import {one} from './db.js';
import {fail} from './core.js';
import {z,parse,id,uuid} from './validation.js';
import {approved,ensurePair,flag,audit,notify} from './domain.js';
import {StarsProvider} from './payments.js';

// Identifiers, prices and the free daily limit are SERVER-owned.
export const giftCatalog=Object.freeze([
 {key:'spark',name:'Искорка',en:'Spark',emoji:'✨',stars:0,rarity:'welcome'},
 {key:'rose',name:'Роза',en:'Rose',emoji:'🌹',stars:5,rarity:'classic'},
 {key:'coffee',name:'Кофе',en:'Coffee',emoji:'☕',stars:8,rarity:'classic'},
 {key:'heart',name:'Сердце',en:'Heart',emoji:'💗',stars:12,rarity:'classic'},
 {key:'bear',name:'Мишка',en:'Teddy bear',emoji:'🧸',stars:15,rarity:'classic'},
 {key:'tulips',name:'Тюльпаны',en:'Tulips',emoji:'🌷',stars:20,rarity:'rare'},
 {key:'cake',name:'Праздничный торт',en:'Celebration cake',emoji:'🎂',stars:25,rarity:'rare'},
 {key:'letter',name:'Письмо',en:'Love letter',emoji:'💌',stars:30,rarity:'rare'},
 {key:'bouquet',name:'Букет',en:'Bouquet',emoji:'💐',stars:35,rarity:'rare'},
 {key:'butterfly',name:'Бабочка',en:'Butterfly',emoji:'🦋',stars:45,rarity:'rare'},
 {key:'moon',name:'Луна',en:'Moon',emoji:'🌙',stars:55,rarity:'epic'},
 {key:'unicorn',name:'Единорог',en:'Unicorn',emoji:'🦄',stars:70,rarity:'epic'},
 {key:'crystal',name:'Кристалл',en:'Crystal',emoji:'💎',stars:90,rarity:'epic'},
 {key:'crown',name:'Корона',en:'Crown',emoji:'👑',stars:120,rarity:'legendary'},
 {key:'starfall',name:'Звездопад',en:'Starfall',emoji:'🌠',stars:150,rarity:'legendary'},
 {key:'galaxy',name:'Галактика',en:'Galaxy',emoji:'🌌',stars:200,rarity:'legendary'},
 {key:'ribbon',name:'Бантик',en:'Ribbon',emoji:'🎀',stars:7,rarity:'classic'},
 {key:'balloon',name:'Воздушный шар',en:'Balloon',emoji:'🎈',stars:10,rarity:'classic'},
 {key:'candy',name:'Конфетка',en:'Candy',emoji:'🍬',stars:11,rarity:'classic'},
 {key:'chocolate',name:'Шоколад',en:'Chocolate',emoji:'🍫',stars:14,rarity:'classic'},
 {key:'puppy',name:'Щенок',en:'Puppy',emoji:'🐶',stars:18,rarity:'classic'},
 {key:'lotus',name:'Лотос',en:'Lotus',emoji:'🪷',stars:22,rarity:'rare'},
 {key:'sunflower',name:'Подсолнух',en:'Sunflower',emoji:'🌻',stars:24,rarity:'rare'},
 {key:'icecream',name:'Мороженое',en:'Ice cream',emoji:'🍦',stars:27,rarity:'rare'},
 {key:'rainbow',name:'Радуга',en:'Rainbow',emoji:'🌈',stars:32,rarity:'rare'},
 {key:'fox',name:'Лисёнок',en:'Little fox',emoji:'🦊',stars:38,rarity:'rare'},
 {key:'candle',name:'Свеча',en:'Candle',emoji:'🕯️',stars:42,rarity:'rare'},
 {key:'dolphin',name:'Дельфин',en:'Dolphin',emoji:'🐬',stars:60,rarity:'epic'},
 {key:'pearl',name:'Жемчужина',en:'Pearl',emoji:'🦪',stars:65,rarity:'epic'},
 {key:'snowflake',name:'Снежинка',en:'Snowflake',emoji:'❄️',stars:78,rarity:'epic'},
 {key:'flamingo',name:'Фламинго',en:'Flamingo',emoji:'🦩',stars:85,rarity:'epic'},
 {key:'planet',name:'Планета',en:'Planet',emoji:'🪐',stars:110,rarity:'epic'},
 {key:'castle',name:'Замок мечты',en:'Dream castle',emoji:'🏰',stars:140,rarity:'legendary'},
 {key:'dragon',name:'Дракон',en:'Dragon',emoji:'🐉',stars:165,rarity:'legendary'},
 {key:'phoenix',name:'Феникс',en:'Phoenix',emoji:'🔥',stars:185,rarity:'legendary'},
 {key:'treasure',name:'Сокровище',en:'Treasure',emoji:'🪙',stars:230,rarity:'legendary'},
 {key:'aurora',name:'Северное сияние',en:'Aurora',emoji:'🌌',stars:250,rarity:'legendary'}
].sort((a,b)=>a.stars-b.stars));
const giftByKey=new Map(giftCatalog.map(g=>[g.key,g]));
export async function deliverPaidGift(q,order){
 const row=await one(q,"UPDATE gifts SET status='delivered',delivered_at=now() WHERE order_id=$1 AND status='pending' RETURNING *",[order.id]);
 if(!row)fail(409,'GIFT_ORDER_MISSING');
 const gift=giftByKey.get(row.gift_key);
 await audit(q,row.sender,'gift.delivered',row.id,{recipient:row.recipient,key:row.gift_key,stars:row.stars});
 await notify(q,row.recipient,'🎁 Тебе подарили '+(gift?.name||'подарок')+' в VEYRA! Открой профиль → Коллекция подарков.');
}
export async function revokePaidGift(q,order){
 const gift=await one(q,"UPDATE gifts SET status='revoked' WHERE order_id=$1 AND status='delivered' RETURNING *",[order.id]);
 if(gift)await audit(q,order.user_id,'gift.refunded',gift.id,{recipient:gift.recipient});
}
export function giftsRoutes(app,{db,rate,tg}){
 app.get('/api/gifts/catalog',async(req,res)=>{
  res.json({gifts:giftCatalog,payments_enabled:!!await flag(db,'payments'),free_daily_limit:1});
 });
 app.get('/api/gifts/collection/me',async(req,res)=>{
  await approved(db,req.user.id);
  res.json(await collection(db,req.user.id));
 });
 app.get('/api/gifts/collection/:id',async(req,res)=>{
  const target=parse(id,req.params.id);
  await ensurePair(db,req.user.id,target);
  res.json(await collection(db,target));
 });
 app.get('/api/gifts/status/:id',async(req,res)=>{
  const giftId=parse(uuid,req.params.id);
  const gift=await one(db,'SELECT id,sender,recipient,status FROM gifts WHERE id=$1',[giftId]);
  if(!gift||(String(gift.sender)!==String(req.user.id)&&String(gift.recipient)!==String(req.user.id)))fail(404,'GIFT_NOT_FOUND');
  res.json({id:gift.id,status:gift.status});
 });
 app.post('/api/gifts/send',async(req,res)=>{
  const {target,gift_key,note,client_id}=parse(z.object({
   target:id,gift_key:z.string().max(40),note:z.string().trim().max(140).default(''),
   client_id:uuid
  }).strict(),req.body);
  const gift=giftByKey.get(gift_key);
  if(!gift)fail(404,'GIFT_NOT_FOUND');
  await rate('gift:'+req.user.id,20,3600);
  const result=await db.tx(async q=>{
   await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
   const existing=await one(q,'SELECT * FROM gifts WHERE sender=$1 AND client_id=$2',[req.user.id,client_id]);
   if(existing){
    if(String(existing.recipient)!==String(target)||existing.gift_key!==gift_key)fail(409,'GIFT_IDEMPOTENCY_CONFLICT');
    return {row:existing,duplicate:true};
   }
   await ensurePair(q,req.user.id,target);
   let order=null;
   if(gift.stars===0){
    const already=await one(q,"SELECT count(*)::int AS n FROM gifts WHERE sender=$1 AND stars=0 AND status='delivered' AND created_at>=now()-interval '24 hours'",[req.user.id]);
    if(already.n>=1)fail(429,'FREE_GIFT_LIMIT');
   }else{
    if(!await flag(q,'payments'))fail(503,'PAYMENTS_DISABLED');
    order=await one(q,"INSERT INTO orders(id,user_id,sku,total,kind,amount,first_only) VALUES($1,$2,NULL,$3,'gift',1,false) RETURNING *",[randomUUID(),req.user.id,gift.stars]);
   }
   const row=await one(q,`INSERT INTO gifts(id,sender,recipient,gift_key,stars,note,client_id,order_id,status,delivered_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [randomUUID(),req.user.id,target,gift.key,gift.stars,note,client_id,order?.id||null,order?'pending':'delivered',order?null:new Date()]);
   if(!order){
    await audit(q,req.user.id,'gift.delivered',row.id,{recipient:target,key:gift.key,stars:0});
    await notify(q,target,'🎁 Тебе подарили '+gift.name+' в VEYRA! Открой профиль → Коллекция подарков.');
   }
   return {row,order,duplicate:false};
  });
  if(result.row.status==='delivered'){res.status(201).json({status:'delivered',gift_id:result.row.id});return;}
  const order=result.order||await one(db,'SELECT * FROM orders WHERE id=$1',[result.row.order_id]);
  if(!order||order.status!=='pending')fail(409,'GIFT_ORDER_UNAVAILABLE');
  const invoice=await new StarsProvider(tg).invoice({...order,title:'Подарок VEYRA · '+gift.name});
  res.status(201).json({status:'payment_required',gift_id:result.row.id,order_id:order.id,invoice_url:invoice});
 });
}
async function collection(q,user){
 const rows=(await q.query(`SELECT g.id,g.gift_key,g.stars,g.note,g.created_at,g.delivered_at,
   p.name AS sender_name FROM gifts g LEFT JOIN profiles p ON p.user_id=g.sender
   WHERE g.recipient=$1 AND g.status='delivered' ORDER BY g.delivered_at DESC,g.id DESC LIMIT 120`,[user])).rows;
 const total=await one(q,"SELECT count(*)::int AS n FROM gifts WHERE recipient=$1 AND status='delivered'",[user]);
 return {total:total.n,items:rows.map(r=>({...r,gift:giftByKey.get(r.gift_key)||null}))};
}
