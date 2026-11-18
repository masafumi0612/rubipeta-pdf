import { join } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { TEST_PDF_DIR } from '../fixtures';

/** 見本の PDF と、その1ページ目に付くはずのルビ */
const SAMPLE = { file: 'sample.pdf', base: '庭', reading: 'にわ' };
/** ルビが出るまで待つ時間の上限（ミリ秒）。辞書の読み込みを含む */
const RUBY_TIMEOUT_MS = 30_000;

/**
 * リーダーを開き、見本の PDF を選ぶ。
 * @param page 画面
 */
async function openSample(page: Page): Promise<void> {
  await page.goto('viewer.html');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'ファイルを開く' }).click(),
  ]);
  await chooser.setFiles(join(TEST_PDF_DIR, SAMPLE.file));
}

/**
 * 1ページ目の、見本のルビを引く（同じ字は2か所にある）。
 * @param page リーダーの画面
 * @returns ルビ
 */
function sampleRuby(page: Page): ReturnType<Page['locator']> {
  return page.locator(`.page[data-page-number="1"] .ruby-layer [data-base="${SAMPLE.base}"]`);
}

/**
 * Web 版が IndexedDB に残した、ルビの量の設定を読む（src/web/indexed-db.ts と同じ名前で開く）。
 * @param page Web 版の画面
 * @returns 残っている段階。なければ undefined
 */
async function storedLevel(page: Page): Promise<unknown> {
  return page.evaluate(
    async () =>
      new Promise<unknown>((resolve, reject) => {
        const opening = indexedDB.open('rubipeta-pdf', 1);
        opening.addEventListener('error', () => {
          reject(new Error('IndexedDB を開けない'));
        });
        opening.addEventListener('success', () => {
          const reading = opening.result
            .transaction('items', 'readonly')
            .objectStore('items')
            .get('sync:level');
          reading.addEventListener('error', () => {
            reject(new Error('IndexedDB を読めない'));
          });
          reading.addEventListener('success', () => {
            resolve(reading.result);
          });
        });
      }),
  );
}

test('一番上の URL を開いたとき、リーダーに移る', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveURL(/\/viewer\.html$/u);
  await expect(page.getByRole('button', { name: 'ファイルを開く' })).toBeVisible();
});

test('PDF を選んだとき、拡張と同じく、その場でルビが付く', async ({ page }) => {
  await openSample(page);
  await expect(sampleRuby(page).first()).toHaveText(SAMPLE.reading, { timeout: RUBY_TIMEOUT_MS });
});

test('設定の画面には、自動で開く場所と、PDF を選んで開く場所がない', async ({ page }) => {
  await page.goto('options.html');
  await expect(
    page.getByRole('heading', { name: 'ルビの量：ルビを付けない漢字の範囲' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'PDF を開いたら、自動でルビを付ける' }),
  ).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'PDF を選んでルビ付きで開く' })).toHaveCount(0);
});

test('設定の画面で変えた設定は、読み込み直しても残る', async ({ page }) => {
  await page.goto('options.html');
  await page.getByRole('radio', { name: /^3年まで/ }).check();
  // 保存は後から終わるので、IndexedDB に書き終えてから読み込み直す（拡張の E2E も、保存先を見てから確かめる）
  await expect.poll(async () => storedLevel(page)).toBe('g3');
  await page.reload();
  await expect(page.getByRole('radio', { name: /^3年まで/ })).toBeChecked();
});

test('別のタブの設定の画面でルビの量を変えたとき、開いているリーダーに伝わる', async ({
  page,
  context,
}) => {
  await openSample(page);
  await expect(sampleRuby(page).first()).toHaveText(SAMPLE.reading, { timeout: RUBY_TIMEOUT_MS });
  const options = await context.newPage();
  await options.goto('options.html');
  await options.getByRole('radio', { name: /^3年まで/ }).check();
  await expect(page.getByRole('button', { name: /^ルビ：3年まで/ })).toBeVisible();
  // 「庭」は3年までに習うので、ルビが外れる
  await expect(sampleRuby(page)).toHaveCount(0);
});

test('「印刷・保存」を押したとき、ルビ付きの PDF を作って窓を出す', async ({ page }) => {
  await openSample(page);
  await expect(sampleRuby(page).first()).toHaveText(SAMPLE.reading, { timeout: RUBY_TIMEOUT_MS });
  await page.getByRole('button', { name: '印刷・保存', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'ルビ付きの PDF ができました' });
  await expect(dialog).toBeVisible({ timeout: RUBY_TIMEOUT_MS });
  await expect(dialog.getByRole('button', { name: '保存' })).toBeVisible();
});

test('ライセンスの画面で、同梱した文書を読める', async ({ page }) => {
  await page.goto('licenses.html');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ライセンスと出典');
  await expect(page.getByRole('region', { name: 'ルビぺたPDF' })).toContainText('MIT');
});
