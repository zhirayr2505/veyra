import {createHmac,createHash,timingSafeEqual,randomBytes} from 'node:crypto';
export class ApiError extends Error {constructor(status,code){super(code);this.status=status;}}
export const fail=(status,code)=>{throw new ApiError(status,code)};
export const hash=s=>createHash('sha256').update(s).digest('hex');
export const token=()=>randomBytes(32).toString('base64url');
export function verifyInitData(raw,botToken,now=Date.now()){
 if(typeof raw!=='string'||raw.length>16384)fail(401,'AUTH_INVALID');
 const p=new URLSearchParams(raw);if([...p.keys()].length!==new Set(p.keys()).size)fail(401,'AUTH_INVALID');
 const h=p.get('hash');p.delete('hash');if(!/^[a-f0-9]{64}$/i.test(h||''))fail(401,'AUTH_INVALID');
 const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>`${k}=${v}`).join('\n');
 const key=createHmac('sha256','WebAppData').update(botToken).digest();
 const sig=createHmac('sha256',key).update(data).digest();
 if(!timingSafeEqual(sig,Buffer.from(h,'hex')))fail(401,'AUTH_INVALID');
 const date=Number(p.get('auth_date'));if(!date||date*1000>now+30000||now-date*1000>3600000)fail(401,'AUTH_EXPIRED');
 let user;try{user=JSON.parse(p.get('user'));}catch{fail(401,'AUTH_INVALID');}
 if(!Number.isSafeInteger(user?.id)||user.id<=0)fail(401,'AUTH_INVALID');
 return {user,start:p.get('start_param')};
}
export function ageAt(birth,now=new Date()) {const b=new Date(birth+'T00:00:00Z');let a=now.getUTCFullYear()-b.getUTCFullYear();if(now.getUTCMonth()<b.getUTCMonth()||(now.getUTCMonth()===b.getUTCMonth()&&now.getUTCDate()<b.getUTCDate()))a--;return a;}
export function validBirth(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s&&ageAt(s)>=18&&ageAt(s)<=110;}
export const premium=u=>new Date(u.premium_until)>new Date();
export function normalizeRedis(raw){let s=raw.trim();if(s.startsWith('redis-cli')){const m=s.match(/-u\s+['"]?(rediss?:\/\/[^\s'"]+)/);if(!m)throw Error('REDIS_URL must be a Redis URL');s=m[1];if(raw.includes('--tls'))s=s.replace(/^redis:/,'rediss:');}return s;}
export const safeCSV=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
export const webhookSecret=(botToken)=>createHmac('sha256',botToken).update('veyra-webhook-v1').digest('hex');
export const secureEqual=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
