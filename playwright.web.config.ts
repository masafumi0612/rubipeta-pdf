import { defineConfig } from '@playwright/test';

/** Web 版を出す場所。GitHub Pages と同じく、一番上ではない所に置いて確かめる */
const BASE_PATH = '/yomigana-pdf/';
const PORT = 4173;

// ビルドした Web 版（.output/web）を、ふつうの Web ページとして Chromium で開いて確かめる（`npm run test:e2e:web`）
export default defineConfig({
  testDir: 'tests/e2e/web',
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${String(PORT)}${BASE_PATH}`,
    // CI には、ヘッドレス専用の版（headless shell）を入れず、ふつうの Chromium だけを入れている
    channel: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: {
    // vite preview は辞書の .gz に Content-Encoding を付けてしまうので、Pages と同じように返す自前のサーバーを使う
    command: `node scripts/serve-web.ts ${String(PORT)} ${BASE_PATH}`,
    url: `http://127.0.0.1:${String(PORT)}${BASE_PATH}viewer.html`,
    reuseExistingServer: false,
  },
});
