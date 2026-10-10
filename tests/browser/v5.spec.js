import {test,expect} from '@playwright/test';
import {initData,env} from '../helpers.js';
import sharp from 'sharp';
async function telegram(page,id,admin=false){
 await page.route('https://telegram.org/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
 await page.addInitScript(data=>{window.Telegram={WebApp:{initData:data,initDataUnsafe:{user:{language_code:'ru'}},ready(){},expand(){},setHeaderColor(){},setBackgroundColor(){},openInvoice(){}}};},initData(id,admin?env.ADMIN_BOT_TOKEN:env.USER_BOT_TOKEN));
}
test('V5 signed Telegram startup, persistent tabs, and real discovery',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await telegram(page,10);await page.goto('/');
 await expect(page.locator('.feed-photo')).toBeVisible();
 await expect(page.locator('.bottom-nav button')).toHaveCount(4);
 await page.getByRole('button',{name:'Фильтры'}).click();
 await expect(page.getByRole('dialog',{name:'фильтры'})).toBeVisible();
 await page.getByRole('button',{name:'Закрыть'}).click();
 await expect(page.locator('.feed-photo')).toBeVisible();
 await page.locator('.bottom-nav').getByRole('button',{name:'чаты'}).click();
 await expect(page.locator('.chat-tile').first()).toBeVisible();
 await page.locator('.bottom-nav').getByRole('button',{name:'лента'}).click();
 await expect(page.locator('.feed-photo')).toBeVisible();
 expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('V5 real match chat opens, sends and persists messages',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await page.locator('.bottom-nav').getByRole('button',{name:'чаты'}).click();
 await page.locator('.chat-tile').first().click();
 await expect(page.locator('.conversation')).toBeVisible();
 await expect(page.locator('.bubble').first()).toBeVisible();
 const msg='Привет VEYRA '+Date.now();
 await page.getByRole('textbox',{name:'Сообщение'}).fill(msg);
 await page.getByRole('button',{name:'Отправить',exact:true}).click();
 await expect(page.locator('.bubble.mine').filter({hasText:msg})).toBeVisible();
});
test('V5 newly signed adult opens registration immediately and rejects an underage date',async({page})=>{
 await telegram(page,20);await page.goto('/');
 await expect(page.getByRole('heading',{name:'расскажите о себе'})).toBeVisible();
 await page.getByRole('textbox',{name:'Имя'}).fill('Test Adult');
 await page.getByLabel('Дата рождения').fill('2017-01-01');
 await page.getByRole('button',{name:'мужчина'}).click();
 await page.getByRole('button',{name:'далее'}).click();
 await expect(page.getByRole('alert')).toContainText('18');
});
test('V5 admin bot signed auth opens private moderation queue',async({page})=>{
 await telegram(page,1,true);await page.goto('/admin');
 await expect(page.getByRole('heading',{name:'панель VEYRA'})).toBeVisible();
 await page.getByRole('button',{name:'модерация'}).click();
 await expect(page.locator('.moderation-profile').first()).toBeVisible();
});

test('V5 real chat accepts authorized photo and kit sticker',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await page.locator('.bottom-nav').getByRole('button',{name:'чаты'}).click();
 await page.locator('.chat-tile').first().click();
 const png=await sharp({create:{width:120,height:120,channels:3,background:{r:247,g:120,b:150}}}).png().toBuffer();
 await page.locator('.conversation input[type=file]').setInputFiles({name:'hello.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('.bubble.mine .message-image').last()).toBeVisible();
 await page.getByRole('button',{name:'Стикеры'}).click();
 await page.locator('.sticker-tray button').first().click();
 await expect(page.locator('.bubble.mine .message-sticker').last()).toBeVisible();
});

test('V5 undo submits actual target and restores the card',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await expect(page.locator('.feed-photo')).toBeVisible();
 const name=await page.locator('.feed-photo .hero-name').innerText();
 await page.getByRole('button',{name:'Пропустить'}).click();
 await page.getByRole('button',{name:'Отменить последнее действие'}).click();
 await expect(page.locator('.feed-photo .hero-name')).toContainText(name.split(',')[0]);
});

test('V5 member uses full-screen navigation and returns to the same chat',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await page.locator('.bottom-nav').getByRole('button',{name:'чаты'}).click();
 await page.locator('.chat-tile').first().click();
 await expect(page.locator('.conversation')).toBeVisible();
 await page.locator('.conversation-head .chat-user').click();
 await expect(page.locator('.member')).toBeVisible();
 await expect(page.locator('.bottom-nav')).toHaveCount(0);
 await page.locator('.member .top-header button.back').click();
 await expect(page.locator('.conversation')).toBeVisible();
});

test('V5 support requests use the real authenticated ticket API',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await page.locator('.bottom-nav').getByRole('button',{name:'профиль'}).click();
 await page.locator('.own-shortcuts').getByRole('button',{name:'настройки'}).click();
 await page.getByRole('button',{name:/помощь и поддержка/}).click();
 await expect(page.getByRole('dialog',{name:'Поддержка VEYRA'})).toBeVisible();
 await page.getByPlaceholder('Расскажи, что произошло').fill('Проверка обращения из мини-приложения');
 await page.getByRole('button',{name:'отправить обращение'}).click();
 await expect(page.locator('.support-thread')).toContainText('Проверка обращения из мини-приложения');
});

test('V5 like/pass immediately returns the next card in one API request',async({page})=>{
 await telegram(page,10);let feedRequests=0;
 page.on('request',request=>{if(new URL(request.url()).pathname==='/api/feed')feedRequests++});
 await page.goto('/');
 await expect(page.locator('.feed-photo')).toBeVisible();
 const first=await page.locator('.feed-photo .hero-name').innerText();
 const before=feedRequests;
 await page.getByRole('button',{name:'Пропустить'}).click();
 await expect(page.locator('.feed-photo .hero-name')).not.toHaveText(first);
 expect(feedRequests).toBe(before);
});

test('V5 onboarding animates, autocompletes a verified city and uploads only seven preview photos',async({page})=>{
 await telegram(page,22);await page.goto('/');
 await expect(page.getByRole('heading',{name:'расскажите о себе'})).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Имя'})).toHaveValue('Tester');
 await page.getByRole('textbox',{name:'Имя'}).fill('Seven Photos Test!123');
 await expect(page.getByRole('textbox',{name:'Имя'})).toHaveValue('Seven Photos Test');
 await expect(page.locator('.name-feedback')).toBeVisible();
 await expect(page.locator('.gender-choice img')).toHaveCount(2);
 await page.getByLabel('Дата рождения').fill('1998-05-12');
 await page.getByRole('button',{name:'мужчина'}).click();
 await page.getByRole('button',{name:'далее'}).click();
 await expect(page.getByRole('heading',{name:'где вы ищете?'})).toBeVisible();
 await expect(page.locator('.registration-step.forward')).toBeVisible();
 await page.getByRole('textbox',{name:'Поиск города'}).fill('Par');
 await expect(page.locator('.city-results button').first()).toBeVisible();
 await page.locator('.city-results button').first().click();
 await expect(page.locator('.location-card')).toContainText('Paris');
 await page.getByRole('button',{name:'выбрать город'}).click();
 await expect(page.getByRole('heading',{name:'кого хотите встретить?'})).toBeVisible();
 await expect(page.locator('.age-range-rails input[type=range]')).toHaveCount(2);
 await expect(page.locator('.looking-choice img')).toHaveCount(3);
 await expect(page.locator('.looking-choice img').nth(2)).toHaveAttribute('src',/looking_all\.svg/);
 await page.getByRole('button',{name:'рассказать о себе'}).click();
 await expect(page.getByRole('heading',{name:'ваши интересы'})).toBeVisible();
 await page.locator('.interest-tag').first().click();
 await page.locator('.interest-tag').nth(1).click();
 await page.getByRole('button',{name:'добавить фото'}).click();
 await expect(page.locator('.photo-slot')).toHaveCount(7);
 await expect(page.locator('.photo-slot.primary')).toHaveCount(1);
 const png=await sharp({create:{width:120,height:120,channels:3,background:{r:238,g:131,b:155}}}).png().toBuffer();
 const files=Array.from({length:8},(_,i)=>({name:'test'+i+'.png',mimeType:'image/png',buffer:png}));
 await page.locator('input[type=file]').setInputFiles(files);
 await expect(page.locator('.registration-toast')).toContainText('максимум 7 фото');
 await expect(page.locator('.photo-footnote')).toContainText('Загружено 7 из 7',{timeout:45000});
 await expect(page.locator('.photo-slot .photo-box')).toHaveCount(7);
 await expect(page.locator('.thumb-order')).toHaveCount(0);
 const dragged=page.locator('.photo-slot').nth(1),drop=page.locator('.photo-slot').nth(3);
 const a=await dragged.boundingBox(),b=await drop.boundingBox();
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.waitForTimeout(430);
 await expect(page.locator('.photo-drag-ghost')).toBeVisible();
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});
 await expect(page.locator('.photo-slot.drag-origin')).toHaveCount(1);
 await page.mouse.up();
 await expect(page.locator('.photo-drag-ghost')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'посмотреть анкету'})).toBeVisible();
 await page.getByRole('button',{name:'посмотреть анкету'}).click();
 await expect(page.locator('.preview-gallery-slide')).toHaveCount(3);
 await expect(page.locator('.preview-dots button')).toHaveCount(7);
 await expect(page.locator('.preview-count')).toHaveCount(0);
 await expect(page.locator('.preview-card-chips svg')).toHaveCount(2);
 await expect(page.locator('.preview-card-caption')).toContainText('Seven Photos Test');
 for(let n=0;n<7;n++){
  await page.getByRole('button',{name:'Следующее фото'}).click();
  await expect(page.locator('.preview-dots button').nth((n+1)%7)).toHaveAttribute('aria-current','true');
 }
 await expect(page.locator('.preview-dots button').first()).toHaveClass(/active/);
 await page.getByRole('button',{name:'Предыдущее фото'}).click();
 await expect(page.locator('.preview-dots button').last()).toHaveClass(/active/);
 await page.getByRole('button',{name:'редактировать'}).click();
 await expect(page.locator('.photo-slot')).toHaveCount(7);
});

test('V5 server account reset cannot resurrect a stale cached registration step',async({page})=>{
 await telegram(page,23);
 await page.addInitScript(()=>{localStorage.setItem('veyra.registration.v5.23',JSON.stringify({step:5,data:{name:'OLD CACHED NAME',city:'OLD CACHED CITY'}}))});
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'расскажите о себе'})).toBeVisible();
 await expect(page.locator('input[placeholder="Как тебя зовут?"]')).toHaveValue('Tester');
});


test('V7 registration keeps call-to-action pinned and interest icons visible',async({page})=>{
 await telegram(page,24);await page.goto('/');
 await expect(page.locator('.registration-actions')).toBeVisible();
 const box=await page.locator('.registration-actions').boundingBox();
 expect(Math.abs((box.y+box.height)-page.viewportSize().height)).toBeLessThan(3);
 await page.getByRole('textbox',{name:'Имя'}).fill('Мария💗123');
 await expect(page.getByRole('textbox',{name:'Имя'})).toHaveValue('Мария');
 await page.getByLabel('Дата рождения').fill('1998-05-12');
 await page.getByRole('button',{name:'женщина'}).click();
 await page.getByRole('button',{name:'далее'}).click();
 await page.getByRole('textbox',{name:'Поиск города'}).fill('Par');
 await page.locator('.city-results button').first().click();
 await expect(page.locator('.location-card')).toContainText('Paris');
 await expect(page.locator('.city-search')).toHaveCount(0);
 await page.getByRole('button',{name:'изменить город'}).click();
 await expect(page.locator('.city-search')).toBeVisible();
 await expect(page.getByRole('button',{name:'использовать моё местоположение'})).toBeVisible();
 await page.getByRole('button',{name:'скрыть поиск'}).click();
 await expect(page.getByRole('button',{name:'использовать моё местоположение'})).toHaveCount(0);
 await page.getByRole('button',{name:'выбрать город'}).click();
 await page.getByRole('button',{name:'рассказать о себе'}).click();
 await expect(page.locator('.interest-tag svg')).toHaveCount(15);
});


test('V8 manual city can be corrected using device location without leaving the page',async({page,context})=>{
 await context.grantPermissions(['geolocation'],{origin:'http://127.0.0.1:3100'});
 await context.setGeolocation({latitude:45.035,longitude:38.975});
 await page.route('**/api/geo?lat=*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{city:'Краснодар',country:'Россия',lat:45.035,lon:38.975,label:'Краснодар, Россия'}])}));
 await telegram(page,25);await page.goto('/');
 await page.getByLabel('Дата рождения').fill('1998-05-12');
 await page.getByRole('button',{name:'мужчина'}).click();
 await page.getByRole('button',{name:'далее'}).click();
 await page.getByRole('textbox',{name:'Поиск города'}).fill('Par');
 await page.locator('.city-results button').first().click();
 await expect(page.locator('.location-card')).toContainText('Paris');
 await page.getByRole('button',{name:'изменить город'}).click();
 const navCount=await page.evaluate(()=>performance.getEntriesByType('navigation').length);
 await page.getByRole('button',{name:'использовать моё местоположение'}).click();
 await expect(page.locator('.location-card')).toContainText('Краснодар');
 await expect(page.locator('.city-search')).toHaveCount(0);
 expect(await page.evaluate(()=>performance.getEntriesByType('navigation').length)).toBe(navCount);
});
