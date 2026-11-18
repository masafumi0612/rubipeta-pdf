// Web 版の画面で `wxt/browser` の代わりに使う、拡張の API の代わり（vite.web.config.ts が差し替える）。
// 今のコードが使うところだけを、Web ページでできる形で持つ。拡張にしかないもの（権限・自動で開く・タブの操作）は「ない」と答える
import type { browser as ExtensionBrowser } from 'wxt/browser';

import ReadingWorker from '@/entrypoints/offscreen/reading.worker?worker';
import { READING_TIMEOUT_MS } from '@/messaging/timeout';
import { createWorkerClient } from '@/messaging/worker';

import packageJson from '../../package.json';
import messages from '../../public/_locales/ja/messages.json';
import { createEvent } from './events';
import { formatMessage } from './i18n';
import { createIndexedDbBackend } from './indexed-db';
import { createRuntime } from './runtime';
import { type ChangeChannel, createStorage } from './storage';

/** ほかのタブと、保存した値が変わったことを伝え合う道の名前 */
const STORAGE_CHANNEL = 'rubipeta-pdf-storage';

/**
 * ほかのタブに伝える道を作る。BroadcastChannel がないブラウザでは、同じタブの中だけで伝える。
 * @returns 道。なければ undefined
 */
function openChannel(): ChangeChannel | undefined {
  return typeof BroadcastChannel === 'function' ? new BroadcastChannel(STORAGE_CHANNEL) : undefined;
}

/**
 * 新しいタブを開く。
 * @param url 開く URL
 * @param target タブの名前
 */
function openTab(url: string, target: string): void {
  window.open(url, target);
}

const runtime = createRuntime({
  baseUrl: new URL(import.meta.env.BASE_URL, location.origin),
  version: packageJson.version,
  openTab,
  connectWorker: () => createWorkerClient(new ReadingWorker(), READING_TIMEOUT_MS),
});

/** 権限が変わったとき。Web 版の権限は変わらないので来ない */
const neverChanged = createEvent<unknown[]>().event;

/** 拡張の API の代わり。型は拡張の API に合わせる（使うところだけを持つ） */
export const browser = {
  i18n: {
    getMessage: (name: string, substitutions?: string | string[]) =>
      formatMessage(messages, name, substitutions),
    getUILanguage: () => 'ja',
  },
  storage: createStorage(createIndexedDbBackend(), openChannel()),
  runtime,
  // offscreen document は作らない（runtime.getContexts が、あるふりをする）
  offscreen: { createDocument: async () => Promise.resolve() },
  // サイトを読む権限はない（自動で開く仕組みがないので要らない）
  permissions: {
    contains: async () => Promise.resolve(false),
    request: async () => Promise.resolve(false),
    onAdded: neverChanged,
    onRemoved: neverChanged,
  },
  extension: { isAllowedFileSchemeAccess: async () => Promise.resolve(false) },
  tabs: {
    create: async ({ url }: { url?: string }) => {
      if (url !== undefined) {
        openTab(url, '_blank');
      }
      return Promise.resolve({});
    },
    // タブが分からないので、標準の表示で開くときのルール（redirect/skip.ts）は作らない
    getCurrent: async () => Promise.resolve(undefined),
  },
} as unknown as typeof ExtensionBrowser;
