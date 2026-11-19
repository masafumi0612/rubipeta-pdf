import { defineConfig } from '@playwright/test';

// 拡張を入れた Chromium で、ビルドした拡張（.output/chrome-mv3）を動かして確かめる
export default defineConfig({
  testDir: 'tests/e2e',
  // Web 版の E2E は別の設定で動かす（playwright.web.config.ts）。
  // 「web/**」と書くと、リポジトリを置いたフォルダの名前に web があるときに全部外れるので、e2e の直下だけを指す
  testIgnore: /[\\/]e2e[\\/]web[\\/]/u,
  // 拡張を入れたブラウザを1つずつ立ち上げるので、並べて動かさない
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'retain-on-failure',
  },
});
