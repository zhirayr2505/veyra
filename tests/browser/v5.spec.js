import {test,expect} from '@playwright/test';
import {initData,env} from '../helpers.js';
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
 await page.getByRole('button',{name:'Отправить'}).click();
 await expect(page.locator('.bubble.mine').filter({hasText:msg})).toBeVisible();
});
test('V5 new adult starts welcome and underage is blocked client-side',async({page})=>{
 await telegram(page,20);await page.goto('/');
 await expect(page.getByRole('heading',{name:/знакомства/})).toBeVisible();
 await page.getByRole('button',{name:'начать знакомиться'}).click();
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
