import type { Page } from '@playwright/test';

import { expect, openFromFile, test } from './fixtures';

/** 縦書きの物語（2ページ） */
const VERTICAL_STORY = 'vertical-story.pdf';
/** 画面の倍率 125%（Windows でよく使う倍率） */
const PIXEL_RATIO = 1.25;
/** 紙面を真ん中に寄せると、左が画面の点の途中に来る窓の幅 */
const ODD_WIDTH = 1201;

/**
 * 画面の倍率と窓の大きさを変える。
 * @param page 画面
 * @param width 窓の幅（CSS の画素）
 */
async function emulateScreen(page: Page, width: number): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height: 900,
    deviceScaleFactor: PIXEL_RATIO,
    mobile: false,
  });
}

/**
 * 紙面の中身（枠線の内側）の左と上が、画面の点のどこに来るかを測る。
 * スクロールしていないときの位置にする（スクロールの量は、ブラウザーが画面の点にそろえて動かす）
 * @param page 画面
 * @returns 紙面ごとの、左と上の位置（画面の点）
 */
async function pagePositions(page: Page): Promise<{ x: number; y: number }[]> {
  return page.locator('#viewer-container').evaluate((container) =>
    [...container.querySelectorAll<HTMLElement>('.page')].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: (rect.left + container.scrollLeft + element.clientLeft) * devicePixelRatio,
        y: (rect.top + container.scrollTop + element.clientTop) * devicePixelRatio,
      };
    }),
  );
}

/**
 * 位置が画面の点の境目か（計算の誤差は見逃す）。
 * @param value 位置（画面の点）
 * @returns 境目なら true
 */
function isOnPixel(value: number): boolean {
  return Math.abs(value - Math.round(value)) < 0.01;
}

test('画面の倍率が 125% のとき、紙面の左と上が画面の点の境目に来る', async ({
  page,
  extensionId,
}) => {
  await emulateScreen(page, ODD_WIDTH);
  await openFromFile(page, extensionId, VERTICAL_STORY);
  await expect(page.locator('.page[data-page-number="1"] canvas')).toBeVisible();

  await expect
    .poll(async () => (await pagePositions(page)).every(({ x, y }) => isOnPixel(x) && isOnPixel(y)))
    .toBe(true);
});

test('窓の幅を変えたとき、紙面の位置を画面の点の境目に合わせ直す', async ({
  page,
  extensionId,
}) => {
  await emulateScreen(page, ODD_WIDTH);
  await openFromFile(page, extensionId, VERTICAL_STORY);
  await expect(page.locator('.page[data-page-number="1"] canvas')).toBeVisible();

  await emulateScreen(page, ODD_WIDTH + 2);

  await expect
    .poll(async () => (await pagePositions(page)).every(({ x }) => isOnPixel(x)))
    .toBe(true);
});
