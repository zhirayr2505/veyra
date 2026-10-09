import {test,expect} from '@playwright/test';
import {initData} from '../helpers.js';
async function login(page,id){
 await page.route('https://telegram.org/**',r=>r.fulfill({body:''}));
 await page.addInitScript(data=>{
  window.Telegram={WebApp:{initData:data,initDataUnsafe:{user:{language_code:'ru'}},ready(){},expand(){},setHeaderColor(){},setBackgroundColor(){}}};
 },initData(id));
 await page.goto('/');
}
test('Gifts: chat sends a real gift and recipient sees it in collection',async({browser})=>{
 const a=await browser.newPage({viewport:{width:390,height:844}});
 const b=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];a.on('pageerror',err=>errors.push(err.message));b.on('pageerror',err=>errors.push(err.message));
 try{
  await login(a,401);
  await login(b,402);
  await a.getByRole('button',{name:'Чаты',exact:true}).click();
  await a.locator('.chat-row').first().click();
  await expect(a.locator('.mc-bubble').first()).toBeVisible();
  await a.getByRole('button',{name:'Настройки',exact:true}).click();
  await a.getByRole('button',{name:'Подарить подарок',exact:true}).click();
  const picker=a.getByRole('dialog',{name:'Подарить подарок'});
  await expect(picker).toBeVisible();
  await expect(picker.locator('.vg-choice')).toHaveCount(37);
  await picker.getByPlaceholder('Пусть этот день станет особенным…').fill('Цвети, VEYRA!');
  await picker.getByRole('button',{name:'Подарить бесплатно'}).click();
  await expect(picker.getByText('Подарок отправлен!')).toBeVisible({timeout:10000});
  await picker.getByRole('button',{name:'Готово'}).click();
  await b.getByRole('button',{name:'Профиль',exact:true}).click();
  await b.getByRole('tab',{name:'Коллекция подарков'}).click();
  await expect(b.locator('.vg-collected').filter({hasText:'Искорка'})).toBeVisible({timeout:10000});
  await expect(b.locator('.vg-collected').filter({hasText:'Цвети, VEYRA!'})).toBeVisible();
  expect(errors).toEqual([]);
 }finally{await a.close();await b.close();}
});
