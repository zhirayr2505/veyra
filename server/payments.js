import {randomUUID} from 'node:crypto';
import {one} from './db.js';
import {fail} from './core.js';
import {flag,grant,audit,notify} from './domain.js';
import {deliverPaidGift,revokePaidGift} from './gifts.js';
import {activatePaidCourtship,revokePaidCourtship} from './courtship.js';
export class StarsProvider{constructor(tg){this.tg=tg;}async refund(order){return this.tg('user','refundStarPayment',{user_id:Number(order.user_id),telegram_payment_charge_id:order.telegram_charge});}async invoice(order){return this.tg('user','createInvoiceLink',{title:order.title,description:'VEYRA · '+order.title,payload:order.id,provider_token:'',currency:'XTR',prices:[{label:order.title,amount:order.total}]});}}
export class PaymentRegistry{constructor(stars){this.providers=new Map([['stars',stars]]);}get(name){if(!this.providers.has(name))fail(400,'PAYMENT_PROVIDER_DISABLED');return this.providers.get(name);}}
export async function createOrder(q,user,sku){if(!await flag(q,'payments'))fail(503,'PAYMENTS_DISABLED');await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user]);const p=await one(q,'SELECT * FROM products WHERE sku=$1 AND active',[sku]);if(!p)fail(404,'PRODUCT_NOT_FOUND');if(p.first_only&&await one(q,"SELECT 1 FROM orders WHERE user_id=$1 AND status='paid' AND created_at>=(SELECT created_at FROM users WHERE id=$1)",[user]))fail(409,'INTRO_ALREADY_USED');const o=await one(q,'INSERT INTO orders(id,user_id,sku,total,kind,amount,first_only) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[randomUUID(),user,p.sku,p.stars,p.kind,p.amount,p.first_only]);return {...o,title:p.title};}
export async function validateCheckout(q,pc){
 const initial=await one(q,'SELECT user_id FROM orders WHERE id=$1',[pc.invoice_payload]);if(!initial)return false;
 await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[initial.user_id]);
 const o=await one(q,"SELECT o.* FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=$1 AND u.status='active' FOR UPDATE OF o",[pc.invoice_payload]);
 if(!o||o.status!=='pending'||String(o.user_id)!==String(pc.from.id)||pc.currency!=='XTR'||pc.total_amount!==o.total||new Date(o.created_at)<new Date(Date.now()-3600000))return false;
 if(!await flag(q,'payments'))return false;
 if(o.kind==='courtship'){
  // Never authorize a charge if the match has ended or the recipient's
  // explicit consent has been withdrawn before Telegram's pre-checkout.
  const eligible=await one(q,`SELECT c.id FROM courtships c JOIN matches m ON m.id=c.match_id
   WHERE c.order_id=$1 AND c.status='payment_pending' AND m.active=true
   AND NOT EXISTS(SELECT 1 FROM blocks b WHERE
    (b.actor=c.sender AND b.target=c.recipient) OR (b.actor=c.recipient AND b.target=c.sender))`,[o.id]);
  if(!eligible)return false;
 }
 if(o.precheckout_id&&o.precheckout_id!==pc.id)return false;
 if(o.first_only&&await one(q,"SELECT 1 FROM orders WHERE user_id=$1 AND id<>$2 AND (status='paid' OR (first_only AND precheckout_id IS NOT NULL))",[o.user_id,o.id]))return false;
 if(!pc.id)return false;
 await q.query('UPDATE orders SET precheckout_id=$2,precheckout_at=now() WHERE id=$1',[o.id,pc.id]);return true;
}
export async function settle(q,from,p){const initial=await one(q,'SELECT * FROM orders WHERE id=$1',[p.invoice_payload]);if(!initial)fail(400,'UNKNOWN_ORDER');await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[initial.user_id]);const o=await one(q,'SELECT * FROM orders WHERE id=$1 FOR UPDATE',[initial.id]);if(String(o.user_id)!==String(from)||p.currency!=='XTR'||p.total_amount!==o.total||!p.telegram_payment_charge_id)fail(400,'PAYMENT_MISMATCH');if(o.status==='paid'||o.status==='refunded'){if(o.telegram_charge!==p.telegram_payment_charge_id)fail(409,'DUPLICATE_CHARGE');return;}
 await q.query("UPDATE orders SET status='paid',telegram_charge=$2,paid_at=now() WHERE id=$1",[o.id,p.telegram_payment_charge_id]);if(o.kind==='gift')await deliverPaidGift(q,o);else if(o.kind==='courtship')await activatePaidCourtship(q,o);else await grant(q,o.user_id,o.kind,o.amount);await audit(q,o.user_id,'payment.settled',o.id,{stars:o.total});await notify(q,o.user_id,o.kind==='gift'?'🎁 Подарок успешно отправлен в VEYRA.':o.kind==='courtship'?'💜 Статус ухажёра активен.':'✨ Оплата получена. Покупка активирована в VEYRA.');}

export async function finalizeRefund(q,orderId,actor){
 const initial=await one(q,'SELECT user_id FROM orders WHERE id=$1',[orderId]);
 if(!initial)return;
 // Keep the same lock order as settlement: user, then order.
 await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[initial.user_id]);
 const o=await one(q,'SELECT * FROM orders WHERE id=$1 FOR UPDATE',[orderId]);
 if(!o||o.status==='refunded')return;
 if(o.status!=='paid')fail(409,'ORDER_NOT_PAID');
 if(o.kind==='gift')await revokePaidGift(q,o);
 else if(o.kind==='courtship')await revokePaidCourtship(q,o);
 else if(o.kind==='premium')await q.query("UPDATE users SET premium_until=greatest(now(),premium_until-($2::text||' days')::interval) WHERE id=$1",[o.user_id,o.amount]);
 else await q.query(`UPDATE users SET ${o.kind}=greatest(0,${o.kind}-$2) WHERE id=$1`,[o.user_id,o.amount]);
 await q.query("UPDATE orders SET status='refunded',refunded_at=now(),refund_requested=false WHERE id=$1",[orderId]);
 await audit(q,actor,'payment.refunded',orderId);await notify(q,o.user_id,'Возврат Telegram Stars выполнен.');
}
