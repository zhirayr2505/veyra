import {test,expect} from '@playwright/test';
import {initData} from '../helpers.js';

test('premium visual system: real flows, mobile layouts, chat and account pages',async({page,browser},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://telegram.org/**',r=>r.fulfill({body:''}));
 await page.addInitScript(data=>{window.Telegram={WebApp:{initData:data,initDataUnsafe:{user:{language_code:'ru'}},ready(){},expand(){},setHeaderColor(){},setBackgroundColor(){}}};const original=document.startViewTransition?.bind(document);if(original){window.__veyraViewTransitions=0;document.startViewTransition=callback=>{window.__veyraViewTransitions++;return original(callback);};}},initData(10));
 const button=name=>page.getByRole('button',{name,exact:true});
 const orphanBraces=()=>page.evaluate(()=>{
  const found=[],walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const node=walker.currentNode;
   if(node.textContent.trim()!=='}')continue;
   const parent=node.parentElement;
   if(!parent||!parent.getClientRects().length)continue;
   const style=getComputedStyle(parent);
   if(style.display!=='none'&&style.visibility!=='hidden')found.push(parent.tagName.toLowerCase()+'.'+parent.className);
  }
  return found;
 });
 const tab=async name=>{await page.locator('.bottom-nav').getByRole('button',{name,exact:true}).click();await expect.poll(orphanBraces).toEqual([]);};
 const back=()=>button('Назад').click();
 const fits=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const capture=async name=>{await page.waitForTimeout(180);await page.screenshot({path:info.outputPath(name+'.png')});};
 await page.goto('/');await expect(page.locator('.dating-card .cover.is-loaded')).toBeVisible();
 await page.getByRole('banner').getByRole('button',{name:'Уведомления'}).click();
 const notice=page.getByRole('dialog',{name:'Уведомления'});
 await expect(notice).toBeVisible();
 await expect(notice.getByRole('button',{name:/Симпатии/})).toBeVisible();
 await expect(notice.getByRole('button',{name:/Сообщения/})).toBeVisible();
 await expect(notice.getByRole('button',{name:/Настройки уведомлений/})).toBeVisible();
 await notice.getByRole('button',{name:'Close'}).click();
 await expect(notice).toHaveCount(0);
 await expect.poll(orphanBraces).toEqual([]);await capture('design-feed');
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:560,height:844}]){
  await page.setViewportSize(viewport);await fits();await expect(page.locator('.reaction-bar')).toBeInViewport({ratio:1});await expect(page.locator('.bottom-nav')).toBeInViewport({ratio:1});
  const [actions,nav]=await Promise.all([page.locator('.reaction-bar').boundingBox(),page.locator('.bottom-nav').boundingBox()]);expect(actions.y+actions.height).toBeLessThanOrEqual(nav.y);
 }
 await page.setViewportSize({width:390,height:844});await page.getByRole('banner').getByRole('button',{name:'Фильтры',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Найди тех');await button('Close').click();
 await button('Пожаловаться').click();await page.getByRole('radio',{name:'Спам',exact:true}).click();await expect(page.getByRole('radio',{name:'Спам',exact:true})).toHaveAttribute('aria-checked','true');await button('Заблокировать').click();await expect(page.getByRole('dialog')).toContainText('закрыть чат');await button('Close').click();
 await expect(page.locator('.bottom-nav button')).toHaveCount(4);
 await expect(page.locator('.discovery-modes button')).toHaveCount(3);
 await expect(page.locator('.topbar .brand-wordmark-img')).toBeVisible();
 await page.locator('.discovery-modes button').filter({hasText:'Nearby'}).click();
 await expect(page.locator('.discovery-modes .active')).toContainText('Nearby');
 await page.locator('.discovery-modes button').filter({hasText:'For you'}).click();
 await expect(page.locator('.discovery-modes .active')).toContainText('For you');
 await page.locator('.discovery-modes button').filter({hasText:'Discover'}).click();
 // Returning to a mounted tab preserves app state without recreating its content.
 await expect(page.locator('.veyra-tab-deck')).toHaveCSS('animation-name','none');
 expect(await page.evaluate(()=>window.__veyraViewTransitions||0)).toBe(0);
 await expect(page.locator('.bottom-nav .selected')).toHaveCount(1);
 await expect(page.locator('.photo-counter')).toHaveCount(0);
 await capture('design-discover');
 await tab('Лайки');await expect(page.locator('.like-tile').first()).toBeVisible();await fits();await page.locator('.like-tile').first().click();await expect(page.getByRole('dialog',{name:'Профиль пользователя'})).toBeVisible();await page.locator('.member-profile-back').click();
 await tab('Чаты');await expect(page.locator('.chat-row')).toBeVisible();await page.getByRole('textbox',{name:'Поиск по чатам…'}).fill('Несуществующий');
 // Returning to Chats must preserve the text and the mounted DOM.
 await tab('Профиль');await tab('Чаты');
 await expect(page.getByRole('textbox',{name:'Поиск по чатам…'})).toHaveValue('Несуществующий');
 await expect(page.locator('.empty')).toContainText('Ничего не найдено');await button('Очистить поиск').click();await page.locator('.chat-row').click();await expect(page.locator('.mc-bubble')).toBeVisible();
 await page.getByRole('textbox',{name:'Сообщение…'}).fill('Кофе в субботу? Было бы здорово.');await button('Отправить').click();await expect(page.locator('.mc-body').filter({hasText:'Кофе в субботу?'})).toBeVisible();
 await button('Эмодзи').click();await button('Стикеры').click();await button('Кофе вдвоём').click();await page.locator('.mm-sticker-grid button').first().click();await expect(page.locator('.mm-sticker-preview')).toBeInViewport();await button('Отправить стикер').click();await expect(page.locator('.kind-sticker')).toBeVisible();
 await button('Прикрепить').click();await expect(page.getByRole('dialog')).toContainText('Фото из галереи');await button('Close').click();
 await expect(button('Записать голосовое')).toHaveCount(0);
 await capture('design-chat');
 for(const viewport of [{width:320,height:568},{width:390,height:440}]){await page.setViewportSize(viewport);await expect(page.locator('.mc-composer')).toBeInViewport({ratio:1});await fits();}
 await page.setViewportSize({width:390,height:844});await back();await tab('Профиль');await expect(page.locator('.vp-cover img.is-loaded')).toBeVisible();await capture('design-profile');
 await page.locator('.vp-photo-strip button').nth(1).click();await expect(page.locator('.vp-photo-strip button').nth(1)).toHaveAttribute('aria-pressed','true');await page.locator('.vp-edit').click();await expect(page.getByRole('heading',{name:'Редактировать',exact:true})).toBeVisible();await back();
 await page.locator('.vp-premium').click();await expect(page.locator('.product').first()).toBeVisible();await page.setViewportSize({width:320,height:568});await fits();await expect(page.getByRole('group',{name:'Категория покупки'})).toBeVisible();await page.setViewportSize({width:390,height:844});await capture('design-premium');await page.locator('.product').last().click();await expect(page.locator('.product').last()).toHaveAttribute('aria-checked','true');await back();
 await page.locator('.vp-links .vp-row').first().click();await expect(page.getByRole('textbox',{name:'Referral link'})).toContainClass('referral-url');await fits();await back();
 await page.locator('.vp-links .vp-row').last().click();await page.getByRole('textbox',{name:'Опиши вопрос'}).fill('Проверка интерфейса в изолированном окружении');await button('Отправить').click();await expect(page.locator('.ticket')).toContainText('Проверка интерфейса');await back();
 await page.locator('.vp-controls .vp-row').click();await expect(page.locator('.account-panel').first()).toBeVisible();await expect(page.getByRole('heading',{name:'Версия и состояние приложения'})).toBeVisible();await expect(page.locator('.veyra-runtime-panel').getByRole('status')).toContainText('Сервер отвечает');await page.getByRole('button',{name:'Проверить снова'}).click();await expect(page.locator('.veyra-runtime-panel').getByRole('status')).toContainText('Сервер отвечает');await page.setViewportSize({width:320,height:568});await fits();await page.setViewportSize({width:390,height:844});await capture('design-settings');await button('Удалить аккаунт').click();await expect(page.getByRole('dialog')).toContainText('нельзя отменить');await button('Оставить аккаунт').click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('combobox',{name:'Язык'}).selectOption('en');await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible();await page.getByRole('combobox',{name:'Language'}).selectOption('ru');await button('Сохранить').click();await expect(page.locator('.toast[role="status"]')).toContainText('Сохранено');await back();
 for(const width of [320,560]){await page.setViewportSize({width,height:844});for(const name of ['Discover','Лайки','Чаты','Профиль']){await tab(name);await fits();await expect(page.locator('.bottom-nav')).toBeInViewport({ratio:1});}}
 await page.emulateMedia({reducedMotion:'reduce'});await tab('Чаты');await expect(page.locator('.veyra-tab-pane.is-current')).toHaveCSS('animation-name','none');
 // A second account in the same browser checks the actual locked-likes response.
 const locked=await browser.newPage({viewport:{width:390,height:844}});locked.on('pageerror',e=>errors.push(e.message));await locked.route('https://telegram.org/**',r=>r.fulfill({body:''}));await locked.addInitScript(data=>{window.Telegram={WebApp:{initData:data,initDataUnsafe:{user:{language_code:'ru'}},ready(){},expand(){},setHeaderColor(){},setBackgroundColor(){}}};},initData(30));await locked.goto('/');await locked.getByRole('button',{name:'Лайки',exact:true}).click();await expect(locked.locator('.likes-paywall')).toBeVisible();await locked.screenshot({path:info.outputPath('design-likes.png')});await locked.setViewportSize({width:320,height:568});expect(await locked.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await locked.close();
 expect(errors).toEqual([]);
});
