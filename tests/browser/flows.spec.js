import {test,expect} from '@playwright/test';import {initData,env} from '../helpers.js';
import sharp from 'sharp';
async function screenshot(page,path){
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));});
 await page.screenshot({path,fullPage:true,animations:'disabled'});
}
async function telegram(page,id,admin=false){await page.route('https://telegram.org/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));await page.addInitScript(({data})=>{window.Telegram={WebApp:{initData:data,initDataUnsafe:{user:{language_code:'ru'}},ready(){},expand(){},setHeaderColor(){},setBackgroundColor(){}}};},{data:initData(id,admin?env.ADMIN_BOT_TOKEN:env.USER_BOT_TOKEN)});}
test('mobile public landing has Telegram CTA and no horizontal overflow',async({page})=>{await page.route('https://telegram.org/**',route=>route.fulfill({body:''}));await page.goto('/');await expect(page.getByRole('link',{name:'Open in Telegram'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);});
test('real signed login opens feed, filters persist without restarting moderation',async({page})=>{await telegram(page,10);await page.goto('/');await expect(page.getByRole('heading',{name:'Лента'})).toBeVisible();await page.getByRole('button',{name:'Фильтры',exact:true}).click();await page.getByLabel('Расстояние, км').fill('250');await page.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Лента'})).toBeVisible();});
test('five-step registration resumes, blocks underage users, skips interests and enforces three photos',async({page},testInfo)=>{
 await telegram(page,20);await page.goto('/');await expect(page.getByRole('heading',{name:'Знакомство с тобой'})).toBeVisible();
 await page.getByLabel('Имя',{exact:true}).fill('Test Adult');await page.getByLabel('Дата рождения').fill('2015-05-12');await page.getByRole('button',{name:'Мужчина',exact:true}).click();await page.getByRole('button',{name:'Продолжить',exact:true}).click();await expect(page.getByRole('alert')).toContainText('VEYRA доступна с 18 лет');
 await page.getByLabel('Дата рождения').fill('1995-05-12');await page.getByRole('button',{name:'Продолжить',exact:true}).click();await expect(page.getByRole('heading',{name:'Люди рядом',exact:true})).toBeVisible();
 await page.getByLabel('Город и страна',{exact:true}).fill('Paris');await page.getByRole('button',{name:'Найти город',exact:true}).click();await page.getByRole('button',{name:'Paris',exact:true}).click();await page.getByRole('checkbox',{name:'Без ограничения',exact:true}).check();
 await page.getByRole('button',{name:'Продолжить',exact:true}).click();await expect(page.getByRole('heading',{name:'Кого хочешь встретить?',exact:true})).toBeVisible();await page.evaluate(()=>localStorage.clear());await page.reload();await expect(page.getByRole('heading',{name:'Кого хочешь встретить?',exact:true})).toBeVisible();await page.getByRole('button',{name:'Всех',exact:true}).click();await page.getByLabel('Возраст от',{exact:true}).fill('23');await page.getByLabel('Возраст до',{exact:true}).fill('32');await screenshot(page,testInfo.outputPath('registration-search.png'));
 await page.getByRole('button',{name:'Продолжить',exact:true}).click();await expect(page.getByRole('heading',{name:'Что тебе близко?',exact:true})).toBeVisible();await screenshot(page,testInfo.outputPath('registration-interests.png'));await page.getByRole('button',{name:'Заполнить позже',exact:true}).click();await expect(page.getByRole('heading',{name:'Покажи себя',exact:true})).toBeVisible();
 await page.getByRole('checkbox').check();await expect(page.getByRole('button',{name:'Отправить анкету на проверку',exact:true})).toBeDisabled();await page.reload();await expect(page.getByRole('heading',{name:'Покажи себя',exact:true})).toBeVisible();await expect(page.locator('.photo-tile')).toHaveCount(0);
});
test('admin login uses separate bot signature and opens moderation',async({page})=>{await telegram(page,1,true);await page.goto('/admin');await expect(page.getByRole('heading',{name:'Обзор',exact:true})).toBeVisible();await page.getByRole('button',{name:'Модерация',exact:true}).click();await expect(page.getByRole('heading',{name:'Очередь модерации'})).toBeVisible();await expect(page.getByRole('button',{name:'Одобрить',exact:true})).toBeVisible();});

test('two adults register, upload photos, receive approval, swipe to match, chat, exchange and export',async({browser},testInfo)=>{
 test.setTimeout(90000);
 const a=await browser.newPage({viewport:{width:390,height:844}}),b=await browser.newPage({viewport:{width:390,height:844}}),owner=await browser.newPage({viewport:{width:1280,height:900}});
 const photo=await sharp({create:{width:400,height:600,channels:3,background:'#8864bd'}}).png().toBuffer();
 async function register(page,id,name,gender){
  await telegram(page,id);await page.goto('/');
  await page.getByLabel('Имя',{exact:true}).fill(name);await page.getByLabel('Дата рождения').fill('1995-05-12');
  await page.getByRole('button',{name:gender==='man'?'Мужчина':'Женщина',exact:true}).click();if(id===101)await screenshot(page,testInfo.outputPath('registration-identity.png'));
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();await page.getByLabel('Город и страна',{exact:true}).fill('Paris');
  await page.getByRole('button',{name:'Найти город',exact:true}).click();await page.getByRole('button',{name:'Paris',exact:true}).click();if(id===101)await screenshot(page,testInfo.outputPath('registration-location.png'));
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  if(id===101){await page.getByRole('button',{name:'Кофе',exact:true}).click();await page.getByRole('button',{name:'Не курю',exact:true}).click();}
  await page.getByRole('button',{name:'Заполнить позже',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Покажи себя',exact:true})).toBeVisible();
  await page.getByLabel('Добавить фотографии',{exact:true}).setInputFiles([1,2,3].map(n=>({name:'fixture'+n+'.png',mimeType:'image/png',buffer:photo})));
  await expect(page.locator('.photo-tile img')).toHaveCount(3);await expect(page.getByRole('button',{name:'Переместить фото 3',exact:true})).toBeEnabled();
  const previous=await page.locator('.photo-tile').evaluateAll(nodes=>nodes.map(n=>n.dataset.photoId));
  if(id===101){
   const grip=await page.getByRole('button',{name:'Переместить фото 3',exact:true}).boundingBox(),target=await page.locator('.photo-tile').first().boundingBox();
   await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);await page.mouse.down();await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:8});await page.mouse.up();
   await expect(page.locator('.photo-tile').first()).toHaveAttribute('data-photo-id',previous[2]);await expect(page.getByRole('button',{name:'Переместить фото 1',exact:true})).toBeEnabled();
   await page.reload();await expect(page.locator('.photo-tile').first()).toHaveAttribute('data-photo-id',previous[2]);
   for(const width of [320,390]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
   await screenshot(page,testInfo.outputPath('registration-photos.png'));
  }
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Отправить анкету на проверку',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Анкета на проверке',exact:true})).toBeVisible();
 }
 await register(a,101,'Тест Алекс','man');await register(b,102,'Тест Анна','woman');
 await telegram(owner,1,true);await owner.goto('/admin');await owner.getByRole('button',{name:'Модерация',exact:true}).click();
 for(const name of ['Тест Алекс','Тест Анна']){
  const card=owner.locator('.review-card').filter({has:owner.getByRole('heading',{name:new RegExp(name)})});
  await expect(card.locator('img').first()).toBeVisible();await card.getByRole('button',{name:'Одобрить',exact:true}).click();await expect(card).toHaveCount(0);
 }
 for(const page of [a,b]){await page.getByRole('button',{name:'Обновить',exact:true}).click();await expect(page.getByRole('heading',{name:'Лента',exact:true})).toBeVisible();}
 await expect(a.locator('.dating-card')).toContainText('Тест Анна');
 for(const viewport of [{width:390,height:844},{width:320,height:568}]){
  await a.setViewportSize(viewport);
  await a.evaluate(()=>document.documentElement.style.setProperty('--safe','34px'));
  const bounds=await a.evaluate(()=>({nav:document.querySelector('.bottom-nav').getBoundingClientRect().top,buttons:[...document.querySelectorAll('.reaction-bar button')].map(x=>x.getBoundingClientRect().bottom),overflow:document.documentElement.scrollWidth>innerWidth}));
  expect(bounds.overflow).toBe(false);
  for(const bottom of bounds.buttons)expect(bottom).toBeLessThan(bounds.nav);
 }
 await screenshot(a,testInfo.outputPath('feed-small-safe-area.png'));
 await a.setViewportSize({width:390,height:844});await a.evaluate(()=>document.documentElement.style.removeProperty('--safe'));
 await screenshot(a,testInfo.outputPath('feed-mobile.png'));
 const card=a.locator('.dating-card');const box=await card.boundingBox();
 await a.mouse.move(box.x+box.width/2,box.y+box.height/2);await a.mouse.down();await a.mouse.move(box.x+box.width/2+120,box.y+box.height/2,{steps:12});await a.mouse.up();
 await expect(card).toHaveCount(0);
 await b.getByRole('button',{name:'Нравится',exact:true}).click();await expect(b.getByRole('dialog',{name:'Взаимная симпатия!'})).toBeVisible();await screenshot(b,testInfo.outputPath('match-mobile.png'));
 await b.getByRole('button',{name:'Перейти в чаты',exact:true}).click();await expect(b.locator('.chat-header')).toContainText('Тест Алекс');
 await b.getByRole('textbox',{name:'Сообщение…',exact:true}).fill('Привет из тестового чата');await b.getByRole('button',{name:'Отправить',exact:true}).click();
 await expect(b.locator('.bubble')).toContainText('Привет из тестового чата');
 await a.getByRole('button',{name:'Чаты',exact:true}).click();await a.locator('.chat-row').filter({hasText:'Тест Анна'}).click();
 await expect(a.locator('.bubble')).toContainText('Привет из тестового чата');
 for(const page of [a,b]){await page.locator('.chat-header').getByRole('button',{name:'Настройки',exact:true}).click();await page.getByRole('button',{name:'Обменяться Telegram',exact:true}).click();}
 await expect(b.locator('.exchange-link')).toHaveAttribute('href','https://t.me/tester101');await expect(a.locator('.exchange-link')).toHaveAttribute('href','https://t.me/tester102');
 const notice=a.locator('.toast');if(await notice.count())await notice.getByRole('button',{name:'Close',exact:true}).click();
 await screenshot(a,testInfo.outputPath('chat-mobile.png'));
 await owner.getByRole('button',{name:'Пользователи',exact:true}).click();await owner.getByPlaceholder('ID, username или имя').fill('101');
 await expect(owner.locator('.table-wrap tbody tr')).toHaveCount(1);const userRow=owner.getByRole('row').filter({has:owner.getByRole('cell',{name:'101',exact:true})});
 await userRow.getByRole('button',{name:'Открыть',exact:true}).click();await expect(owner.getByRole('dialog')).toContainText('Тест Анна');
 const downloaded=owner.waitForEvent('download');await owner.getByRole('button',{name:'Скачать анкету, фото и чаты',exact:true}).click();
 expect((await downloaded).suggestedFilename()).toBe('veyra-user-101.zip');
 await screenshot(owner,testInfo.outputPath('admin-user.png'));
 await a.close();await b.close();await owner.close();
});

test('redesigned screens use real data, chat search, profile pause and usable mobile layouts',async({page,browser},testInfo)=>{
 test.setTimeout(90000);await telegram(page,10);await page.goto('/');await expect(page.locator('.dating-card')).toBeVisible();
 await expect(page.locator('.dating-card .photo-image')).toHaveClass(/is-loaded/);
 await screenshot(page,testInfo.outputPath('design-feed.png'));
 const giftsRequests=[];page.on('request',r=>{if(r.method()==='POST'&&/gifts|payments/.test(r.url()))giftsRequests.push(r.url());});
 await page.getByRole('button',{name:'Подарки — скоро',exact:true}).click();await expect(page.getByRole('dialog',{name:'Подарки',exact:true})).toContainText('Скоро');await screenshot(page,testInfo.outputPath('gifts-placeholder.png'));await page.getByRole('button',{name:'Понятно',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);expect(giftsRequests).toHaveLength(0);

 await page.getByRole('button',{name:'Сегодня',exact:true}).click();await expect(page.locator('.today-person').first()).toBeVisible();
 expect(await page.locator('.today-person').count()).toBeGreaterThan(1);
 await screenshot(page,testInfo.outputPath('design-today.png'));
 const planSaved=page.waitForResponse(r=>r.url().endsWith('/api/today')&&r.request().method()==='PUT'&&r.status()===200);await page.getByRole('switch',{name:'Я свободен сегодня',exact:true}).check();await planSaved;await expect(page.getByRole('switch',{name:'Я свободен сегодня',exact:true})).toBeEnabled();await expect(page.getByRole('switch',{name:'Я свободен сегодня',exact:true})).toBeChecked();
 await page.getByRole('button',{name:'Лайки',exact:true}).click();await expect(page.locator('.like-tile').first()).toBeVisible();
 await screenshot(page,testInfo.outputPath('design-likes.png'));
 await page.locator('.like-tile').first().click();const preview=page.getByRole('dialog');await expect(preview).toBeVisible();const likeAction=preview.getByRole('button',{name:'Нравится',exact:true});await expect(likeAction).toBeVisible();await screenshot(page,testInfo.outputPath('design-profile-preview.png'));expect(await likeAction.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
 await preview.getByRole('button',{name:'Сообщение до мэтча',exact:true}).click();const greeting=page.getByRole('dialog',{name:'Сказать привет',exact:true});await expect(greeting).toBeVisible();await page.keyboard.press('Escape');await expect(greeting).toHaveCount(0);await expect(preview).toBeVisible();expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden');await page.keyboard.press('Escape');await expect(preview).toHaveCount(0);expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
 await page.getByRole('button',{name:'Чаты',exact:true}).click();await expect(page.locator('.chat-row').filter({hasText:'Диана'})).toBeVisible();
 await page.getByRole('textbox',{name:'Поиск по чатам…'}).fill('Несуществующий собеседник');await expect(page.locator('.chat-row')).toHaveCount(0);
 await page.getByRole('textbox',{name:'Поиск по чатам…'}).fill('Диана');await expect(page.locator('.chat-row')).toHaveCount(1);
 await screenshot(page,testInfo.outputPath('design-chats.png'));
 await page.locator('.chat-row').click();await expect(page.locator('.bubble')).toBeVisible();
 await screenshot(page,testInfo.outputPath('design-conversation.png'));
 await page.getByRole('button',{name:'Назад',exact:true}).click();await page.getByRole('button',{name:'Профиль',exact:true}).click();
 const pauseSaved=page.waitForResponse(r=>r.url().endsWith('/api/profile/visibility')&&r.request().method()==='PATCH'&&r.status()===200);await page.getByRole('switch',{name:/Пауза анкеты/}).check();await pauseSaved;await page.reload();await expect(page.getByRole('heading',{name:'Лента',exact:true})).toBeVisible();await expect(page.locator('.pause-note')).toBeVisible();
 await page.getByRole('button',{name:'Профиль',exact:true}).click();await expect(page.getByRole('switch',{name:/Пауза анкеты/})).toBeChecked();const resumed=page.waitForResponse(r=>r.url().endsWith('/api/profile/visibility')&&r.request().method()==='PATCH'&&r.status()===200);await page.getByRole('switch',{name:/Пауза анкеты/}).uncheck();await resumed;await expect(page.getByRole('switch',{name:/Пауза анкеты/})).toBeEnabled();
 await page.route('**/api/profile/visibility',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'TEMPORARY_UNAVAILABLE'})}),{times:1});
 await page.getByRole('switch',{name:/Пауза анкеты/}).click();await expect(page.getByRole('status')).toContainText('TEMPORARY_UNAVAILABLE');await expect(page.getByRole('switch',{name:/Пауза анкеты/})).not.toBeChecked();await page.getByRole('status').getByRole('button',{name:'Close'}).click();
 await screenshot(page,testInfo.outputPath('design-profile.png'));
 await page.locator('.premium-banner').click();await expect(page.getByRole('radiogroup')).toBeVisible();
 await expect(page.locator('.product-price').filter({hasText:'65'})).toBeVisible();
 await screenshot(page,testInfo.outputPath('design-premium.png'));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const locked=await browser.newPage({viewport:{width:390,height:844}});await telegram(locked,30);await locked.goto('/');await locked.getByRole('button',{name:'Лайки',exact:true}).click();await expect(locked.locator('.likes-paywall')).toBeVisible();await expect(locked.locator('.locked-tile img')).toHaveCount(0);await screenshot(locked,testInfo.outputPath('design-likes-locked.png'));await locked.close();
 const guest=await browser.newPage({viewport:{width:390,height:844}});await guest.route('https://telegram.org/**',route=>route.fulfill({body:''}));await guest.goto('/');await expect(guest.getByRole('link',{name:'Open in Telegram'})).toBeVisible();await screenshot(guest,testInfo.outputPath('design-welcome.png'));await guest.close();
});
