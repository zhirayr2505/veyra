import {test,expect} from '@playwright/test';
import {initData,env} from '../helpers.js';
import sharp from 'sharp';
async function telegram(page,id,admin=false,fullscreen=false){
 await page.route('https://telegram.org/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
 await page.addInitScript(({data,fullscreen})=>{window.Telegram={WebApp:{initData:data,initDataUnsafe:{user:{language_code:'ru'}},isFullscreen:fullscreen,
  safeAreaInset:{top:0,bottom:0},contentSafeAreaInset:{top:0,bottom:0},
  ready(){},expand(){},setHeaderColor(){},setBackgroundColor(){},openInvoice(){}}};},
  {data:initData(id,admin?env.ADMIN_BOT_TOKEN:env.USER_BOT_TOKEN),fullscreen});
}
test('V5 signed Telegram startup, persistent tabs, and real discovery',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await telegram(page,10);await page.goto('/');
 await expect(page.locator('.feed-photo')).toBeVisible();
 await expect(page.locator('.bottom-nav button')).toHaveCount(5);
 await page.getByRole('button',{name:'Фильтры',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'фильтры'})).toBeVisible();
 await page.getByRole('button',{name:'Закрыть'}).click();
 await expect(page.locator('.feed-photo')).toBeVisible();
 await page.locator('.bottom-nav').getByRole('button',{name:'чаты'}).click();
 await expect(page.locator('.chat-tile').first()).toBeVisible();
 await page.locator('.bottom-nav').getByRole('button',{name:'знакомства'}).click();
 await expect(page.locator('.feed-photo')).toBeVisible();
 expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('V5 real match chat opens, sends and persists messages',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await page.locator('.bottom-nav').getByRole('button',{name:'чаты'}).click();
 await expect(page.locator('.ve-chat-tabs [role=tab]')).toHaveCount(2);
 await page.locator('.ve-pin-button').first().click();
 await expect(page.locator('.ve-chat-tile.ve-pinned').first()).toBeVisible();
 await page.locator('.ve-pin-button.is-pinned').first().click();
 await page.locator('.chat-tile').first().click();
 await expect(page.locator('.conversation')).toBeVisible();
 await expect(page.locator('.bubble').first()).toBeVisible();
 const msg='Привет VEYRA '+Date.now();
 await page.getByRole('textbox',{name:'Сообщение'}).fill(msg);
 await page.getByRole('button',{name:'Отправить',exact:true}).click();
 await expect(page.locator('.bubble.mine').filter({hasText:msg})).toBeVisible();
});
test('New VEYRA seven-stage registration rejects an underage date',async({page})=>{
 await telegram(page,20);await page.goto('/');
 await expect(page.getByRole('heading',{name:'Как вас зовут?'})).toBeVisible();
 await page.getByRole('textbox',{name:'Ваше имя'}).fill('Test Adult');
 await page.locator('.registration-consent input').check();
 await page.getByRole('button',{name:'Указать возраст'}).click();
 await expect(page.getByRole('heading',{name:'Когда ваш день рождения?'})).toBeVisible();
 await page.getByLabel('День рождения').fill('01');
  await page.getByLabel('Месяц рождения').fill('01');
  await page.getByLabel('Год рождения').fill('2017');
 await page.getByRole('button',{name:'мужчина'}).click();
 await page.getByRole('button',{name:'Выбрать город'}).click();
 await expect(page.getByRole('alert')).toContainText('18');
});

test('VEYRA legal documents accept consent and support a public legal page',async({page})=>{
 await telegram(page,26);await page.goto('/');
 await expect(page.locator('.registration-consent input')).not.toBeChecked();
 await page.getByRole('button',{name:'Условия использования'}).click();
 const dialog=page.getByRole('dialog',{name:'Правила и конфиденциальность VEYRA'});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('heading',{name:'Условия использования'})).toBeVisible();
 await dialog.getByRole('tab',{name:'Конфиденциальность'}).click();
 await expect(dialog.getByRole('heading',{name:'Политика конфиденциальности'})).toBeVisible();
 await dialog.getByRole('button',{name:'Принять условия и политику'}).click();
 await expect(dialog).toHaveCount(0);
 await expect(page.locator('.registration-consent input')).toBeChecked();
 await page.goto('/legal');
 await expect(page.getByRole('heading',{name:'Документы VEYRA'})).toBeVisible();
});

test('VEYRA pending approval displays animated crystal, genuine status and close action',async({page})=>{
 await telegram(page,10);
 await page.route('**/api/me',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({user:{id:'10'},profile:{moderation:'pending'},photos:[],registration:null,veys_balance:0})
 }));
 await page.goto('/');
 const screen=page.locator('.vc-screen--pending');
 await expect(screen).toBeVisible();
 await expect(screen.getByRole('heading',{name:'Анкета отправлена'})).toBeVisible();
 await expect(screen.getByRole('status')).toContainText('На модерации');
 await expect(screen.locator('.vc-review-vector path')).toHaveCount(2);
 await expect(screen.locator('.vc-real-review')).toHaveCount(0);
 await expect(screen.getByRole('button',{name:'Закрыть приложение'})).toBeVisible();
 await expect(screen.getByRole('button',{name:'Изменить анкету'})).toBeVisible();
 await screen.getByRole('button',{name:'Посмотреть профиль'}).click();
 await expect(page.getByRole('tab',{name:'В ленте'})).toHaveAttribute('aria-selected','true');
 await page.getByRole('tab',{name:'Полный профиль'}).click();
 await expect(page.getByRole('heading',{name:'Твой полный профиль'})).toBeVisible();
 await page.getByRole('button',{name:'Назад',exact:true}).last().click();
 await expect(screen).toBeVisible();
 await screen.getByRole('button',{name:'Обновить статус'}).click();
 await expect(screen.getByRole('status')).toContainText('На модерации');
});

test('VEYRA scheduled deletion shows in-app consent without deleting immediately',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await page.locator('.bottom-nav').getByRole('button',{name:'профиль'}).click();
 await page.getByRole('tab',{name:'Ещё'}).click();
 await page.locator('.own-shortcuts').getByRole('button',{name:'настройки'}).click();
 await page.getByRole('button',{name:'удалить аккаунт'}).click();
 const dialog=page.getByRole('dialog',{name:'Удаление аккаунта VEYRA'});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Удалить мой аккаунт'})).toBeDisabled();
 await dialog.getByRole('checkbox').check();
 await expect(dialog.getByRole('button',{name:'Удалить мой аккаунт'})).toBeEnabled();
 await dialog.getByRole('button',{name:'Остаться в VEYRA'}).click();
 await expect(dialog).toHaveCount(0);
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
 await page.getByRole('button',{name:'Вложения'}).click();
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
 await page.locator('.vx-member-native-header .vx-member-fallback-back').click();
 await expect(page.locator('.conversation')).toBeVisible();
});

test('V5 support requests use the real authenticated ticket API',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await page.locator('.bottom-nav').getByRole('button',{name:'профиль'}).click();
 await page.getByRole('tab',{name:'Ещё'}).click();
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

test('VEYRA eight-step onboarding verifies location, bio and 3-7 reordered photos',async({page})=>{
 await telegram(page,22);await page.goto('/');
 await expect(page.getByRole('heading',{name:'Как вас зовут?'})).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Ваше имя'})).toHaveValue('Tester');
 await page.getByRole('textbox',{name:'Ваше имя'}).fill('Seven Photos Test!123');
 await expect(page.getByRole('textbox',{name:'Ваше имя'})).toHaveValue('Seven Photos Test');
 await expect(page.locator('.name-feedback')).toBeVisible();
 await page.locator('.registration-consent input').check();
 await page.getByRole('button',{name:'Указать возраст'}).click();
 await expect(page.getByRole('heading',{name:'Когда ваш день рождения?'})).toBeVisible();
 await expect(page.locator('.gender-choice .veyra-brand-glyph')).toHaveCount(2);
 await page.getByLabel('День рождения').fill('12');
  await page.getByLabel('Месяц рождения').fill('05');
  await page.getByLabel('Год рождения').fill('1998');
 await page.getByRole('button',{name:'мужчина'}).click();
 await page.getByRole('button',{name:'Выбрать город'}).click();
 await expect(page.getByRole('heading',{name:'Разрешите доступ к геолокации'})).toBeVisible();
 await expect(page.locator('.registration-step.forward')).toBeVisible();
 await page.getByRole('textbox',{name:'Поиск города'}).fill('Par');
 await expect(page.locator('.city-results button').first()).toBeVisible();
 await page.locator('.city-results button').first().click();
 await expect(page.locator('.location-card')).toContainText('Paris');
  expect((await page.locator('.location-card').boundingBox()).height).toBeLessThan(130);
  await expect(page.locator('.vy-range input[type=range]')).toHaveCount(1);
 await expect(page.locator('.distance-control .range-ends')).toContainText('1000 км');
 await expect(page.locator('.distance-control .range-ends')).toContainText('1 км');
 await page.getByRole('button',{name:'Настроить поиск'}).click();
 await expect(page.getByRole('heading',{name:'Кого вы ищете?'})).toBeVisible();
 await expect(page.locator('.vy-range-dual input[type=range]')).toHaveCount(2);
 await expect(page.locator('.looking-choice .veyra-brand-glyph')).toHaveCount(3);
 await page.getByRole('button',{name:'Выбрать цель знакомства'}).click();
 await page.locator('.veyra-goal-choice').nth(1).click();
 await page.getByRole('button',{name:'Выбрать интересы'}).click();
 await expect(page.getByRole('heading',{name:'Ваши интересы'})).toBeVisible();
 await page.locator('.veyra-interest-options button').first().click();
 await page.locator('.veyra-interest-options button').nth(1).click();
 // Fill all twelve selections to verify the overflow badge stays inside the feed photo.
 const chosen=page.locator('.veyra-interests-selected-grid button');
 for(let group=0;group<14&&await chosen.count()<12;group++){
  if(group>0)await page.locator('.veyra-interest-accordion-trigger').nth(group).click();
  const remaining=page.locator('.veyra-interest-accordion-item.expanded .veyra-interest-options button:not(.selected)');
  while(await chosen.count()<12&&await remaining.count()>0)await remaining.first().click();
 }
 await expect(chosen).toHaveCount(12);
 await page.getByRole('button',{name:'Рассказать о себе'}).click();
 await expect(page.getByRole('heading',{name:'Немного о себе'})).toBeVisible();
 await page.getByRole('textbox',{name:'О себе'}).fill('Люблю музыку 🎵 и путешествия');
 await expect(page.getByRole('button',{name:'Добавить эмодзи'})).toBeVisible();
 await page.getByRole('button',{name:'Добавить фото'}).click();
 await expect(page.getByRole('heading',{name:'Добавьте свои фото'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Добавить ещё 3 фото'})).toBeEnabled();
 await expect(page.locator('.photo-slot')).toHaveCount(1);
 await expect(page.locator('.photo-slot-add')).toHaveCount(1);
 await expect(page.locator('.photo-slot.primary')).toHaveCount(1);
 const png=await sharp({create:{width:120,height:120,channels:3,background:{r:238,g:131,b:155}}}).png().toBuffer();
 const files=Array.from({length:8},(_,i)=>({name:'test'+i+'.png',mimeType:'image/png',buffer:png}));
 await page.locator('input[type=file]').setInputFiles(files);
 await expect(page.locator('.registration-toast')).toContainText('максимум 7 фото');
 await expect(page.locator('.registration-photo-count')).toContainText('7 из 7',{timeout:45000});
 await expect(page.locator('.photo-make-main')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Посмотреть анкету'})).toBeEnabled();
 await expect(page.locator('.photo-slot .photo-box')).toHaveCount(7);
 await expect(page.locator('.photo-slot-add')).toHaveCount(0);
 const dragged=page.locator('.photo-slot').nth(1),drop=page.locator('.photo-slot').nth(3);
 const firstRect=await dragged.boundingBox(),targetRect=await drop.boundingBox();
 await page.mouse.move(firstRect.x+firstRect.width/2,firstRect.y+firstRect.height/2);
 await page.mouse.down();await page.waitForTimeout(430);
 await expect(page.locator('.photo-drag-ghost')).toBeVisible();
 await page.mouse.move(targetRect.x+targetRect.width/2,targetRect.y+targetRect.height/2,{steps:8});
 await page.mouse.up();
 await expect(page.locator('.photo-drag-ghost')).toHaveCount(0);
 await page.getByRole('button',{name:'Посмотреть анкету'}).click();
 await expect(page.locator('.preview-gallery .veyra-card-shade')).toHaveCount(1);
 await expect(page.locator('.preview-gallery > .veyra-card-top-goal')).toContainText('Свидания');
  await expect(page.locator('.preview-card-caption .veyra-card-goal-badge')).toHaveCount(0);
 await expect(page.locator('.preview-card-caption .veyra-card-bio')).toContainText('Люблю музыку');
 await expect(page.locator('.preview-card-caption .veyra-card-interest-divider')).toHaveCount(0);
 await expect(page.locator('.preview-gallery-slide')).toHaveCount(3);
 await expect(page.locator('.preview-dots button')).toHaveCount(7);
 await expect(page.locator('.preview-card-chips .veyra-interest-inline-chip')).toHaveCount(2);
  await expect(page.locator('.preview-card-chips .veyra-interest-more')).toContainText('+10 ещё');
  const fits=await page.locator('.preview-card-chips .veyra-interest-more').evaluate(el=>{
   const a=el.getBoundingClientRect(),frame=el.closest('.preview-gallery').getBoundingClientRect();
   return a.left>=frame.left&&a.right<=frame.right&&a.top>=frame.top&&a.bottom<=frame.bottom;
  });
  expect(fits).toBe(true);
 await expect(page.locator('.preview-gallery-slide').nth(1).locator('img')).toBeVisible({timeout:30000});
 await expect.poll(async()=>page.locator('.preview-gallery-slide').nth(1).locator('img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 const gallery=await page.locator('.preview-gallery').boundingBox();
 const middleSlide=await page.locator('.preview-gallery-slide').nth(1).boundingBox();
 expect(Math.abs(gallery.x-middleSlide.x)).toBeLessThan(8);
 expect(middleSlide.width).toBeGreaterThan(240);
 const primaryCta=await page.getByRole('button',{name:/отправить на проверку/i}).boundingBox();
 expect(gallery.y+gallery.height).toBeLessThan(primaryCta.y+1);
 await expect(page.locator('.preview-gallery')).toHaveCount(1);
 await expect(page.locator('.preview-card-caption')).toContainText('Seven Photos Test');
 // Switching between feed and full-profile must not retain a previous scroll.
 await page.getByRole('tab',{name:'Полный профиль'}).click();
 await expect(page.locator('.vp-member-detail .member-summary-title')).toContainText('Seven Photos Test');
 await expect(page.locator('.vp-member-detail .veyra-detail-card')).toContainText('Свидания');
 await expect(page.locator('.mode-detail .preview-gallery .veyra-card-caption')).toHaveCount(0);
 await expect(page.locator('.vp-member-detail .vp-thumbnails button')).toHaveCount(7);
 const fullScroll=page.locator('.vp-scroll');
 await fullScroll.evaluate(el=>{el.scrollTop=300});
 await page.getByRole('tab',{name:'В ленте'}).click();
 await page.getByRole('tab',{name:'Полный профиль'}).click();
 await expect.poll(()=>fullScroll.evaluate(el=>el.scrollTop)).toBe(0);
 await page.getByRole('button',{name:'редактировать'}).click();
 await expect(page.locator('.photo-slot')).toHaveCount(7);
});

test('New server account reset ignores stale cached registration steps',async({page})=>{
 await telegram(page,23);
 await page.addInitScript(()=>{localStorage.setItem('veyra.registration.v5.23',JSON.stringify({step:5,data:{name:'OLD CACHED NAME',city:'OLD CACHED CITY'}}))});
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Как вас зовут?'})).toBeVisible();
 await expect(page.locator('input[placeholder="Как вас зовут?"]')).toHaveValue('Tester');
});

test('New registration has a pinned CTA and working location edit + interests',async({page})=>{
 await telegram(page,24);await page.goto('/');
 await expect(page.locator('.registration-actions')).toBeVisible();
 await expect(page.locator('.registration-actions .veyra-smart-next')).toContainText('Указать возраст');
 await expect(page.locator('.registration-actions .veyra-smart-next-arrow')).toHaveCount(1);
 const gradient=await page.locator('.registration-actions .veyra-smart-next').evaluate(el=>getComputedStyle(el).backgroundImage);
 expect(gradient).toContain('linear-gradient');
 const box=await page.locator('.registration-actions').boundingBox();
 expect(Math.abs((box.y+box.height)-page.viewportSize().height)).toBeLessThan(3);
 await page.getByRole('textbox',{name:'Ваше имя'}).fill('Мария💗123');
 await expect(page.getByRole('textbox',{name:'Ваше имя'})).toHaveValue('Мария');
 await page.locator('.registration-consent input').check();
 await page.getByRole('button',{name:'Указать возраст'}).click();
 await page.getByLabel('День рождения').fill('12');
  await page.getByLabel('Месяц рождения').fill('05');
  await page.getByLabel('Год рождения').fill('1998');
 await page.getByRole('button',{name:'женщина'}).click();
 await page.getByRole('button',{name:'Выбрать город'}).click();
 await page.getByRole('textbox',{name:'Поиск города'}).fill('Par');
 await page.locator('.city-results button').first().click();
 await expect(page.locator('.location-card')).toContainText('Paris');
 await page.getByRole('button',{name:'изменить город'}).click();
 await expect(page.locator('.city-search')).toBeVisible();
 await expect(page.getByRole('button',{name:'использовать моё местоположение'})).toBeVisible();
 await page.getByRole('button',{name:'Закрыть'}).click();
 await page.getByRole('button',{name:'Настроить поиск'}).click();
 await page.getByRole('button',{name:'Выбрать цель знакомства'}).click();
 await page.locator('.veyra-goal-choice').nth(1).click();
 await page.getByRole('button',{name:'Выбрать интересы'}).click();
 await expect(page.getByRole('heading',{name:'Ваши интересы'})).toBeVisible();
 await expect(page.locator('.veyra-interest-options button').first()).toBeVisible();
  await expect(page.locator('.veyra-interest-accordion-trigger')).toHaveCount(14);
  await expect(page.getByRole('textbox',{name:'Поиск интересов'})).toHaveCount(0);
  await expect(page.locator('.veyra-interests-selected-grid')).toHaveCount(0);
  await page.locator('.veyra-interest-options button').first().click();
  await expect(page.locator('.veyra-interests-selected-grid')).toBeVisible();
  const style=await page.locator('.veyra-interests-selected-grid').evaluate(el=>({flexWrap:getComputedStyle(el).flexWrap,overflowX:getComputedStyle(el).overflowX}));
  expect(style.flexWrap).toBe('nowrap');expect(style.overflowX).toBe('auto');
  await expect(page.locator('.veyra-interests-selected')).toBeVisible();
  await expect(page.locator('.veyra-picker-head span')).toHaveCount(0);
  await expect(page.locator('.veyra-interests-selected header small')).toContainText('1 из 12');
  const scroll=page.locator('.registration-step');
  await scroll.evaluate(el=>{el.scrollTop=500});
  const stickyPosition=await page.locator('.veyra-interests-selected').evaluate(el=>getComputedStyle(el).position);
  expect(stickyPosition).toBe('sticky');
  const offset=()=>page.evaluate(()=>{
   const shelf=document.querySelector('.veyra-interests-selected');
   const scroller=document.querySelector('.registration-step');
   return Math.round(shelf.getBoundingClientRect().top-scroller.getBoundingClientRect().top);
  });
  await expect.poll(offset).toBeGreaterThanOrEqual(-2);
  await expect.poll(offset).toBeLessThanOrEqual(25);
  await page.locator('.veyra-interest-accordion-trigger').nth(1).click();
  await expect(page.locator('.veyra-interest-accordion-item.expanded')).toHaveCount(1);
  await page.getByRole('button',{name:'Рассказать о себе'}).click();
  await expect(page.getByRole('textbox',{name:'О себе'})).toBeVisible();
  await expect(page.locator('.registration-actions .veyra-smart-next')).toContainText('Пропустить');
  await expect(page.locator('.registration-actions .veyra-smart-next-arrow')).toHaveCount(1);
  const bio=page.getByRole('textbox',{name:'О себе'});
  await expect(page.locator('.veyra-bio-emoji-panel')).toHaveCount(0);
  await page.getByRole('button',{name:'Добавить эмодзи'}).click();
  await expect(page.locator('.veyra-bio-emoji-rail')).toBeVisible();
  await expect(page.locator('.veyra-bio-emoji-rail button')).toHaveCount(24);
  const gridRows=await page.locator('.veyra-bio-emoji-rail').evaluate(el=>getComputedStyle(el).gridTemplateRows.trim().split(/\s+/).length);
  expect(gridRows).toBe(2);
  await page.getByRole('tab',{name:'Любовь'}).click();
  await page.getByRole('button',{name:'Вставить 💜'}).click();
  await expect(bio).toHaveValue('💜');
  await expect(page.locator('.registration-actions .veyra-smart-next')).toContainText('Добавить фото');
  await page.getByRole('button',{name:'Закрыть эмодзи'}).click();
  await bio.fill('😃'.repeat(260));
  expect([...await bio.inputValue()].length).toBe(250);
  await expect(page.locator('.veyra-bio-limit-bubble')).toContainText('Максимум 250 символов');
  await bio.fill('   ');
  await expect(page.locator('.registration-actions .veyra-smart-next')).toContainText('Пропустить');
  await page.getByRole('button',{name:'Пропустить'}).click();
  await expect(page.getByRole('heading',{name:'Добавьте свои фото'})).toBeVisible();
  await expect(page.locator('.photo-slot-add')).toHaveCount(1);
});

test('City set manually can be corrected via device location without a navigation',async({page,context})=>{
 await context.grantPermissions(['geolocation'],{origin:'http://127.0.0.1:3100'});
 await context.setGeolocation({latitude:45.035,longitude:38.975});
 await page.route('**/api/geo?lat=*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{city:'Краснодар',country:'Россия',lat:45.035,lon:38.975,label:'Краснодар, Россия'}])}));
 await telegram(page,25);await page.goto('/');
 await page.locator('.registration-consent input').check();
 await page.getByRole('button',{name:'Указать возраст'}).click();
 await page.getByLabel('День рождения').fill('12');
  await page.getByLabel('Месяц рождения').fill('05');
  await page.getByLabel('Год рождения').fill('1998');
 await page.getByRole('button',{name:'мужчина'}).click();
 await page.getByRole('button',{name:'Выбрать город'}).click();
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

test('V5 approved premium feed uses cyclic photo strips and opens the complete profile',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await expect(page.locator('.feed-photo')).toBeVisible();
 await expect(page.locator('.discover .photo-bars')).toBeVisible();
 await expect(page.locator('.discover .feed-action')).toHaveCount(4);
 const bars=page.locator('.discover .photo-bars button');
 const count=await bars.count();
 expect(count).toBeGreaterThan(0);
 const before=await page.locator('.feed-photo .hero-name').innerText();
 let reactionRequests=0;
 page.on('request',request=>{if(new URL(request.url()).pathname==='/api/reactions')reactionRequests++});
 await bars.last().click();
 const card=page.locator('.feed-photo');
 const box=await card.boundingBox();
 const y=box.y+box.height*.43,x=box.x+box.width*.52;
 await page.mouse.move(x,y);
 await page.mouse.down();
 await page.mouse.move(x-110,y,{steps:7});
 const during=await card.boundingBox();
 expect(Math.abs(during.x-box.x)).toBeLessThan(1);
 // Horizontal drag must not transform the card itself. The feed's
 // native scroller may settle a few pixels vertically during this gesture.
 const transform=await card.evaluate(el=>getComputedStyle(el).transform);
 expect(transform).toBe('none');
 expect(Math.abs(during.width-box.width)).toBeLessThan(1);
 expect(Math.abs(during.height-box.height)).toBeLessThan(1);
 await page.mouse.up();
 await expect(bars.first()).toHaveClass(/active/);
 await page.mouse.move(x,y);
 await page.mouse.down();
 await page.mouse.move(x+105,y,{steps:7});
 await page.mouse.up();
 await expect(bars.last()).toHaveClass(/active/);
 expect(reactionRequests).toBe(0);
 await expect(page.locator('.feed-photo .hero-name')).toHaveText(before);
 await page.locator('.feed-photo').click({position:{x:box.width*.8,y:box.height*.42}});
 await expect(page.locator('.member')).toHaveCount(0);
 await page.locator('.feed-photo .hero-name').click();
 await expect(page.locator('.member')).toBeVisible();
 await page.locator('.vx-member-native-header .vx-member-fallback-back').click();
 await expect(page.locator('.feed-photo')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('VEYRA screenshot filters preserve real feed API parameters',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await expect(page.locator('.feed-photo')).toBeVisible();
 const feedUrls=[];
 page.on('request',r=>{if(new URL(r.url()).pathname==='/api/feed')feedUrls.push(r.url())});
 await page.locator('.bottom-nav').getByRole('button',{name:'поиск'}).click();
 await page.getByRole('tab',{name:'Рядом'}).click();
 await expect(page.locator('.vx-nearby')).toBeVisible();
 await page.getByRole('button',{name:'Фильтры',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'фильтры'})).toBeVisible();
 await page.getByLabel('С общими интересами').check();
 await page.getByRole('button',{name:'Показать анкеты'}).click();
 await expect(page.getByRole('dialog',{name:'фильтры'})).toHaveCount(0);
 await expect.poll(()=>feedUrls.some(url=>url.includes('mode=nearby')&&url.includes('common_interests=true'))).toBe(true);
 expect(feedUrls.filter(url=>url.includes('mode=nearby')&&url.includes('common_interests=true'))).toHaveLength(1);
});


test('VEYRA next feed profile visibly enters after button reaction and undo restores prior card',async({page})=>{
 await telegram(page,10);await page.goto('/');
 const card=page.locator('.feed-photo');
 await expect(card).toBeVisible();
 const firstName=await card.locator('.hero-name').innerText();
 await page.evaluate(()=>{
  window.__veyraNewCardAnimation=false;
  const root=document.querySelector('.feed-content');
  const observer=new MutationObserver(()=>{
   const node=root.querySelector('.feed-photo.feed-motion-enter');
   if(node&&getComputedStyle(node).animationName.includes('veyraCardEnter'))window.__veyraNewCardAnimation=true;
  });
  observer.observe(root,{attributes:true,childList:true,subtree:true,attributeFilter:['class']});
  window.__veyraFeedObserver=observer;
 });
 await page.getByRole('button',{name:'Пропустить'}).click();
 await expect(card.locator('.hero-name')).not.toHaveText(firstName);
 expect(await page.evaluate(()=>window.__veyraNewCardAnimation)).toBe(true);
 await expect(page.getByRole('button',{name:'Отменить последнее действие'})).toBeEnabled();
 await page.getByRole('button',{name:'Отменить последнее действие'}).click();
 await expect(card.locator('.hero-name')).toContainText(firstName.split(',')[0]);
});


test('VEYRA V2 keeps search and encounter screens distinct and opens genuine member profiles',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await telegram(page,10);await page.goto('/');
 await expect(page.locator('.feed-photo')).toBeVisible();
 await page.locator('.bottom-nav').getByRole('button',{name:'поиск'}).click();
 const tabs=page.getByRole('tablist',{name:'Подборки людей'});
 await expect(tabs.getByRole('tab')).toHaveCount(2);
 await expect(page.locator('.bottom-nav button')).toHaveCount(5);
 await tabs.getByRole('tab',{name:'Для вас'}).click();
 await expect(page.locator('.vx-for_you .vx-people .vx-person').first()).toBeVisible();
 await expect(page.locator('.vx-collections .vx-collection').first()).toBeVisible();
 await expect(page.locator('.feed-photo')).toBeHidden();
 const collection=page.locator('.vx-collection').first();
 await collection.click();
 await expect(collection).toHaveClass(/chosen/);
 await page.locator('.vx-for_you .vx-person-open').first().click();
 await expect(page.getByRole('dialog',{name:/Предпросмотр анкеты/})).toBeVisible();
 await page.getByRole('button',{name:'посмотреть полный профиль'}).click();
 await expect(page.locator('.member')).toBeVisible();
 await page.locator('.vx-member-native-header .vx-member-fallback-back').click();
 await expect(page.locator('.vx-for_you .vx-people')).toBeVisible();
 await tabs.getByRole('tab',{name:'Рядом'}).click();
 await expect(page.locator('.vx-nearby .vx-people .vx-person').first()).toBeVisible();
 await expect(page.locator('.vx-nearby .vx-person-caption small').nth(1)).toContainText('км');
 await expect(page.locator('.feed-photo')).toBeHidden();
 await page.locator('.bottom-nav').getByRole('button',{name:'знакомства'}).click();
 await expect(page.locator('.feed-photo')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});

test('VEYRA Nearby displays city only, removes grid hearts, previews photos before full profile',async({page})=>{
 await telegram(page,10);await page.goto('/');
 const likes=[];
 page.on('request',request=>{if(new URL(request.url()).pathname==='/api/reactions'&&request.method()==='POST')likes.push(request.postDataJSON())});
 await page.locator('.bottom-nav').getByRole('button',{name:'поиск'}).click();
 await page.getByRole('tab',{name:'Рядом'}).click();
 await expect(page.locator('.vx-nearby .vx-person-open').first()).toBeVisible();
 await expect(page.locator('.vx-nearby .vx-person-like')).toHaveCount(0);
 const gridText=await page.locator('.vx-nearby .vx-person-caption').first().innerText();
 expect(gridText).not.toMatch(/, Россия|, Армения|, Германия/);
 await page.locator('.vx-nearby .vx-person-open').first().click();
 const preview=page.getByRole('dialog',{name:/Предпросмотр анкеты/});
 await expect(preview).toBeVisible();
 await expect(preview.getByRole('button',{name:'посмотреть полный профиль'})).toBeVisible();
 expect(likes).toHaveLength(0);
 await preview.getByRole('button',{name:'посмотреть полный профиль'}).click();
 await expect(page.locator('.member-feed-profile')).toBeVisible();
 await expect(page.locator('body > .vx-member-native-header .vx-member-floating-logo')).toBeVisible();
 await expect(page.locator('.member-feed-profile .top-header')).toHaveCount(0);
 await page.locator('.vx-member-native-header .vx-member-fallback-back').click();
 await expect(page.locator('.bottom-nav button')).toHaveCount(5);
});

test('VEYRA match celebration has two circular photos and preserves action buttons',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await expect(page.locator('.feed-photo')).toBeVisible();
 await page.route('**/api/reactions',route=>{
  if(route.request().method()!=='POST')return route.continue();
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({matched:true,match_id:'e1b4d369-73ac-4c8d-8145-78a31a4a7ea0',next:{profiles:[]}})});
 });
 await page.locator('.discover .feed-action.action-like').click();
 const dialog=page.getByRole('dialog',{name:/match/i});
 await expect(dialog).toBeVisible();
 await expect(dialog.locator('.vx-match-avatar')).toHaveCount(2);
 await expect(dialog.getByRole('button',{name:/написать/i})).toBeVisible();
 await expect(dialog.getByRole('button',{name:/посмотреть профиль/i})).toBeVisible();
 await dialog.getByRole('button',{name:'продолжить знакомства'}).click();
 await expect(dialog).toHaveCount(0);
});

test('V5 Симпатии displays exactly two tabs, real matches, profiles, and incoming cards',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await page.locator('.bottom-nav').getByRole('button',{name:'симпатии'}).click();
 await expect(page.locator('.likes-v2 [role="tab"]')).toHaveCount(2);
 await expect(page.getByRole('tab',{name:/Мэтчи/})).toHaveAttribute('aria-selected','true');
 await expect(page.locator('.likes-v2 .likes-gallery .likes-person').first()).toBeVisible();
 await page.locator('.likes-v2 .likes-person-photo').first().click();
 await expect(page.locator('.member')).toBeVisible();
 await page.locator('.vx-member-native-header .vx-member-fallback-back').click();
 await page.getByRole('tab',{name:/Входящие/}).click();
 await expect(page.locator('.likes-v2 .likes-gallery .likes-person').first()).toBeVisible();
 await expect(page.locator('.likes-v2 .likes-private-card')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('V5 free incoming likes reveal counts but never reveal private identities',async({page})=>{
 await telegram(page,30);await page.goto('/');
 await page.locator('.bottom-nav').getByRole('button',{name:'симпатии'}).click();
 await page.getByRole('tab',{name:/Входящие/}).click();
 await expect(page.locator('.likes-private-card').first()).toBeVisible();
 await expect(page.locator('.likes-v2 .likes-gallery .photo-box')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/Открыть с Premium/})).toBeVisible();
 await page.getByRole('button',{name:/Открыть с Premium/}).click();
 await expect(page.getByRole('dialog',{name:'VEYRA Premium'})).toBeVisible();
});

test('VEYRA V2 serves its own wordmark and five navigation icon assets',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await expect(page.locator('.bottom-nav button')).toHaveCount(5);
 await expect(page.locator('.vx-dating-stage02 .vx-head .vx-logo')).toHaveAttribute('src','/veyra-design/veyra-wordmark-purple.svg');
 for(const path of ['00_brand/veyra_logo_primary.svg','01_icons/inactive/search.svg','01_icons/inactive/cards.svg','01_icons/inactive/chats.svg','01_icons/inactive/heart.svg','01_icons/inactive/profile.svg','01_icons/active/heart.svg','04_empty_states/svg/no_results.svg']){
  const response=await page.request.get('/veyra-approved/'+path);
  expect(response.status(),path).toBe(200);
  expect(response.headers()['content-type']).toContain('image/svg+xml');
 }
 await page.locator('.bottom-nav').getByRole('button',{name:'поиск'}).click();
 await expect(page.locator('.v2-directory')).toBeVisible();
 await expect(page.getByRole('tablist',{name:'Подборки людей'}).getByRole('tab')).toHaveCount(2);
 await page.locator('.bottom-nav').getByRole('button',{name:'знакомства'}).click();
 await expect(page.locator('.feed-photo')).toBeVisible();
});

test('approved Work icon files are served in all three states and applied to navigation',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await expect(page.locator('.bottom-nav button')).toHaveCount(5);
 const targets=[
  '01_icons/inactive/search.svg','01_icons/active/search.svg','01_icons/on_dark/search.svg',
  '01_icons/inactive/cards.svg','01_icons/active/heart.svg','01_icons/active/chats.svg',
  '01_icons/inactive/profile.svg','01_icons/active/gift.svg','01_icons/active/premium.svg',
  '02_interest_icons/svg/normal/music.svg','02_interest_icons/svg/selected/music.svg'
 ];
 for(const file of targets){
   const response=await page.request.get('/veyra-approved/'+file);
   expect(response.status(),file).toBe(200);
   expect(response.headers()['content-type']).toContain('image/svg+xml');
 }
 await expect(page.locator('.bottom-nav button').first().locator('img')).toHaveAttribute('src',/\/veyra-approved\/01_icons\/inactive\/search\.svg/);
 await page.locator('.bottom-nav').getByRole('button',{name:'симпатии'}).click();
 await expect(page.locator('.bottom-nav button.active img')).toHaveAttribute('src',/\/veyra-approved\/01_icons\/active\/heart\.svg/);
});

test('VEYRA mobile QA: 320px screen, all five tabs, working wallet and no horizontal overflow',async({page})=>{
 await page.setViewportSize({width:320,height:640});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await telegram(page,10);await page.goto('/');
 await expect(page.locator('.feed-photo')).toBeVisible();
 const nav=page.locator('.bottom-nav');
 const tabs=[
  ['знакомства','.feed-photo'],['поиск','.v2-directory'],
  ['симпатии','.likes-v2'],['чаты','.veyra-chats'],
  ['профиль','.own-profile']
 ];
 for(const [label,target] of tabs){
  await nav.getByRole('button',{name:label}).click();
  await expect(page.locator(target)).toBeVisible();
  const metrics=await page.evaluate(()=>{
   const nav=document.querySelector('.bottom-nav'),rect=nav?.getBoundingClientRect();
   return {width:window.innerWidth,doc:document.documentElement.scrollWidth,
    top:rect?.top,bottom:rect?.bottom,navWidth:rect?.width};
  });
  expect(metrics.doc,label+' horizontal scroll').toBeLessThanOrEqual(metrics.width+2);
  expect(metrics.top,label+' bottom navigation').toBeGreaterThan(0);
  expect(metrics.bottom,label+' bottom navigation').toBeLessThanOrEqual(642);
 }
 await page.getByRole('tab',{name:'Ещё'}).click();
 await page.getByRole('button',{name:/Мой кошелёк VEYS/}).click();
 const wallet=page.getByRole('dialog',{name:'Мои VEYS'});
 await expect(wallet).toBeVisible();
 await expect(wallet.locator('.veys-balance-card')).toBeVisible();
 await expect(wallet.locator('.veys-balance-card .veys-diamond')).toHaveCount(1);
 await expect(page.locator('body')).toHaveCSS('overflow','hidden');
 await wallet.getByRole('tab',{name:'Магазин'}).click();
 await expect(wallet.locator('.veys-package').first()).toBeVisible();
 await wallet.getByRole('tab',{name:'История'}).click();
 await expect(wallet.locator('.veys-history')).toBeVisible();
 await wallet.getByRole('button',{name:'Закрыть'}).click();
 await expect(page.getByRole('dialog',{name:'Мои VEYS'})).toHaveCount(0);
 await expect(page.locator('body')).not.toHaveCSS('overflow','hidden');
 await nav.getByRole('button',{name:'поиск'}).click();
 await page.getByRole('button',{name:'Открыть VEYS кошелёк'}).click();
 await expect(page.getByRole('dialog',{name:'Мои VEYS'})).toBeVisible();
 await page.getByRole('dialog',{name:'Мои VEYS'}).getByRole('button',{name:'Закрыть'}).click();
 expect(errors).toEqual([]);
});
test('VEYRA mobile QA: filters work above nav at 360x620 and brand imagery loads',async({page})=>{
 await page.setViewportSize({width:360,height:620});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await telegram(page,10);await page.goto('/');
 await expect(page.locator('.feed-photo')).toBeVisible();
 await page.getByRole('button',{name:'Фильтры',exact:true}).click();
 const filters=page.getByRole('dialog',{name:'фильтры'});
 await expect(filters).toBeVisible();
 await expect(page.locator('.bottom-nav')).toHaveCount(0);
 const bounds=await filters.evaluate(el=>({h:window.innerHeight,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom}));
 expect(bounds.top).toBeGreaterThanOrEqual(-1);
 expect(bounds.bottom).toBeLessThanOrEqual(bounds.h+1);
 await filters.getByRole('button',{name:'Закрыть'}).click();
 await expect(page.locator('.bottom-nav')).toBeVisible();
 const bad=await page.evaluate(()=>[...document.querySelectorAll('img[src^="/veyra-approved/"]')].filter(i=>{
  const r=i.getBoundingClientRect();
  return i.complete&&i.naturalWidth===0&&r.width>0&&r.height>0&&r.bottom>0&&r.top<window.innerHeight;
 }).map(i=>i.getAttribute('src')));
 expect(bad).toEqual([]);
 expect(errors).toEqual([]);
});

test('gift draft and recipient survive wallet roundtrip',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await page.locator('.bottom-nav').getByRole('button',{name:'чаты'}).click();
 await page.locator('.chat-tile').first().click();
 await page.locator('[title="Отправить подарок"]').click();
 const gift=page.getByRole('dialog',{name:/подарок для/i});
 await expect(gift).toBeVisible();
 const title=await gift.locator('.sheet-head h2').innerText();
 await gift.getByPlaceholder('От всего сердца').fill('Тёплый привет');
 await gift.getByRole('button',{name:/Пополнить VEYS/}).click();
 await expect(page.getByRole('dialog',{name:'Мои VEYS'})).toBeVisible();
 await page.getByRole('dialog',{name:'Мои VEYS'}).getByRole('button',{name:'Закрыть'}).click();
 await expect(gift.locator('.sheet-head h2')).toHaveText(title);
 await expect(gift.getByPlaceholder('От всего сердца')).toHaveValue('Тёплый привет');
});

test('VEYRA gift sheet previews VEYS balance and avoids a failed request when funds are insufficient',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await page.locator('.bottom-nav').getByRole('button',{name:'чаты'}).click();
 await page.locator('.chat-tile').first().click();
 await page.locator('[title="Отправить подарок"]').click();
 const sheet=page.getByRole('dialog',{name:/подарок для/i});
 await expect(sheet).toBeVisible();
 const status=sheet.locator('.gift-wallet-status');
 await expect(status).toContainText('VEYS');
 await expect(sheet.locator('.gift-grid button').first()).toBeVisible();
 const paidGift=sheet.locator('.gift-grid button').filter({hasText:'Роза'}).first();
 await expect(paidGift).toBeVisible();
 let sends=0;
 page.on('request',r=>{if(r.url().includes('/api/gifts/send')&&r.method()==='POST')sends++;});
 await paidGift.click();
 await expect(sheet.getByRole('alert')).toContainText('Недостаточно VEYS');
 expect(sends).toBe(0);
 await status.getByRole('button',{name:'Пополнить'}).click();
 await expect(page.getByRole('dialog',{name:'Мои VEYS'})).toBeVisible();
 await page.getByRole('dialog',{name:'Мои VEYS'}).getByRole('button',{name:'Закрыть'}).click();
 await expect(sheet.locator('.gift-wallet-status')).toBeVisible();
});

test('VEYRA match celebration uses approved Work assets, not abandoned graphics',async({page})=>{
 await telegram(page,10);await page.goto('/');
 const resource=await page.request.get('/veyra-approved/01_icons/active/matches.svg');
 expect(resource.status()).toBe(200);
 const old=page.locator('img[src^="/veyra-v2/"]');
 await expect(old).toHaveCount(0);
});


test('Telegram Android fullscreen keeps dating wordmark between native controls and actions safely below',async({page})=>{
 await page.setViewportSize({width:393,height:852});
 await telegram(page,10,false,true);await page.goto('/');
 await expect(page.locator('.vx-dating-stage02 .vx-tabs')).toBeVisible();
 const positions=await page.evaluate(()=>{
  const box=q=>{const r=document.querySelector(q)?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right}:null};
  return {
   fullscreen:document.documentElement.classList.contains('veyra-telegram-fullscreen'),
   logo:box('.vx-dating-stage02 .vx-logo'),
   crown:box('.vx-dating-stage02 .vx-crown'),
   wallet:box('.vx-dating-stage02 .veys-header-button'),
   filters:box('.vx-dating-stage02 .vx-head-actions button:last-child'),
   tabs:box('.vx-dating-stage02 .vx-tabs'),
   header:box('.vx-dating-stage02 .vx-head'),
   width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth
  };
 });
 expect(positions.fullscreen).toBe(true);
 expect(positions.logo.top).toBeGreaterThanOrEqual(35);
 expect(positions.logo.bottom).toBeLessThanOrEqual(76);
 for(const name of ['crown','wallet','filters']){
  expect(positions[name].top,name+' must be below Telegram close button').toBeGreaterThanOrEqual(76);
  expect(positions[name].bottom,name+' must fit before the tabs').toBeLessThan(positions.tabs.top);
 }
 expect(positions.tabs.top).toBeGreaterThanOrEqual(136);
 expect(positions.scrollWidth).toBeLessThanOrEqual(positions.width);
 for(const label of ['Для вас','Рядом','Лента']){
  await page.getByRole('tab',{name:label}).click();
  await expect(page.getByRole('tab',{name:label})).toHaveAttribute('aria-selected','true');
  // Each tab restores its own window scroll; test document layout, not the
  // transient viewport Y after switching a long and a short panel.
  const top=await page.locator('.vx-dating-stage02 .vx-tabs').evaluate(e=>e.getBoundingClientRect().top+window.scrollY);
  expect(top).toBeGreaterThanOrEqual(136);
 }
});

test('small fullscreen dating keeps nearby filter button accessible above fixed bottom nav',async({page})=>{
 await page.setViewportSize({width:360,height:640});
 await telegram(page,10,false,true);await page.goto('/');
 await page.getByRole('tab',{name:'Рядом'}).click();
 const filters=page.locator('.vx-dating-stage02 .vx-filter-pills');
 await expect(filters).toBeVisible();
 await filters.getByRole('button',{name:'В сети'}).click();
 await expect(filters.getByRole('button',{name:'В сети'})).toHaveAttribute('aria-pressed','true');
 const bounds=await page.evaluate(()=>{
  const filter=document.querySelector('.vx-filter-pills button[aria-pressed="true"]').getBoundingClientRect();
  const nav=document.querySelector('.bottom-nav').getBoundingClientRect();
  return {filterTop:filter.top,filterBottom:filter.bottom,navTop:nav.top,scrollHeight:document.documentElement.scrollHeight};
 });
 expect(bounds.filterTop).toBeGreaterThanOrEqual(0);
 expect(bounds.filterBottom).toBeLessThan(bounds.navTop);
 expect(bounds.scrollHeight).toBeGreaterThan(640);
});


/* Visual review, isolated to the PGlite Telegram fixture; never accesses real users. */
test('VISUAL_AUDIT registration through approved dating tabs captures reference screenshots',async({page},testInfo)=>{
 const {mkdir,writeFile}=await import('node:fs/promises');
 const path=await import('node:path');
 const dir=path.resolve('test-results/veyra-visual-audit');
 await mkdir(dir,{recursive:true});
 const screenshots=[],shotsRegister=[],shotsDating=[];
 async function capture(label,group){
  await page.evaluate(()=>document.fonts.ready);
  const buffer=await page.screenshot({type:'jpeg',quality:82,fullPage:false,animations:'disabled'});
  const filename=label+'.jpg';await writeFile(path.join(dir,filename),buffer);
  (group==='registration'?shotsRegister:shotsDating).push({label,buffer});screenshots.push(filename);
 }
 const outputContact=async(name,arr,columns=3)=>{
  const tileW=260,tileH=570,pad=12,title=29,rows=Math.ceil(arr.length/columns),contactW=columns*(tileW+pad)+pad,contactH=rows*(tileH+title+pad)+pad;
  const overlays=[];
  for(let i=0;i<arr.length;i++){
   const col=i%columns,row=Math.floor(i/columns),x=pad+col*(tileW+pad),y=pad+row*(tileH+title+pad);
   const data=await sharp(arr[i].buffer).resize(tileW,tileH,{fit:'fill'}).jpeg({quality:54}).toBuffer();
   const labelSVG=Buffer.from('<svg width="'+tileW+'" height="'+title+'"><rect width="'+tileW+'" height="'+title+'" fill="#EEE5FB"/><text x="9" y="20" font-family="Arial" font-size="14" font-weight="bold" fill="#352050">'+arr[i].label+'</text></svg>');
   overlays.push({input:labelSVG,left:x,top:y},{input:data,left:x,top:y+title});
  }
  const composite=await sharp({create:{width:contactW,height:contactH,channels:3,background:'#FFFFFF'}}).composite(overlays).jpeg({quality:47,mozjpeg:true}).toBuffer();
  await writeFile(path.join(dir,name+'.jpg'),composite);
  const encoded=composite.toString('base64'),width=3000;
  for(let i=0;i<encoded.length;i+=width)console.log('VEYRA_SCREENSHOT_DATA|'+name+'|'+Math.floor(i/width)+'|'+encoded.slice(i,i+width));
  console.log('VEYRA_SCREENSHOT_END|'+name+'|'+composite.length+'|'+arr.length);
 };
 // Real eight-step registration, using local test account #24 only.
 await telegram(page,22001,false,true);await page.goto('/');
 await expect(page.getByRole('heading',{name:'Как вас зовут?'})).toBeVisible();
 await capture('01_name_consent','registration');
 await page.locator('.registration-consent input').check();
 await page.getByRole('button',{name:'Указать возраст'}).click();
 await expect(page.getByRole('heading',{name:'Когда ваш день рождения?'})).toBeVisible();
 await capture('02_age_gender','registration');
 await page.getByLabel('День рождения').fill('12');
 await page.getByLabel('Месяц рождения').fill('05');
 await page.getByLabel('Год рождения').fill('1998');
 await page.getByRole('button',{name:'мужчина'}).click();
 await page.getByRole('button',{name:'Выбрать город'}).click();
 await expect(page.getByRole('heading',{name:'Разрешите доступ к геолокации'})).toBeVisible();
 await capture('03_location','registration');
 await page.getByRole('textbox',{name:'Поиск города'}).fill('Par');
 await page.locator('.city-results button').first().click();
 await page.getByRole('button',{name:'Настроить поиск'}).click();
 await expect(page.getByRole('heading',{name:'Кого вы ищете?'})).toBeVisible();
 await capture('04_preferences','registration');
 await page.getByRole('button',{name:'Выбрать цель знакомства'}).click();
 await expect(page.locator('.veyra-goal-choice').first()).toBeVisible();
 await capture('05_goal','registration');
 await page.locator('.veyra-goal-choice').nth(1).click();
 await page.getByRole('button',{name:'Выбрать интересы'}).click();
 await expect(page.getByRole('heading',{name:'Ваши интересы'})).toBeVisible();
 await capture('06_interests','registration');
 await page.locator('.veyra-interest-options button').first().click();
 await page.getByRole('button',{name:'Рассказать о себе'}).click();
 await expect(page.getByRole('heading',{name:'Немного о себе'})).toBeVisible();
 await capture('07_bio','registration');
 await page.getByRole('textbox',{name:'О себе'}).fill('Люблю кофе, путешествия и интересные знакомства.');
 await page.getByRole('button',{name:'Добавить фото'}).click();
 await expect(page.getByRole('heading',{name:'Добавьте свои фото'})).toBeVisible();
 await capture('08_add_photos','registration');
 const makePhoto=async(index)=>sharp({create:{width:380,height:520,channels:3,background:{r:185+index*15,g:150+index*9,b:220-index*10}}}).png().toBuffer();
 const photoFiles=[];
 for(let i=0;i<3;i++)photoFiles.push({name:'test-portrait-'+i+'.png',mimeType:'image/png',buffer:await makePhoto(i)});
 await page.locator('input[type=file]').setInputFiles(photoFiles);
 await expect(page.locator('.registration-photo-count')).toContainText('3 из 7',{timeout:45000});
 await page.getByRole('button',{name:'Посмотреть анкету'}).click();
 await expect(page.locator('.preview-gallery')).toBeVisible();
 await capture('09_profile_preview','registration');
 await page.getByRole('tab',{name:'Полный профиль'}).click();
 await capture('10_full_preview','registration');
 await outputContact('REGISTRATION_01_09',shotsRegister.slice(0,9),3);
 await outputContact('REGISTRATION_10',shotsRegister.slice(9),1);

 // Review queue (the profile is pending), and existing approved test accounts.
 await telegram(page,12,false,true);await page.goto('/');
 await expect(page.locator('.vc-screen--pending')).toBeVisible();
 await capture('11_moderation','dating');
 // Replace Telegram test session before a new navigation, never touch live accounts.
 await page.addInitScript(data=>{window.Telegram.WebApp.initData=data;window.Telegram.WebApp.isFullscreen=true;},initData(10,env.USER_BOT_TOKEN));
 await page.reload();
 await expect(page.locator('.vx-dating-stage02 .vx-tabs')).toBeVisible();
 await capture('12_feed','dating');
 await page.getByRole('tab',{name:'Для вас'}).click();
 await expect(page.locator('.vx-personal-head')).toBeVisible();
 await capture('13_for_you','dating');
 await page.getByRole('tab',{name:'Рядом'}).click();
 await expect(page.locator('.vx-nearby-hero')).toBeVisible();
 await capture('14_nearby','dating');
 await outputContact('DATING_11_14',shotsDating,2);
 console.log('VEYRA_AUDIT_FILES|'+screenshots.join(','));
});

test('VEYRA logo visual pigment centered across full-width fullscreen Android WebView',async({page})=>{
 await page.setViewportSize({width:393,height:852});
 await telegram(page,10,false,true);
 await page.goto('/');
 await expect(page.locator('.vx-dating-stage02 .vx-logo')).toBeVisible();
 const bounds=await page.locator('.vx-dating-stage02 .vx-logo').evaluate(e=>{
  const r=e.getBoundingClientRect();const style=getComputedStyle(e);
  return {left:r.left,right:r.right,center:r.left+r.width/2,width:r.width,objectPosition:style.objectPosition}
 });
 expect(bounds.objectPosition).toBe('50% 50%');
 expect(Math.abs(bounds.center-393/2)).toBeLessThan(2);
 const img=await page.screenshot({type:'png',animations:'disabled'});
 const {data,info}=await sharp(img).extract({left:0,top:39,width:393,height:37}).raw().toBuffer({resolveWithObject:true});
 let minX=999,maxX=-1,count=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const i=(y*info.width+x)*info.channels,r=data[i],g=data[i+1],b=data[i+2];
  if(b>175&&b>r+35&&b>g+45&&r>75&&r<207&&g<175){minX=Math.min(minX,x);maxX=Math.max(maxX,x);count++;}
 }
 expect(count,'logo painted pixels in Telegram title row').toBeGreaterThan(100);
 const paintedCenter=(minX+maxX)/2;
 console.log('VEYRA_LOGO_CENTER|'+JSON.stringify({paintedCenter,screenCenter:196.5,count,minX,maxX,bounds}));
 expect(Math.abs(paintedCenter-393/2),'visible purple logo lettering, not only image bounds, centered').toBeLessThanOrEqual(8);
});

test('approved VEYRA art loads as files and category cards request filtered real profiles',async({page})=>{
 await telegram(page,10,false,true);
 await page.goto('/');
 await page.getByRole('tab',{name:'Для вас'}).click();
 const artworks=page.locator('.vx-for_you .vx-hero-art, .vx-for_you .vx-collection-art');
 await expect(artworks).toHaveCount(4);
 await expect(page.locator('.vx-themed-collection')).toHaveCount(3);
 for(let i=0;i<4;i++)await expect.poll(()=>artworks.nth(i).evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 const chosen=page.locator('.vx-themed-collection');
 const collectionCases=[
  ['Схожие интересы','common_interests=true'],
  ['Серьёзные отношения','goal=relationship'],
  ['Любят путешествовать','interest=%D0%9F%D1%83%D1%82%D0%B5%D1%88%D0%B5%D1%81%D1%82%D0%B2%D0%B8%D1%8F']
 ];
 for(const [label,param] of collectionCases){
  const target=page.getByRole('button',{name:'Подборка: '+label});
  const response=page.waitForResponse(r=>r.url().includes('/api/feed?')&&r.url().includes(param));
  await target.click();
  expect((await response).status()).toBe(200);
  await expect(target).toHaveAttribute('aria-pressed','true');
 }
 await page.getByRole('tab',{name:'Рядом'}).click();
 await expect.poll(()=>page.locator('.vx-nearby .vx-hero-art').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
});

test('original PNG images and new premium crown render without overflowing benefit chips',async({page})=>{
 await page.setViewportSize({width:360,height:800});
 await telegram(page,10,false,true);
 await page.goto('/');
 await page.getByRole('tab',{name:'Для вас'}).click();
 const art=page.locator('.vx-for_you .vx-hero-art, .vx-for_you .vx-collection-art');
 await expect(art).toHaveCount(4);
 for(let i=0;i<4;i++){
  await expect.poll(()=>art.nth(i).evaluate(el=>el.complete&&el.naturalWidth>=1152&&el.currentSrc.includes('_master_20261013.png'))).toBe(true);
 }
 const crown=page.locator('.vx-crown .vx-premium-crown');
 await expect(crown).toBeVisible();
 await expect.poll(()=>crown.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
 await expect(page.locator('.vx-benefits .vx-benefit-chip')).toHaveCount(3);
 for(const width of [360,320]){
  await page.setViewportSize({width,height:800});
  const geometry=await page.locator('.vx-benefits .vx-benefit-chip').evaluateAll(chips=>chips.map(chip=>{
   const span=chip.querySelector('.vx-benefit-copy');
   const text=span.getBoundingClientRect(),outer=chip.getBoundingClientRect();
   return {outerRight:outer.right,textRight:text.right,scrollWidth:span.scrollWidth,clientWidth:span.clientWidth,
     chipScrollWidth:chip.scrollWidth,chipClientWidth:chip.clientWidth,whiteSpace:getComputedStyle(span).whiteSpace};
  }));
  for(const item of geometry){
   expect(item.whiteSpace).toBe('normal');
   expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth+1);
   expect(item.chipScrollWidth).toBeLessThanOrEqual(item.chipClientWidth+1);
   expect(item.textRight).toBeLessThanOrEqual(item.outerRight+1);
  }
 }
 await page.getByRole('tab',{name:'Рядом'}).click();
 await expect.poll(()=>page.locator('.vx-nearby-art').evaluate(el=>el.complete&&el.naturalWidth===1536&&el.currentSrc.includes('_master_20261013.png'))).toBe(true);
});

test('VEYRA Feed remains a single screen with solid centered actions and visible top utilities',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await telegram(page,10);await page.goto('/');
 await expect(page.locator('.feed-photo')).toBeVisible();
 await expect(page.locator('html')).toHaveClass(/veyra-feed-viewport-locked/);
 await expect(page.locator('.vx-head .veys-header-button')).toBeVisible();
 await expect(page.getByRole('tab',{name:'Лента'})).toBeVisible();
 const sizes=await page.evaluate(()=>{
  const card=document.querySelector('.vx-feed-card-stage>.feed-photo').getBoundingClientRect();
  const nav=document.querySelector('.bottom-nav').getBoundingClientRect();
  const action=document.querySelector('.vx-feed-card-stage .feed-action.action-like .feed-action-circle').getBoundingClientRect();
  const undo=document.querySelector('.vx-feed-card-stage .feed-action.action-undo .feed-action-circle');
  return {cardRight:card.right,heartRight:action.right,photoHeight:card.height,navTop:nav.top,
   stageBottom:document.querySelector('.vx-feed-card-stage').getBoundingClientRect().bottom,
   undoOpacity:getComputedStyle(undo).opacity,undoParentOpacity:getComputedStyle(undo.closest('.action-undo')).opacity};
 });
 expect(sizes.heartRight).toBeLessThanOrEqual(sizes.cardRight+3);
 expect(sizes.photoHeight).toBeGreaterThan(250);
 expect(sizes.stageBottom).toBeLessThanOrEqual(sizes.navTop+4);
 expect(Number(sizes.undoOpacity)).toBe(1);
 expect(Number(sizes.undoParentOpacity)).toBe(1);
 await page.evaluate(()=>window.scrollTo(0,400));
 await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);
 await page.getByRole('tab',{name:'Рядом'}).click();
 await expect(page.locator('html')).not.toHaveClass(/veyra-feed-viewport-locked/);
});

test('VEYRA member profile transforms its whole hero into a sticky compact header with four tabs',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await telegram(page,10);await page.goto('/');
 await page.locator('.feed-photo .hero-name').click();
 const member=page.locator('.member-feed-profile');
 const root=member.locator('.vx-profile-scroller');
 const motion=member.locator('.vx-profile-motion');
 const photo=member.locator('.vx-profile-hero-photo');
 const actions=member.locator('.vx-profile-primary-actions');
 const rail=member.getByRole('tablist',{name:'Разделы анкеты'});
 await expect(member).toBeVisible();
 await expect(photo.locator('.photo-box')).toHaveCount(1);
 await expect(page.locator('body > .vx-member-morph-frame')).toHaveCount(0);
 await expect(page.locator('body > .vx-member-morph-text')).toHaveCount(0);
 await expect(rail.getByRole('tab')).toHaveCount(4);
 await expect(rail.getByRole('tab',{name:'О себе'})).toHaveAttribute('aria-selected','true');
 await expect(actions.locator('button')).toHaveCount(3);
 await expect(member.locator('.vx-profile-swipe-page[aria-hidden="false"]')).toContainText('Интересы');
 await expect(member.locator('.vx-profile-swipe-page[aria-hidden="false"] .vx-profile-goal-detail')).toBeVisible();
 const opened=await photo.boundingBox(),logo=page.locator('body > .vx-member-native-header .vx-member-floating-logo');
 const logoBefore=await logo.boundingBox();
 const state=await root.evaluate(el=>({height:el.querySelector('.vx-profile-open-spacer').getBoundingClientRect().height,compact:parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height'))}));
 const distance=state.height-state.compact;
 expect(opened.height).toBeGreaterThan(300);
 expect(distance).toBeGreaterThan(230);
 await root.evaluate((el,distance)=>{el.scrollTop=distance*.5},distance);
 await expect.poll(()=>motion.getAttribute('data-state')).toBe('transition');
 const mid=await photo.boundingBox();
 expect(mid.height).toBeLessThan(opened.height-80);
 expect(mid.height).toBeGreaterThan(82);
 await root.evaluate((el,distance)=>{el.scrollTop=distance+10},distance);
 await expect.poll(()=>motion.getAttribute('data-state')).toBe('compact');
 const compact=await photo.boundingBox();
 expect(compact.height).toBeGreaterThan(92);
 expect(compact.height).toBeLessThan(101);
 expect(Math.abs(compact.width-compact.height)).toBeLessThan(4);
 const railBefore=await rail.boundingBox(),actionsBefore=await actions.boundingBox();
 expect(Math.abs(actionsBefore.y-(await root.boundingBox()).y)).toBeLessThan(220);
 await root.evaluate((el,distance)=>{el.scrollTop=distance+220},distance);
 const railAfter=await rail.boundingBox(),actionsAfter=await actions.boundingBox();
 expect(Math.abs(railAfter.y-railBefore.y)).toBeLessThan(3);
 expect(Math.abs(actionsAfter.y-actionsBefore.y)).toBeLessThan(3);
 const logoAfter=await logo.boundingBox();
 expect(Math.abs(logoAfter.y-logoBefore.y)).toBeLessThan(2);
 await rail.getByRole('tab',{name:'Фото'}).click();
 await expect(member.getByRole('tabpanel',{name:'Фото'})).toBeVisible();
 await expect(member.locator('.vx-profile-photos-grid button').first()).toBeVisible();
 await rail.getByRole('tab',{name:'Подарки'}).click();
 await expect(member.getByRole('tabpanel',{name:'Подарки'})).toBeVisible();
 await rail.getByRole('tab',{name:'Общее'}).click();
 await expect(member.getByRole('tabpanel',{name:'Общее'})).toBeVisible();
 await root.evaluate(el=>{el.scrollTop=0});
 await expect.poll(()=>motion.getAttribute('data-state')).toBe('expanded');
 await expect.poll(async()=>Math.abs((await photo.boundingBox()).height-opened.height),
  {timeout:3500}).toBeLessThan(5);
});

test('VEYRA fullscreen member keeps brand pinned, gallery and all four tabs functional',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await telegram(page,10,false,true);await page.goto('/');
 await expect(page.locator('.feed-photo')).toBeVisible();
 await page.locator('.feed-photo .hero-name').click();
 const root=page.locator('.vx-profile-scroller');
 const photo=page.locator('.vx-profile-hero-photo');
 const logo=page.locator('body > .vx-member-native-header .vx-member-floating-logo');
 await expect(page.locator('html')).toHaveClass(/veyra-telegram-fullscreen/);
 const before=await logo.boundingBox();
 await root.evaluate(el=>{el.scrollTop=650});
 await expect.poll(()=>page.locator('.vx-profile-motion').getAttribute('data-state')).toBe('compact');
 const after=await logo.boundingBox();
 expect(Math.abs(before.y-after.y)).toBeLessThan(2);
 expect(Math.abs(before.x-after.x)).toBeLessThan(2);
 await expect(page.getByRole('tab',{name:'Фото'})).toBeVisible();
 await page.getByRole('tab',{name:'Фото'}).click();
 await page.locator('.vx-profile-photos-grid button').first().click();
 await expect(page.locator('body > .vx-profile-gallery')).toBeVisible();
 await page.locator('.gallery-close').click();
 await expect(page.locator('body > .vx-profile-gallery')).toHaveCount(0);
 await photo.locator('.photo-box').click();
 await expect(page.locator('body > .vx-profile-gallery')).toBeVisible();
 await page.locator('.gallery-close').click();
 await root.evaluate(el=>{el.scrollTop=0});
 await expect.poll(()=>page.locator('.vx-profile-motion').getAttribute('data-state')).toBe('expanded');
});


test('VEYRA master pack: full-bleed hero, vector buttons, opaque tabs and gesture-end snap',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await telegram(page,10);await page.goto('/');
 await page.locator('.feed-photo .hero-name').click();
 const root=page.locator('.vx-master-profile .vx-profile-scroller');
 const photo=page.locator('.vx-master-profile .vx-profile-hero-photo');
 const actions=page.locator('.vx-master-profile .vx-profile-primary-actions');
 const rail=page.locator('.vx-master-profile .vx-profile-tab-rail');
 await expect(root).toBeVisible();
 const sizes=await Promise.all([root.boundingBox(),photo.boundingBox()]);
 expect(Math.abs(sizes[0].x-sizes[1].x)).toBeLessThan(2);
 expect(Math.abs(sizes[0].width-sizes[1].width)).toBeLessThan(2);
 await expect(actions.locator('.vx-pack-icon')).toHaveCount(3);
 expect(await rail.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(253, 250, 255)');
 expect(await actions.locator('button.primary').evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('linear-gradient');
 const d=await root.evaluate(el=>el.querySelector('.vx-profile-open-spacer').offsetHeight-parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height')));
 await root.evaluate((el,d)=>{el.dispatchEvent(new Event('touchstart',{bubbles:true}));el.scrollTop=d*.7;el.dispatchEvent(new Event('touchend',{bubbles:true}))},d);
 await expect.poll(()=>root.evaluate(el=>el.scrollTop),{timeout:4500}).toBeGreaterThan(d-2);
 await expect(page.locator('.vx-profile-motion')).toHaveAttribute('data-state','compact');
 await root.evaluate((el,d)=>{el.dispatchEvent(new Event('touchstart',{bubbles:true}));el.scrollTop=d*.2;el.dispatchEvent(new Event('touchend',{bubbles:true}))},d);
 await expect.poll(()=>root.evaluate(el=>el.scrollTop),{timeout:4500}).toBeLessThan(2);
 await expect(page.locator('.vx-profile-motion')).toHaveAttribute('data-state','expanded');
 await rail.getByRole('tab',{name:'Фото'}).click();
 await expect(page.locator('.vx-profile-photos-grid')).toBeVisible();
 await rail.getByRole('tab',{name:'Подарки'}).click();
 await expect(page.getByRole('tabpanel',{name:'Подарки'})).toBeVisible();
});

test('VEYRA swipe track follows finger and own profile uses the editable hero',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await telegram(page,10,false,true);await page.goto('/');
 await page.locator('.feed-photo .hero-name').click();
 const rail=page.getByRole('tablist',{name:'Разделы анкеты'});
 const track=page.locator('.vx-profile-swipe-track');
 const scroller=page.locator('.vx-profile-scroller');
 await scroller.evaluate(el=>{el.scrollTop=650});
 await expect.poll(()=>page.locator('.vx-profile-motion').getAttribute('data-state')).toBe('compact');
 const before=await track.evaluate(el=>getComputedStyle(el).transform);
 // Embla responds to real pointer gestures, not synthetic TouchEvent
 // dispatches sent only to the deprecated custom touch handlers.
 const viewport=await page.locator('.vx-profile-swipe-viewport').boundingBox();
 expect(viewport).toBeTruthy();
 // The carousel starts behind the sticky hero; drag from the actually
 // visible panel BELOW the 292px compact header and its 52px tabs.
 const visibleTop=await scroller.evaluate(el=>el.getBoundingClientRect().top+
  parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height'))+72);
 const y=Math.min(viewport.y+viewport.height-25,Math.max(viewport.y+210,visibleTop));
 await page.mouse.move(viewport.x+viewport.width-36,y);
 await page.mouse.down();
 await page.mouse.move(viewport.x+viewport.width*.53,y+2,{steps:8});
 await expect.poll(()=>track.evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
 await page.mouse.move(viewport.x+48,y+2,{steps:9});
 await page.mouse.up();
 await expect(rail.getByRole('tab',{name:'Фото'})).toHaveAttribute('aria-selected','true');
 await page.goto('/');
 await page.locator('.bottom-nav').getByRole('button',{name:'профиль'}).click();
 await expect(page.locator('.vx-own-member')).toBeVisible();
 await expect(page.locator('.vx-own-member .vx-profile-hero-photo .photo-box')).toHaveCount(1);
 await expect(page.locator('.vx-own-member .vx-profile-primary-actions button')).toHaveCount(3);
 await expect(page.getByRole('tab',{name:'Ещё'})).toBeVisible();
 await page.getByRole('button',{name:'Изменить описание'}).click();
 await expect(page.locator('.vx-own-member')).toHaveCount(0);
});


test('VEYRA Telegram staged morph first holds the cover, then centers photo, then docks left',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await telegram(page,10,false,true);await page.goto('/');
 await page.locator('.feed-photo .hero-name').click();
 const root=page.locator('.vx-profile-scroller');
 const photo=page.locator('.vx-profile-hero-photo');
 const motion=page.locator('.vx-profile-motion');
 const stage=await root.evaluate(el=>({
  distance:el.querySelector('.vx-profile-open-spacer').offsetHeight-
   parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height')),
 }));
 const d=stage.distance;
 const opened=await photo.boundingBox();
 const imageBefore=await photo.locator('img').count();
 const setProgress=async p=>{
  await root.evaluate((el,scroll)=>{el.scrollTop=scroll},d*p);
  await expect.poll(()=>root.evaluate(el=>el.scrollTop)).toBeGreaterThanOrEqual(d*p-2);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  return photo.boundingBox();
 };
 const early=await setProgress(.12);
 expect(early.width).toBeLessThan(opened.width-5);
 expect(early.width).toBeGreaterThan(opened.width-28);
 expect(early.y).toBeLessThan(opened.y);
 const middle=await setProgress(.39);
 expect(Math.abs(middle.width-190)).toBeLessThan(4);
 expect(Math.abs(middle.height-194)).toBeLessThan(4);
 expect(Math.abs(middle.x-(opened.width-middle.width)/2-opened.x)).toBeLessThan(5);
 const compact=await setProgress(1);
 expect(Math.abs(compact.width-98)).toBeLessThan(3);
 expect(Math.abs(compact.height-98)).toBeLessThan(3);
 expect(Math.abs(compact.x-opened.x-16)).toBeLessThan(3);
 expect(await photo.locator('img').count()).toBe(imageBefore);
 await expect(motion).toHaveAttribute('data-state','compact');
 await setProgress(0);
 await expect(motion).toHaveAttribute('data-state','expanded');
 await expect.poll(async()=>Math.abs((await photo.boundingBox()).height-opened.height),
  {timeout:3500}).toBeLessThan(4);
});


test('VEYRA FPS debug panel stays off until five logo taps and runs only while visible',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await telegram(page,10,false,true);await page.goto('/');
 await page.locator('.bottom-nav').getByRole('button',{name:'профиль'}).click();
 const hud=page.getByRole('group',{name:'Монитор FPS VEYRA'});
 await expect(hud).toHaveCount(0);
 const logo=page.locator('body > .vx-member-native-header .vx-member-floating-logo');
 await expect(logo).toBeVisible();
 for(let i=0;i<4;i++)await logo.click();
 await expect(hud).toHaveCount(0);
 await logo.click();
 await expect(hud).toBeVisible();
 await expect.poll(async()=>Number(await hud.getByTestId('veyra-fps-value').textContent()),{timeout:6000}).toBeGreaterThan(0);
 await hud.getByRole('button',{name:'Подробности FPS'}).click();
 await expect(hud).toContainText('Кадр p95 / p99');
 await expect(hud).toContainText('Пропуски, оценка');
 await hud.getByRole('button',{name:'Закрыть FPS'}).click();
 await expect(hud).toHaveCount(0);
});


test('VEYRA Motion 3 panel remains opaque and debug HUD captures live profile traces',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await telegram(page,10,false,true);await page.goto('/');
 await page.locator('.feed-photo .hero-name').click();
 const logo=page.locator('body > .vx-member-native-header .vx-member-floating-logo');
 for(let n=0;n<5;n++)await logo.click();
 const hud=page.getByRole('group',{name:'Монитор FPS VEYRA'});
 await expect(hud).toBeVisible();
 await hud.getByRole('button',{name:'Подробности FPS'}).click();
 await expect(hud).toContainText('JS анимации p95');
 await expect(hud).toContainText('Forced layout внутри LoAF');
 const root=page.locator('.vx-profile-scroller');
 const lip=page.locator('.vx-profile-sheet-lip');
 const distance=await root.evaluate(el=>el.querySelector('.vx-profile-open-spacer').offsetHeight-
  parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height')));
 for(const p of [.16,.24,.39,.65,.91,1]){
  await root.evaluate((el,y)=>{el.scrollTop=y},distance*p);
  await expect.poll(()=>page.locator('.vx-profile-motion').getAttribute('data-state')).not.toBe('expanded');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await expect.poll(async()=>{
   const [actions,rail]=await Promise.all([
    page.locator('.vx-profile-primary-actions').boundingBox(),
    page.locator('.vx-profile-tab-rail').boundingBox(),
   ]);
   return rail.y-(actions.y+actions.height);
  },{timeout:3500}).toBeGreaterThanOrEqual(7);
  await expect(lip).toHaveCSS('opacity','1');
  await expect(page.locator('.vx-profile-compact-backdrop')).toHaveCSS('opacity','1');
 }
 await expect.poll(()=>hud.textContent()).toContain('Профиль');
 await expect(hud).toContainText('Перекалибровки');
 await hud.getByRole('button',{name:'Закрыть FPS'}).click();
 await expect(hud).toHaveCount(0);
});


test('VEYRA drives profile transform with Chromium ScrollTimeline when available',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await telegram(page,10,false,true);await page.goto('/');
 await page.locator('.feed-photo .hero-name').click();
 const hero=page.locator('.vx-profile-hero-photo');
 const root=page.locator('.vx-profile-scroller');
 await expect(hero).toBeVisible();
 const supported=await page.evaluate(()=>typeof window.ScrollTimeline==='function');
 if(supported){
  await expect.poll(()=>hero.evaluate(el=>el.getAnimations().some(a=>a.timeline instanceof window.ScrollTimeline)),{timeout:4500}).toBe(true);
  const start=await hero.boundingBox();
  const distance=await root.evaluate(el=>el.querySelector('.vx-profile-open-spacer').offsetHeight-
   parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height')));
  await root.evaluate((el,y)=>el.scrollTop=y,distance*.39);
  await expect.poll(async()=>Math.abs((await hero.boundingBox()).width-190),{timeout:4500}).toBeLessThan(5);
  await root.evaluate(el=>el.scrollTop=0);
  await expect.poll(async()=>Math.abs((await hero.boundingBox()).width-start.width),{timeout:4500}).toBeLessThan(5);
 }
});

test('VEYRA approved profile reference: portrait-derived blur, opaque sheet and premium actions',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await telegram(page,10,false,true);await page.goto('/');
 await page.locator('.feed-photo .hero-name').click();
 const root=page.locator('.vx-profile-scroller');
 const motion=page.locator('.vx-profile-motion');
 const hero=page.locator('.vx-profile-hero-photo');
 const blur=page.locator('.vx-profile-blurred-header');
 const ring=page.locator('.vx-profile-photo-morph-rim');
 const grip=page.locator('.vx-profile-sheet-grabber');
 const lip=page.locator('.vx-profile-sheet-lip');
 const actions=page.locator('.vx-profile-primary-actions');
 const primary=actions.locator('.vx-profile-action.primary');
 await expect(blur.locator('.photo-box')).toHaveCount(1);
 await expect(grip).toHaveCSS('opacity','1');
 await expect(primary).toContainText('Нравится');
 const visual=await primary.evaluate(el=>({bg:getComputedStyle(el).backgroundImage,
  radius:getComputedStyle(el).borderRadius,height:el.getBoundingClientRect().height}));
 expect(visual.bg).toContain('linear-gradient');
 expect(visual.height).toBeGreaterThan(49);
 expect(parseFloat(visual.radius)).toBeGreaterThan(20);
 const z=await page.evaluate(()=>({
  sheet:getComputedStyle(document.querySelector('.vx-profile-sheet-lip')).zIndex,
  photo:getComputedStyle(document.querySelector('.vx-profile-hero-photo')).zIndex,
  identity:getComputedStyle(document.querySelector('.vx-profile-identity')).zIndex
 }));
 expect(Number(z.sheet)).toBeGreaterThan(Number(z.photo)); // expanded sheet intentionally covers photo bottom
 expect(Number(z.identity)).toBeGreaterThan(Number(z.photo));
 const distance=await root.evaluate(el=>
  el.querySelector('.vx-profile-open-spacer').offsetHeight-
   parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height')));
 await root.evaluate((el,y)=>el.scrollTop=y,distance);
 await expect(motion).toHaveAttribute('data-state','compact');
 await expect.poll(()=>blur.evaluate(el=>+getComputedStyle(el).opacity)).toBeGreaterThan(.94);
 await expect.poll(()=>ring.evaluate(el=>+getComputedStyle(el).opacity)).toBeGreaterThan(.94);
 await expect.poll(()=>grip.evaluate(el=>+getComputedStyle(el).opacity)).toBeLessThan(.05);
 const [avatar,name]=await Promise.all([
  hero.boundingBox(),page.locator('.vx-profile-name-row h1').boundingBox()
 ]);
 expect(name.x).toBeGreaterThan(avatar.x+avatar.width-2);
 expect(Math.abs(avatar.width-98)).toBeLessThan(3);
 const city=await page.locator('.vx-profile-location').boundingBox();
 const goal=await page.locator('.vx-profile-goal').boundingBox();
 if(goal&&city){
  expect(goal.y).toBeGreaterThan(city.y+19);
  expect(Math.abs(goal.x-city.x)).toBeLessThan(8);
  expect(goal.x+goal.width).toBeLessThanOrEqual(396);
 }
 await expect(page.locator('.vx-profile-card-more')).toHaveCount(1);
 await expect(page.locator('.vx-profile-tab-rail [role=tab]')).toHaveCount(4);
 await root.evaluate(el=>el.scrollTop=0);
 await expect(motion).toHaveAttribute('data-state','expanded');
 await expect.poll(()=>blur.evaluate(el=>+getComputedStyle(el).opacity)).toBeLessThan(.05);
});

test('VEYRA expanded elastic drag stretches softly and restores without changing scroll timeline',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await telegram(page,10,false,true);await page.goto('/');
 await page.locator('.feed-photo .hero-name').click();
 const root=page.locator('.vx-profile-scroller'),photo=page.locator('.vx-profile-hero-photo');
 await root.evaluate(el=>{el.scrollTop=0});
 const sendTouch=async(type,y)=>{
  await root.evaluate((el,[kind,clientY])=>{
   const touch=new Touch({identifier:1,target:el,clientX:192,clientY});
   el.dispatchEvent(new TouchEvent(kind,{bubbles:true,cancelable:true,
    touches:kind==='touchend'?[]:[touch],changedTouches:[touch],
    targetTouches:kind==='touchend'?[]:[touch]}));
  },[type,y]);
 };
 await sendTouch('touchstart',250);
 await sendTouch('touchmove',350);
 await expect.poll(()=>photo.evaluate(el=>parseFloat(getComputedStyle(el).scale)),{timeout:2000}).toBeGreaterThan(1.005);
 const pull=await root.evaluate(el=>({
  css:getComputedStyle(el).getPropertyValue('--vx-elastic-pull'),
  scroll:el.scrollTop
 }));
 expect(parseFloat(pull.css)).toBeGreaterThan(7);
 expect(pull.scroll).toBeLessThan(2);
 await sendTouch('touchend',350);
 await expect.poll(()=>photo.evaluate(el=>parseFloat(getComputedStyle(el).scale)),{timeout:3000}).toBeLessThan(1.001);
 await expect.poll(()=>root.evaluate(el=>parseFloat(getComputedStyle(el).getPropertyValue('--vx-elastic-pull'))),{timeout:3000}).toBe(0);
 await expect(page.locator('.vx-profile-motion')).toHaveAttribute('data-state','expanded');
});

test('VEYRA final visual: halo only when compact, early circle, goal below city, spaced detail',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await telegram(page,10,false,true);await page.goto('/');
 await page.locator('.feed-photo .hero-name').click();
 const root=page.locator('.vx-profile-scroller'),hero=page.locator('.vx-profile-hero-photo');
 await expect(page.locator('body > .vx-member-native-header')).toBeVisible();
 const halo=()=>page.evaluate(()=>{const header=document.querySelector('body > .vx-member-native-header');return header?getComputedStyle(header,'::before').content:'unknown'});
 await expect.poll(halo).toBe('none');
 const lip=page.locator('.vx-profile-sheet-lip');
 const layers=await page.evaluate(()=>({
  lip:Number(getComputedStyle(document.querySelector('.vx-profile-sheet-lip')).zIndex),
  hero:Number(getComputedStyle(document.querySelector('.vx-profile-hero-photo')).zIndex),
  radius:getComputedStyle(document.querySelector('.vx-profile-sheet-lip')).borderTopLeftRadius
 }));
 expect(layers.lip).toBeGreaterThan(layers.hero);
 expect(parseFloat(layers.radius)).toBeGreaterThanOrEqual(30);
 const distance=await root.evaluate(el=>el.querySelector('.vx-profile-open-spacer').offsetHeight-
  parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height')));
 await root.evaluate((el,y)=>{el.scrollTop=y},distance*.42);
 await expect.poll(()=>hero.evaluate(el=>getComputedStyle(el).borderTopLeftRadius),{timeout:3000}).toBe('50%');
 await root.evaluate((el,y)=>{el.scrollTop=y},distance);
 await expect(page.locator('.vx-profile-motion')).toHaveAttribute('data-state','compact');
 await expect.poll(halo,{timeout:3000}).toBe('none');
 const city=await page.locator('.vx-profile-location').boundingBox();
 const goal=await page.locator('.vx-profile-goal').boundingBox();
 expect(goal.y).toBeGreaterThan(city.y+19);
 const detail=page.locator('.vx-profile-goal-copy');
 const caption=await detail.locator('small').boundingBox();
 const value=await detail.locator('strong').boundingBox();
 expect(value.y).toBeGreaterThan(caption.y+10);
 await expect(page.locator('.vx-profile-card-more')).toHaveCount(1);
});

test('VEYRA Motion 5 keeps photo rim with the moving hero and exposes four icon tabs',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await telegram(page,10,false,true);await page.goto('/');
 await page.locator('.feed-photo .hero-name').click();
 const root=page.locator('.vx-profile-scroller'),hero=page.locator('.vx-profile-hero-photo');
 const rim=hero.locator('.vx-profile-photo-morph-rim');
 await expect(rim).toHaveCount(1);
 const tabs=page.getByRole('tablist',{name:'Разделы анкеты'});
 await expect(tabs.getByRole('tab',{name:'О себе'})).toHaveAttribute('aria-selected','true');
 await expect(tabs.locator('.vx-tab-icon')).toHaveCount(4);
 await expect(page.locator('.vx-profile-location .veyra-country-flag-round')).toHaveCount(1);
 const distance=await root.evaluate(el=>el.querySelector('.vx-profile-open-spacer').offsetHeight-
  parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height')));
 await root.evaluate((el,scroll)=>el.scrollTop=scroll,distance*.31);
 await expect.poll(()=>hero.evaluate(el=>getComputedStyle(el).borderTopLeftRadius)).toBe('50%');
 await expect.poll(()=>rim.evaluate(el=>parseFloat(getComputedStyle(el).opacity))).toBeGreaterThan(.25);
 const imageBounds=await hero.boundingBox(),rimBounds=await rim.boundingBox();
 expect(Math.abs(imageBounds.x-rimBounds.x)).toBeLessThan(2);
 expect(Math.abs(imageBounds.width-rimBounds.width)).toBeLessThan(3);
 await root.evaluate((el,scroll)=>el.scrollTop=scroll,distance);
 await expect.poll(()=>rim.evaluate(el=>parseFloat(getComputedStyle(el).opacity))).toBeGreaterThan(.97);
 const rounded=await page.locator('.vx-profile-location .veyra-country-flag-round').evaluate(el=>getComputedStyle(el).borderRadius);
 expect(rounded).toContain('50%');
 await expect(page.locator('.vx-member-native-header')).toHaveCount(1);
});

test('Dragging from photo thumbnails changes the horizontal tab without opening the gallery',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await telegram(page,10,false,true);await page.goto('/');
 await page.locator('.feed-photo .hero-name').click();
 const root=page.locator('.vx-profile-scroller');
 const distance=await root.evaluate(el=>el.querySelector('.vx-profile-open-spacer').offsetHeight-
  parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height')));
 await root.evaluate((el,y)=>el.scrollTop=y,distance);
 const tabs=page.getByRole('tablist',{name:'Разделы анкеты'});
 await tabs.getByRole('tab',{name:'Фото'}).click();
 await expect(tabs.getByRole('tab',{name:'Фото'})).toHaveAttribute('aria-selected','true');
 const tile=page.locator('.vx-profile-photos-grid button').first();
 await expect(tile).toBeVisible();
 const box=await tile.boundingBox();
 const viewport=await page.locator('.vx-profile-swipe-viewport').boundingBox();
 // Start ON the first photo, then drag RIGHT towards the previous tab.
 // Keep the pointer inside the WebView for the entire gesture. Dragging
 // outside the 390px viewport cancels the native Embla pointer gesture.
 const startX=box.x+box.width*.7, y=box.y+box.height*.5;
 await page.mouse.move(startX,y);
 await page.mouse.down();
 await page.mouse.move(viewport.x+viewport.width-27,y,{steps:16});
 await page.mouse.up();
 await expect.poll(()=>tabs.getByRole('tab',{name:'О себе'}).getAttribute('aria-selected'),
  {timeout:4000}).toBe('true');
 await expect(page.locator('.vx-profile-gallery')).toHaveCount(0);
});
