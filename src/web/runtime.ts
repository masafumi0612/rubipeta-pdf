// Web 版の runtime：拡張の browser.runtime と同じ形の、使うところだけ。
// 拡張では offscreen document の中の Worker に読みを問い合わせるが、Web 版はページから Worker に直接問い合わせる
import { isReadingRequest } from '@/messaging/validate';
import type { WorkerClient } from '@/messaging/worker';

import { createEvent, type WebEvent } from './events';

/** Web 版の拡張の ID の代わり（拡張から来たメッセージかを見るところで使う） */
export const WEB_RUNTIME_ID = 'rubipeta-pdf-web';
/** 設定の画面を開くタブの名前。同じ名前なら、開いている設定の画面を使い回す */
export const OPTIONS_TARGET = 'rubipeta-pdf-options';
/** 設定の画面のページ */
const OPTIONS_PAGE = 'options.html';

/** runtime を作るのに使うもの */
export interface WebRuntimeDeps {
  /** ページの置き場所の一番上（ビルドの base） */
  readonly baseUrl: URL;
  /** 版（package.json の version） */
  readonly version: string;
  /**
   * 新しいタブを開く（ふつうは window.open）。
   * @param url 開く URL
   * @param target タブの名前
   */
  readonly openTab: (url: string, target: string) => void;
  /**
   * 読みを問い合わせる Worker を立ち上げる。初めて問い合わせるときに1回だけ呼ぶ。
   * @returns Worker に問い合わせるもの
   */
  readonly connectWorker: () => WorkerClient;
}

/** manifest の、使うところだけ */
export interface WebManifest {
  readonly name: string;
  readonly version: string;
}

/** Web 版の runtime */
export interface WebRuntime {
  readonly id: string;
  /**
   * 置き場所の中のパスを URL にする。
   * @param path パス（先頭の / はあってもなくてもよい）
   * @returns URL
   */
  getURL(path: string): string;
  /**
   * manifest を返す。
   * @returns manifest の、使うところだけ
   */
  getManifest(): WebManifest;
  /** 設定の画面を開く */
  openOptionsPage(): Promise<void>;
  /**
   * 開いている画面を探す。offscreen document があるふりをして、作らずに済ませる。
   * @returns いつも1つ
   */
  getContexts(): Promise<readonly object[]>;
  /**
   * 読みの問い合わせを Worker に渡す。ほかのメッセージは受け取る先がないので undefined を返す。
   * @param message 送るもの
   * @returns Worker の返事
   */
  sendMessage(message: unknown): Promise<unknown>;
  /** ほかの画面からのメッセージ。Web 版には送り手がいないので来ない */
  readonly onMessage: WebEvent<unknown[]>;
}

/**
 * Web 版の runtime を作る。
 * @param deps 置き場所・版・タブの開き方・Worker の立ち上げ方
 * @returns runtime
 */
export function createRuntime(deps: WebRuntimeDeps): WebRuntime {
  let client: WorkerClient | undefined;
  const getURL = (path: string): string => new URL(path.replace(/^\/+/u, ''), deps.baseUrl).href;
  return {
    id: WEB_RUNTIME_ID,
    getURL,
    getManifest: () => ({ name: 'rubipeta-pdf', version: deps.version }),
    openOptionsPage: async () => {
      deps.openTab(getURL(OPTIONS_PAGE), OPTIONS_TARGET);
      return Promise.resolve();
    },
    getContexts: async () => Promise.resolve([{}]),
    sendMessage: async (message) => {
      if (!isReadingRequest(message)) {
        return undefined;
      }
      client ??= deps.connectWorker();
      return client.request(message);
    },
    onMessage: createEvent<unknown[]>().event,
  };
}
