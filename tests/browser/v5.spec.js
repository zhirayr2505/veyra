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
 await expect(page.getByRole('button',{name:'посмотреть анкету'})).toBeEnabled();
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
 await page.getByRole('button',{name:'посмотреть анкету'}).click();
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
  await page.getByRole('button',{name:'Добавить фото'}).click();
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
 expect(Math.abs(during.y-box.y)).toBeLessThan(1);
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
 await page.locator('.feed-photo').click({position:{x:box.width*.5,y:box.height*.42}});
 await expect(page.locator('.member')).toBeVisible();
 await page.locator('.member .top-header button.back').click();
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
 await expect(page.locator('.member')).toBeVisible();
 await page.locator('.member .top-header button.back').click();
 await expect(page.locator('.vx-for_you .vx-people')).toBeVisible();
 await tabs.getByRole('tab',{name:'Рядом'}).click();
 await expect(page.locator('.vx-nearby .vx-people .vx-person').first()).toBeVisible();
 await expect(page.locator('.vx-nearby .vx-person-caption small').first()).toContainText('км');
 await expect(page.locator('.feed-photo')).toBeHidden();
 await page.locator('.bottom-nav').getByRole('button',{name:'знакомства'}).click();
 await expect(page.locator('.feed-photo')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});

test('VEYRA nearby sends a genuine like with button only and keeps bottom navigation intact',async({page})=>{
 await telegram(page,10);await page.goto('/');
 const likes=[];
 let backgroundFeedRequests=0;
 page.on('request',request=>{
  const url=new URL(request.url());
  if(url.pathname==='/api/reactions'&&request.method()==='POST')likes.push(request.postDataJSON());
  if(url.pathname==='/api/feed'&&url.searchParams.get('mode')==='discover')backgroundFeedRequests++;
 });
 await page.locator('.bottom-nav').getByRole('button',{name:'поиск'}).click();
 await page.getByRole('tab',{name:'Рядом'}).click();
 await expect(page.locator('.vx-nearby .vx-person-like').first()).toBeVisible();
 const before=backgroundFeedRequests;
 await page.locator('.vx-nearby .vx-person-like').first().click();
 await expect.poll(()=>likes.length).toBe(1);
 expect(backgroundFeedRequests).toBe(before);
 expect(likes[0].kind).toBe('like');
 await expect(page.locator('.bottom-nav button')).toHaveCount(5);
});


test('V5 Симпатии displays exactly two tabs, real matches, profiles, and incoming cards',async({page})=>{
 await telegram(page,10);await page.goto('/');
 await page.locator('.bottom-nav').getByRole('button',{name:'симпатии'}).click();
 await expect(page.locator('.likes-v2 [role="tab"]')).toHaveCount(2);
 await expect(page.getByRole('tab',{name:/Мэтчи/})).toHaveAttribute('aria-selected','true');
 await expect(page.locator('.likes-v2 .likes-gallery .likes-person').first()).toBeVisible();
 await page.locator('.likes-v2 .likes-person-photo').first().click();
 await expect(page.locator('.member')).toBeVisible();
 await page.locator('.member .top-header button.back').click();
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
 await expect(page.locator('.v2-screen-header .logo')).toHaveAttribute('src','/veyra-design/veyra-wordmark-purple.svg');
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
 await page.getByRole('button',{name:'Открыть кошелёк VEYS'}).click();
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
