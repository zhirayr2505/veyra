import {test,expect} from '@playwright/test';import {initData,env} from '../helpers.js';
import sharp from 'sharp';
async function telegram(page,id,admin=false){await page.route('https://telegram.org/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));await page.addInitScript(({data})=>{window.Telegram={WebApp:{initData:data,initDataUnsafe:{user:{language_code:'ru'}},ready(){},expand(){},setHeaderColor(){},setBackgroundColor(){}}};},{data:initData(id,admin?env.ADMIN_BOT_TOKEN:env.USER_BOT_TOKEN)});}
test('mobile public landing has Telegram CTA and no horizontal overflow',async({page})=>{await page.route('https://telegram.org/**',route=>route.fulfill({body:''}));await page.goto('/');await expect(page.getByRole('link',{name:'Open in Telegram'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);});
test('real signed login opens feed, filters persist without restarting moderation',async({page})=>{await telegram(page,10);await page.goto('/');await expect(page.getByRole('heading',{name:'Знакомства ближе'})).toBeVisible();await page.getByRole('button',{name:'Фильтры',exact:true}).click();await page.getByLabel('Расстояние, км').fill('250');await page.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Знакомства ближе'})).toBeVisible();});
test('new user sees full onboarding, accepts consent, geo search fills location',async({page})=>{await telegram(page,20);await page.goto('/');await expect(page.getByRole('heading',{name:'Сначала — немного о тебе'})).toBeVisible();await page.getByLabel('Имя',{exact:true}).fill('Test Adult');await page.getByLabel('Дата рождения').fill('1995-05-12');await page.getByRole('textbox',{name:'Город',exact:true}).fill('Paris');await page.getByRole('button',{name:'Найти город',exact:true}).click();await page.getByRole('button',{name:'Paris'}).click();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Сохранить анкету'}).click();await expect(page.getByRole('heading',{name:'Добавь свои фотографии'})).toBeVisible();});
test('admin login uses separate bot signature and opens moderation',async({page})=>{await telegram(page,1,true);await page.goto('/admin');await expect(page.getByRole('heading',{name:'Обзор',exact:true})).toBeVisible();await page.getByRole('button',{name:'Модерация',exact:true}).click();await expect(page.getByRole('heading',{name:'Очередь модерации'})).toBeVisible();await expect(page.getByRole('button',{name:'Одобрить',exact:true})).toBeVisible();});

test('two adults register, upload photos, receive approval, swipe to match, chat, exchange and export',async({browser},testInfo)=>{
 test.setTimeout(90000);
 const a=await browser.newPage({viewport:{width:390,height:844}}),b=await browser.newPage({viewport:{width:390,height:844}}),owner=await browser.newPage({viewport:{width:1280,height:900}});
 const photo=await sharp({create:{width:400,height:600,channels:3,background:'#8864bd'}}).png().toBuffer();
 async function register(page,id,name,gender){
  await telegram(page,id);await page.goto('/');
  await page.getByLabel('Имя',{exact:true}).fill(name);await page.getByLabel('Дата рождения').fill('1995-05-12');
  await page.getByLabel('Я',{exact:true}).selectOption(gender);
  await page.getByRole('textbox',{name:'Город',exact:true}).fill('Paris');
  await page.getByRole('button',{name:'Найти город',exact:true}).click();await page.getByRole('button',{name:'Paris',exact:true}).click();
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Сохранить анкету',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Добавь свои фотографии',exact:true})).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:photo});
  await expect(page.locator('.photo-tile img')).toBeVisible();
  await page.getByRole('button',{name:'Отправить на проверку',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Анкета на проверке',exact:true})).toBeVisible();
 }
 await register(a,101,'Тест Алекс','man');await register(b,102,'Тест Анна','woman');
 await telegram(owner,1,true);await owner.goto('/admin');await owner.getByRole('button',{name:'Модерация',exact:true}).click();
 for(const name of ['Тест Алекс','Тест Анна']){
  const card=owner.locator('.review-card').filter({has:owner.getByRole('heading',{name:new RegExp(name)})});
  await expect(card.locator('img')).toBeVisible();await card.getByRole('button',{name:'Одобрить',exact:true}).click();await expect(card).toHaveCount(0);
 }
 for(const page of [a,b]){await page.getByRole('button',{name:'Обновить',exact:true}).click();await expect(page.getByRole('heading',{name:'Знакомства ближе',exact:true})).toBeVisible();}
 await expect(a.locator('.dating-card')).toContainText('Тест Анна');
 for(const viewport of [{width:390,height:844},{width:320,height:568}]){
  await a.setViewportSize(viewport);
  await a.evaluate(()=>document.documentElement.style.setProperty('--safe','34px'));
  const bounds=await a.evaluate(()=>({nav:document.querySelector('.bottom-nav').getBoundingClientRect().top,buttons:[...document.querySelectorAll('.reaction-bar button')].map(x=>x.getBoundingClientRect().bottom),overflow:document.documentElement.scrollWidth>innerWidth}));
  expect(bounds.overflow).toBe(false);
  for(const bottom of bounds.buttons)expect(bottom).toBeLessThan(bounds.nav);
 }
 await a.screenshot({path:testInfo.outputPath('feed-small-safe-area.png'),fullPage:true});
 await a.setViewportSize({width:390,height:844});await a.evaluate(()=>document.documentElement.style.removeProperty('--safe'));
 await a.screenshot({path:testInfo.outputPath('feed-mobile.png'),fullPage:true});
 const card=a.locator('.dating-card');const box=await card.boundingBox();
 await a.mouse.move(box.x+box.width/2,box.y+box.height/2);await a.mouse.down();await a.mouse.move(box.x+box.width/2+120,box.y+box.height/2,{steps:12});await a.mouse.up();
 await expect(card).toHaveCount(0);
 await b.getByRole('button',{name:'Нравится',exact:true}).click();await expect(b.getByRole('dialog',{name:'Взаимная симпатия!'})).toBeVisible();
 await b.getByRole('button',{name:'Перейти в чаты',exact:true}).click();await b.locator('.chat-row').filter({hasText:'Тест Алекс'}).click();
 await b.getByRole('textbox',{name:'Сообщение…',exact:true}).fill('Привет из тестового чата');await b.getByRole('button',{name:'Отправить',exact:true}).click();
 await expect(b.locator('.bubble')).toContainText('Привет из тестового чата');
 await a.getByRole('button',{name:'Чаты',exact:true}).click();await a.locator('.chat-row').filter({hasText:'Тест Анна'}).click();
 await expect(a.locator('.bubble')).toContainText('Привет из тестового чата');
 for(const page of [a,b]){await page.locator('.chat-header').getByRole('button',{name:'Настройки',exact:true}).click();await page.getByRole('button',{name:'Обменяться Telegram',exact:true}).click();}
 await expect(b.locator('.exchange-link')).toHaveAttribute('href','https://t.me/tester101');await expect(a.locator('.exchange-link')).toHaveAttribute('href','https://t.me/tester102');
 const notice=a.locator('.toast');if(await notice.count())await notice.getByRole('button',{name:'Close',exact:true}).click();
 await a.screenshot({path:testInfo.outputPath('chat-mobile.png'),fullPage:true});
 await owner.getByRole('button',{name:'Пользователи',exact:true}).click();await owner.getByPlaceholder('ID, username или имя').fill('101');
 await expect(owner.locator('.table-wrap tbody tr')).toHaveCount(1);const userRow=owner.getByRole('row').filter({has:owner.getByRole('cell',{name:'101',exact:true})});
 await userRow.getByRole('button',{name:'Открыть',exact:true}).click();await expect(owner.getByRole('dialog')).toContainText('Тест Анна');
 const downloaded=owner.waitForEvent('download');await owner.getByRole('button',{name:'Скачать анкету, фото и чаты',exact:true}).click();
 expect((await downloaded).suggestedFilename()).toBe('veyra-user-101.zip');
 await owner.screenshot({path:testInfo.outputPath('admin-user.png'),fullPage:true});
 await a.close();await b.close();await owner.close();
});
