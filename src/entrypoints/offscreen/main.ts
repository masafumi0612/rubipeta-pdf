// offscreen document：中の Worker が辞書を1回だけ読み込み、全タブの読みの問い合わせに答える。
// しばらく問い合わせがなければ、service worker に知らせる（閉じるかは service worker が決める。idle-dictionary.ts）
import { browser } from 'wxt/browser';

import { createLogger } from '@/log';
import { createIdleWatch, OFFSCREEN_IDLE_MESSAGE } from '@/messaging/idle-dictionary';
import { createOffscreenListener } from '@/messaging/offscreen';
import { READING_TIMEOUT_MS } from '@/messaging/timeout';
import { createWorkerClient } from '@/messaging/worker';

import ReadingWorker from './reading.worker?worker';

const log = createLogger('offscreen');
const client = createWorkerClient(new ReadingWorker(), READING_TIMEOUT_MS);
const idleWatch = createIdleWatch({
  now: () => Date.now(),
  every: (callback, intervalMs) => setInterval(callback, intervalMs),
  onIdle: () => {
    browser.runtime.sendMessage(OFFSCREEN_IDLE_MESSAGE).catch((error: unknown) => {
      log.error('しばらく使っていないことを知らせられませんでした', error);
    });
  },
});
browser.runtime.onMessage.addListener(
  createOffscreenListener(client, browser.runtime.id, () => {
    idleWatch.touch();
  }),
);
