import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,existsSync} from 'node:fs';
const base=new URL('../web/v5/',import.meta.url);
const content=f=>readFileSync(new URL(f,base),'utf8');
test('VEYRA interface never loads deprecated V2 graphics after approval',()=>{
 const app=content('App.jsx');
 assert.ok(app.includes('/veyra-approved/01_icons/active/matches.svg'));
 assert.ok(existsSync(new URL('../public/veyra-approved/01_icons/active/matches.svg',import.meta.url)));
 for(const file of readdirSync(base).filter(n=>n.endsWith('.jsx'))){
  assert.doesNotMatch(content(file),/\/veyra-v2\/|\/assets\/veyra\//,file+' uses retired graphics');
 }
 const icons=content('UI.jsx');
 assert.ok(icons.includes("approvedBase+'01_icons/'+state+'/info.svg'"));
 assert.doesNotMatch(icons,/oldBase/);
});
test('gift dialog shows real wallet balance before asking to spend VEYS',()=>{
 const source=content('Extras.jsx');
 assert.ok(source.includes("get('/veys')"));
 assert.ok(source.includes('className="gift-wallet-status"'));
 assert.ok(source.includes("gift.veys>balance"));
 assert.ok(source.includes("Недостаточно VEYS для этого подарка"));
 const wallet=content('Veys.jsx');
 assert.ok(wallet.includes('Загружаем кошелёк'));
 assert.ok(wallet.includes('Повторить загрузку'));
});
