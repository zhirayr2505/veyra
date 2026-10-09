import {test,expect} from '@playwright/test';
import {initData,env} from '../helpers.js';
test('owner operations: real metrics, records, XLSX, content and broadcast drafts',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://telegram.org/**',r=>r.fulfill({body:''}));
 await page.addInitScript(data=>{window.Telegram={WebApp:{initData:data,initDataUnsafe:{user:{language_code:'ru'}},ready(){},expand(){},setHeaderColor(){},setBackgroundColor(){}}};},initData(1,env.ADMIN_BOT_TOKEN));
 await page.goto('/admin');await page.getByRole('button',{name:'Управление и аналитика',exact:true}).click();
 await expect(page.locator('.ops-metrics article')).toHaveCount(10);await expect(page.locator('.ops-chart>div')).toHaveCount(7);
 const section=name=>page.locator('.ops-sidebar').getByRole('button',{name,exact:true}).click();
 await section('Пользователи');await page.getByRole('textbox',{name:'Поиск записей'}).fill('tester1');await page.getByRole('button',{name:'Найти',exact:true}).click();await expect(page.locator('.ops-table tbody tr').first()).toContainText('tester1');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'XLSX',exact:true}).click();expect((await download).suggestedFilename()).toBe('veyra-users.xlsx');
 await section('Контент');await page.getByLabel('Заголовок',{exact:true}).fill('Тестовая идея');await page.getByLabel('Текст',{exact:true}).fill('Карточка создана в изолированной браузерной проверке.');await page.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(page.locator('.ops-products')).toContainText('Тестовая идея');
 await section('Рассылки');await page.getByRole('textbox',{name:'Текст рассылки'}).fill('Только черновик: тестовое окружение');await page.getByRole('button',{name:'Сохранить черновик'}).click();await expect(page.locator('.ops-table')).toContainText('Только черновик');await page.getByRole('button',{name:'Отправить',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Сообщения уйдут через Telegram Bot');await page.getByRole('button',{name:'Отмена',exact:true}).click();
 for(const name of ['Мэтчи','Чаты','Платежи','Подписки','Boost','Рефералы','Жалобы','Поддержка','Тарифы','Администраторы','Аудит','Состояние системы']){await section(name);await expect(page.locator('.ops-main h1')).toHaveText(name);await expect(page.locator('.ops-main .skeleton')).toHaveCount(0);await expect(page.locator('.ops-main')).not.toContainText('Не удалось загрузить');}
 await section('Обзор');await page.setViewportSize({width:1280,height:900});await expect(page.locator('.ops-metrics')).toBeVisible();await page.screenshot({path:info.outputPath('operations-desktop.png')});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('operations-mobile.png')});expect(errors).toEqual([]);
});
