import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {enableTelegramFullscreen} from '../web/v5/telegramViewport.js';
import {interestTone,sharedInterestSet,normalizeInterest} from '../web/v5/profilePolishLogic.js';

function fakeDocument(){
 const properties=new Map(),listeners=new Map(),classes=new Set();
 return {
  documentElement:{
   style:{setProperty:(name,value)=>properties.set(name,value)},
   classList:{
    toggle:(name,enabled)=>enabled?classes.add(name):classes.delete(name),
    remove:name=>classes.delete(name)
   }
  },
  addEventListener:(name,fn)=>listeners.set(name,fn),
  removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name)},
  properties,listeners,classes
 };
}
function makeClient(version='7.7'){
 const actions=[],events=new Map();
 const supported=target=>version.split('.').map(Number).reduce((sum,part,i)=>sum+part/(100**i),0)>=target.split('.').map(Number).reduce((sum,part,i)=>sum+part/(100**i),0);
 return {
  actions,events,
  initData:'signed-init-data',
  safeAreaInset:{top:20,bottom:9},contentSafeAreaInset:{top:8,bottom:14},
  isFullscreen:false,
  isVersionAtLeast:supported,
  ready(){actions.push('ready')},
  expand(){actions.push('expand')},
  disableVerticalSwipes(){actions.push('disable')},
  enableVerticalSwipes(){actions.push('enable')},
  requestFullscreen(){actions.push('fullscreen')},
  onEvent:(name,fn)=>events.set(name,fn),
  offEvent:(name,fn)=>{if(events.get(name)===fn)events.delete(name)}
 };
}
function withDocument(fn){
 const prev=globalThis.document,doc=fakeDocument();
 globalThis.document=doc;
 try{return fn(doc)}finally{if(prev===undefined)delete globalThis.document;else globalThis.document=prev}
}

test('Telegram 7.7+ disables the native vertical-dismiss gesture on expand and viewport/fullscreen events',()=>withDocument(doc=>{
 const client=makeClient('8.0'),release=enableTelegramFullscreen(client);
 assert.deepEqual(client.actions.slice(0,4),['ready','expand','disable','fullscreen']);
 assert.equal(client.events.has('viewportChanged'),true);
 assert.equal(client.events.has('fullscreenChanged'),true);
 client.events.get('viewportChanged')();
 client.isFullscreen=true;
 client.events.get('fullscreenChanged')();
 assert.equal(client.actions.filter(x=>x==='disable').length,3);
 assert.equal(doc.classes.has('veyra-telegram-fullscreen'),true);
 assert.equal(doc.properties.get('--veyra-telegram-bottom'),'14px');
 release();
 assert.equal(client.actions.includes('enable'),false);
 assert.equal(client.events.size,0);
 assert.equal(doc.classes.has('veyra-telegram-fullscreen'),false);
}));

test('Telegram 7.7 gets swipe suppression without calling unsupported fullscreen',()=>withDocument(doc=>{
 const client=makeClient('7.7');const release=enableTelegramFullscreen(client);
 assert.equal(client.actions.includes('disable'),true);
 assert.equal(client.actions.includes('fullscreen'),false);
 doc.listeners.get('pointerdown')?.();
 assert.ok(client.actions.filter(x=>x==='disable').length>=2);
 release();
}));

test('Telegram 7.6 or buggy clients keep native scrolling without throwing',()=>withDocument(()=>{
 const old=makeClient('7.6'),closeOld=enableTelegramFullscreen(old);
 assert.equal(old.actions.includes('disable'),false);
 closeOld();
 const broken=makeClient('8.0');broken.disableVerticalSwipes=()=>{throw Error('unsupported')};
 assert.doesNotThrow(()=>{const release=enableTelegramFullscreen(broken);broken.events.get('viewportChanged')();release()});
 assert.equal(old.actions.includes('enable'),false);
}));

test('css overscroll guard and original native scroll behavior remain intact',()=>{
 const swipe=readFileSync(new URL('../web/v5/TelegramSwipeGuard.css',import.meta.url),'utf8');
 const viewport=readFileSync(new URL('../web/v5/telegramViewport.js',import.meta.url),'utf8');
 const motion=readFileSync(new URL('../web/v5/MemberMotionV2.css',import.meta.url),'utf8');
 assert.match(swipe,/html,body\s*\{\s*overscroll-behavior-y:none/);
 for(const className of ['message-stream','vx-profile-scroller','discover','likes-gallery','veyra-interests-sheet'])
  assert.ok(swipe.includes(className),'missing overscroll containment: '+className);
 assert.match(motion,/-webkit-overflow-scrolling:touch;touch-action:pan-y/);
 assert.doesNotMatch(viewport,/\.preventDefault\s*\(|enableVerticalSwipes\?\.\(/);
});

test('interest palette is semantic, not based on nth-child and common detection ignores case',()=>{
 const groups=[
  {title:'Музыка',items:['Музыка','Рок']},
  {title:'Активность',items:['Спорт']},
  {title:'Культура',items:['Книги']}
 ];
 assert.equal(interestTone('  МУЗЫКА ',groups),'violet');
 assert.equal(interestTone('СПОРТ',groups),'sky');
 assert.equal(interestTone('книги',groups),'rose');
 assert.equal(interestTone('Неизвестный интерес',groups),'violet');
 assert.equal(normalizeInterest(' СпОрТ '),'спорт');
 assert.deepEqual([...sharedInterestSet(['Спорт','Кино','Кофе'],['спорт','КОФЕ'])],['спорт','кофе']);
 const css=readFileSync(new URL('../web/v5/MemberPolish7.css',import.meta.url),'utf8');
 assert.match(css,/data-tone="sky"/);
 assert.match(css,/data-common="true"/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
