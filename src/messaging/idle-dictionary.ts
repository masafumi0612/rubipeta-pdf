// しばらく使わないときに、辞書の入った offscreen document を閉じて、メモリを返す（約 130〜200MB）。
// offscreen document は、最後に読みの問い合わせを受けた時刻を覚えて、1 分ごとに見回る。
// 5 分より長く問い合わせがなければ、拡張の service worker に知らせる。service worker は、
// リーダー・設定の画面が1つも開いていないときだけ閉じる（PDF を読んでいる途中では閉じない）。
// 閉じたあとに PDF を開くと、ensureOffscreenDocument が作り直し、辞書を読み込み直す（1〜2 秒）。
import type { browser } from 'wxt/browser';

import { createLogger } from '@/log';

import { OFFSCREEN_PATH } from './offscreen';

/** 問い合わせがないまま、これより長くたったら閉じてよいか聞く（ミリ秒） */
export const IDLE_MS = 5 * 60 * 1000;
/** 見回る間隔（ミリ秒） */
export const CHECK_INTERVAL_MS = 60 * 1000;
/** offscreen document から service worker への知らせの宛先と種類 */
const BACKGROUND_TARGET = 'background';
const OFFSCREEN_IDLE_TYPE = 'offscreen-idle';
/** 辞書を使う画面。これが1つでも開いていれば閉じない */
const READER_PATHS = ['/viewer.html', '/options.html'] as const;

/** しばらく使っていないことの知らせ */
export interface OffscreenIdleMessage {
  readonly target: typeof BACKGROUND_TARGET;
  readonly type: typeof OFFSCREEN_IDLE_TYPE;
}

/** 使っていない時間を見張るもの */
export interface IdleWatch {
  /** 使った（問い合わせを受けた）ことを覚える */
  touch(): void;
}

/** 見張りに使う時計と、知らせる先 */
export interface IdleWatchOptions {
  /** 今の時刻（ミリ秒） */
  readonly now: () => number;
  /** 決まった間隔で呼ぶ */
  readonly every: (callback: () => void, intervalMs: number) => void;
  /** しばらく使っていないときに呼ぶ */
  readonly onIdle: () => void;
}

/** 閉じるのに使う拡張の API */
export interface CloseOffscreenApi {
  readonly runtime: Pick<typeof browser.runtime, 'getContexts' | 'getURL'>;
  readonly offscreen: Pick<typeof browser.offscreen, 'closeDocument'>;
}

const log = createLogger('offscreen');

/** しばらく使っていないことの知らせ（そのまま送る） */
export const OFFSCREEN_IDLE_MESSAGE: OffscreenIdleMessage = {
  target: BACKGROUND_TARGET,
  type: OFFSCREEN_IDLE_TYPE,
};

/**
 * 使っていない時間を見張る（offscreen document の中で使う）。
 * @param options 時計と知らせる先
 * @returns 見張るもの
 */
export function createIdleWatch(options: IdleWatchOptions): IdleWatch {
  let lastUsed = options.now();
  options.every(() => {
    if (options.now() - lastUsed > IDLE_MS) options.onIdle();
  }, CHECK_INTERVAL_MS);
  return {
    touch() {
      lastUsed = options.now();
    },
  };
}

/**
 * しばらく使っていないことの知らせか。
 * @param message 受け取ったもの
 * @returns 知らせなら true
 */
export function isOffscreenIdleMessage(message: unknown): message is OffscreenIdleMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'target' in message &&
    'type' in message &&
    message.target === BACKGROUND_TARGET &&
    message.type === OFFSCREEN_IDLE_TYPE
  );
}

/**
 * 辞書を使う画面が開いていなければ、offscreen document を閉じる（service worker で使う）。
 * @param api 拡張の API
 * @returns 閉じたら true
 */
export async function closeIdleOffscreen(api: CloseOffscreenApi): Promise<boolean> {
  const readers = READER_PATHS.map((path) => api.runtime.getURL(path));
  const tabs = await api.runtime.getContexts({ contextTypes: ['TAB'] });
  const isReading = tabs.some((context) =>
    readers.some((reader) => context.documentUrl?.startsWith(reader) === true),
  );
  if (isReading) return false;
  const offscreens = await api.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [api.runtime.getURL(OFFSCREEN_PATH)],
  });
  if (offscreens.length === 0) return false;
  try {
    await api.offscreen.closeDocument();
    log.info('しばらく使わなかったので、辞書を閉じました');
    return true;
  } catch (error) {
    log.error('辞書の offscreen document を閉じられませんでした', error);
    return false;
  }
}
