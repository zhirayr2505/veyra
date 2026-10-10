import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {initData,env} from '../helpers.js';
async function login(page,id=10){
 await page.route('https://telegram.org/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
 await page.addInitScript(data=>{window.Telegram={WebApp:{initData:data,initDataUnsafe:{user:{language_code:'ru'}},ready(){},expand(){},setHeaderColor(){},setBackgroundColor(){},openInvoice(){},BackButton:{onClick(){},offClick(){},show(){},hide(){}}}}},initData(id,env.USER_BOT_TOKEN));
}
async function capture(page,label){
 const screenshot=await page.screenshot({path:'test-results/veyra-visual/'+label+'.png',fullPage:true});
 // Small synthetic-fixture-only thumbnail lets maintainers inspect the CI-rendered interface.
 if(['01-feed','02-member','04-chats','05-conversation','06-own-profile'].includes(label)){
  const jpg=await sharp(screenshot).resize({width:320}).jpeg({quality:39}).toBuffer();
  console.log('VEYRA_VISUAL_'+label+'='+jpg.toString('base64'));
 }
}
test('Mobile design audit: capture all primary V5 screens and verify brand icon loading',async({page})=>{
 await login(page);
 await mkdir('test-results/veyra-visual',{recursive:true});
 const broken=[];const crashes=[];
 page.on('pageerror',e=>crashes.push(e.message));
 page.on('response',r=>{if(r.status()===404&&r.url().includes('/assets/veyra/'))broken.push(r.url())});
 await page.goto('/');
 await expect(page.locator('.feed-photo')).toBeVisible();
 await page.waitForFunction(()=>[...document.querySelectorAll('img.kit-icon')].every(x=>x.complete&&x.naturalWidth>0));
 await capture(page,'01-feed');
 await page.locator('.feed-photo .hero-name').click();
 await expect(page.locator('.member')).toBeVisible();
 await capture(page,'02-member');
 await page.locator('.member .back').click();
 await page.locator('.bottom-nav').getByRole('button',{name:'симпатии'}).click();
 await expect(page.locator('.likes')).toBeVisible();
 await capture(page,'03-likes');
 await page.locator('.bottom-nav').getByRole('button',{name:'чаты'}).click();
 await expect(page.locator('.chat-tile').first()).toBeVisible();
 await capture(page,'04-chats');
 await page.locator('.chat-tile').first().click();
 await expect(page.locator('.conversation')).toBeVisible();
 await capture(page,'05-conversation');
 await page.locator('.conversation-head').getByRole('button',{name:'Назад'}).click();
 await page.locator('.bottom-nav').getByRole('button',{name:'профиль'}).click();
 await expect(page.locator('.own-profile')).toBeVisible();
 await capture(page,'06-own-profile');
 await page.locator('.own-shortcuts').getByRole('button',{name:'настройки'}).click();
 await expect(page.getByRole('dialog',{name:'настройки'})).toBeVisible();
 await capture(page,'07-settings');
 expect(broken).toEqual([]);expect(crashes).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
