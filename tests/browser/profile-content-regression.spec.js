import {test, expect} from '@playwright/test';
import {initData, env} from '../helpers.js';

for (const fallback of [false, true]) {
  test.describe(`profile content scroll (${fallback ? 'JS' : 'native when available'})`, () => {
    test.use({hasTouch: true, viewport: {width: 390, height: 844}});

    test('release below the header preserves the stopped content position', async ({page}) => {
      await page.route('https://telegram.org/**', route => route.fulfill({
        status: 200, contentType: 'application/javascript', body: '',
      }));
      await page.addInitScript(({data, fallback}) => {
        if (fallback) window.ScrollTimeline = undefined;
        window.Telegram = {WebApp: {
          initData: data, initDataUnsafe: {user: {language_code: 'ru'}},
          safeAreaInset: {top: 0, bottom: 0}, contentSafeAreaInset: {top: 0, bottom: 0},
          ready() {}, expand() {}, setHeaderColor() {}, setBackgroundColor() {},
        }};
      }, {data: initData(10, env.USER_BOT_TOKEN), fallback});
      await page.goto('/');
      await page.locator('.bottom-nav').getByRole('button', {name: 'профиль'}).click();
      const scroll = page.locator('.vx-own-member .vx-profile-scroller');
      await expect(scroll).toBeVisible();
      // A deterministic long active tab: this test targets gesture ownership,
      // independently of how many interests happen to be in the seed database.
      const distance = await scroll.evaluate(el => {
        const filler = document.createElement('div');
        filler.style.height = '1400px';
        filler.setAttribute('aria-hidden', 'true');
        el.querySelector('.vx-profile-swipe-page[aria-hidden="false"]').append(filler);
        return el.querySelector('.vx-profile-open-spacer').offsetHeight -
          parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height'));
      });
      await expect.poll(() => scroll.evaluate(el => el.scrollHeight - el.clientHeight)).toBeGreaterThan(distance + 500);
      await scroll.evaluate((el, y) => { el.scrollTop = y; }, distance + 250);
      const cdp = await page.context().newCDPSession(page);
      try {
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: 200, y: 600}]});
        for (let step = 1; step <= 8; step++) {
          await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: 200, y: 600 - step * 8}]});
          await page.waitForTimeout(20);
        }
        // Stop the finger before release to separate an application snap
        // from legitimate native momentum.
        await page.waitForTimeout(200);
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: 200, y: 536}]});
        const before = await scroll.evaluate(el => el.scrollTop);
        expect(before).toBeGreaterThan(distance + 200);
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
        await page.waitForTimeout(800);
        const after = await scroll.evaluate(el => el.scrollTop);
        expect(Math.abs(after - before), `content position ${before} -> ${after}`).toBeLessThanOrEqual(4);
      } finally {
        await cdp.detach();
      }
    });
  });
}
