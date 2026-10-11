import {randomUUID} from 'node:crypto';
import {one} from './db.js';
import {fail} from './core.js';
import {z,parse,uuid} from './validation.js';
import {flag,grant,audit,approved} from './domain.js';
import {StarsProvider} from './payments.js';

// Published, server-owned exchange rate. VEYS are not transferable or redeemable.
export const VEYS_PER_STAR=10;
export const VEYS_PACKS=Object.freeze([
 {sku:'veys_100',title:'100 VEYS',stars:10,amount:100},
 {sku:'veys_250',title:'250 VEYS',stars:25,amount:250},
 {sku:'veys_500',title:'500 VEYS',stars:50,amount:500},
 {sku:'veys_1000',title:'1 000 VEYS',stars:100,amount:1000},
 {sku:'veys_2500',title:'2 500 VEYS',stars:250,amount:2500}
]);
export const VEYS_ITEMS=Object.freeze([
 {sku:'super_1',title:'1 суперлайк',kind:'superlikes',amount:1,cost:90},
 {sku:'super_5',title:'5 суперлайков',kind:'superlikes',amount:5,cost:350},
 {sku:'super_15',title:'15 суперлайков',kind:'superlikes',amount:15,cost:850},
 {sku:'boost_1',title:'1 продвижение',kind:'boosts',amount:1,cost:250},
 {sku:'boost_3',title:'3 продвижения',kind:'boosts',amount:3,cost:600},
 {sku:'boost_10',title:'10 продвижений',kind:'boosts',amount:10,cost:1600},
 {sku:'prematch_1',title:'1 сообщение до мэтча',kind:'prematches',amount:1,cost:100},
 {sku:'prematch_5',title:'5 сообщений до мэтча',kind:'prematches',amount:5,cost:350}
]);
const packBySku=new Map(VEYS_PACKS.map(p=>[p.sku,p]));
const itemBySku=new Map(VEYS_ITEMS.map(p=>[p.sku,p]));
export const walletBalance=async(q,user)=>Number((await one(q,'SELECT balance FROM veys_wallets WHERE user_id=$1',[user]))?.balance||0);
async function ensureWallet(q,user){await q.query('INSERT INTO veys_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[user]);}
// All balance changes run within the caller's transaction, under the owner user's row lock.
// Never accept monetary amounts from client payloads.
async function change(q,user,delta,action,source,reference,{allowDebt=false}={}){
 if(!Number.isSafeInteger(delta)||!delta)fail(400,'VEYS_AMOUNT_INVALID');
 await ensureWallet(q,user);
 const existing=await one(q,'SELECT id,balance_after FROM veys_ledger WHERE user_id=$1 AND action=$2 AND source=$3 AND reference=$4',[user,action,source,reference]);
 if(existing)return {balance:Number(existing.balance_after),duplicate:true};
 const row=await one(q,`UPDATE veys_wallets SET balance=balance+$2,updated_at=now()
  WHERE user_id=$1 AND ($2>=0 OR balance+$2>=0 OR $3::boolean) RETURNING balance`,[user,delta,allowDebt]);
 if(!row)fail(402,'INSUFFICIENT_VEYS');
 await q.query('INSERT INTO veys_ledger(id,user_id,delta,balance_after,action,source,reference) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),user,delta,row.balance,action,source,reference]);
 return {balance:Number(row.balance),duplicate:false};
}
export const creditVeys=(q,user,amount,source,ref)=>change(q,user,amount,'topup',source,ref);
export const spendVeys=(q,user,amount,source,ref)=>change(q,user,-amount,'spend',source,ref);
export const refundVeys=(q,user,amount,ref)=>change(q,user,-amount,'refund','order',ref,{allowDebt:true});
export const grantTestVeys=(q,user,amount,ref)=>change(q,user,amount,'owner_test','developer',ref);

export function veysRoutes(app,{db,rate,tg,env}){
 app.get('/api/veys',async(req,res)=>{
  const [balance,history,enabled]=await Promise.all([
   walletBalance(db,req.user.id),
   db.query('SELECT id,delta,balance_after,action,source,created_at FROM veys_ledger WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 80',[req.user.id]),
   flag(db,'payments')
  ]);
  res.json({currency:'VEYS',symbol:'diamond',balance,rate:VEYS_PER_STAR,
   packs:VEYS_PACKS,items:VEYS_ITEMS,history:history.rows,
   payments_enabled:enabled,owner_free:String(req.user.id)===String(env.OWNER_TELEGRAM_ID)});
 });
 app.post('/api/veys/invoice',async(req,res)=>{
  await approved(db,req.user.id);
  await rate('veys-invoice:'+req.user.id,10,3600);
  const {sku}=parse(z.object({sku:z.string().min(1).max(40)}).strict(),req.body);
  const pack=packBySku.get(sku);if(!pack)fail(404,'VEYS_PACK_NOT_FOUND');
  const owner=String(req.user.id)===String(env.OWNER_TELEGRAM_ID);
  const order=await db.tx(async q=>{
   await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
   if(owner){
    const ref=randomUUID();
    const result=await grantTestVeys(q,req.user.id,pack.amount,ref);
    await audit(q,req.user.id,'owner.test.veys',ref,{amount:pack.amount,stars:0});
    return {owner_granted:true,balance:result.balance};
   }
   if(!await flag(q,'payments'))fail(503,'PAYMENTS_DISABLED');
   return one(q,`INSERT INTO orders(id,user_id,sku,total,kind,amount,first_only)
    VALUES($1,$2,NULL,$3,'veys',$4,false) RETURNING *`,[randomUUID(),req.user.id,pack.stars,pack.amount]);
  });
  if(order.owner_granted){res.json({status:'owner_granted',balance:order.balance,stars_charged:0});return;}
  const url=await new StarsProvider(tg).invoice({...order,title:'VEYRA · '+pack.title});
  res.status(201).json({order_id:order.id,status:'payment_required',url,amount:pack.amount,stars:pack.stars});
 });
 app.post('/api/veys/buy',async(req,res)=>{
  await approved(db,req.user.id);
  await rate('veys-buy:'+req.user.id,20,3600);
  const {sku,client_id}=parse(z.object({sku:z.string().min(1).max(40),client_id:uuid}).strict(),req.body);
  const item=itemBySku.get(sku);if(!item)fail(404,'VEYS_ITEM_NOT_FOUND');
  const owner=String(req.user.id)===String(env.OWNER_TELEGRAM_ID);
  const result=await db.tx(async q=>{
   await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
   const existing=await one(q,'SELECT * FROM veys_purchases WHERE user_id=$1 AND client_id=$2',[req.user.id,client_id]);
   if(existing){if(existing.sku!==sku)fail(409,'VEYS_IDEMPOTENCY_CONFLICT');return {id:existing.id,balance:await walletBalance(q,req.user.id),duplicate:true};}
   const purchase=await one(q,'INSERT INTO veys_purchases(id,user_id,client_id,sku,cost,kind,amount) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [randomUUID(),req.user.id,client_id,item.sku,owner?0:item.cost,item.kind,item.amount]);
   const payment=owner?{balance:await walletBalance(q,req.user.id)}:await spendVeys(q,req.user.id,item.cost,'purchase',purchase.id);
   await grant(q,req.user.id,item.kind,item.amount);
   await audit(q,req.user.id,'veys.purchase',purchase.id,{sku:item.sku,veys_spent:owner?0:item.cost,owner_test:owner});
   return {id:purchase.id,balance:payment.balance,duplicate:false};
  });
  res.status(201).json({status:'delivered',...result});
 });
}
