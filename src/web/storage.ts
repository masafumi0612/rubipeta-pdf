// Web 版の保存先：拡張の browser.storage と同じ形で、中身は差し込める保存の部品（IndexedDB など）に置く
import { createLogger } from '@/log';

import { createEvent, type WebEvent } from './events';

/** 保存の場所の名前。拡張と同じく3つ持つ（Web 版では、どれも同じ端末の同じブラウザの中に残る） */
export type AreaName = 'local' | 'sync' | 'session';

/** 1つのキーの変わり方（拡張の storage.onChanged と同じ形） */
export interface StorageChange {
  readonly oldValue?: unknown;
  readonly newValue?: unknown;
}

/** キーごとの変わり方 */
export type StorageChanges = Record<string, StorageChange>;

/** 値を実際に残す部品 */
export interface StorageBackend {
  /**
   * 場所の値をすべて読む。
   * @param area 場所
   * @returns キーと値
   */
  readAll(area: AreaName): Promise<Map<string, unknown>>;
  /**
   * 値を書く。undefined のキーは消す。
   * @param area 場所
   * @param changes 書く値
   */
  write(area: AreaName, changes: ReadonlyMap<string, unknown>): Promise<void>;
}

/** ほかのタブに変わったことを伝える道（BroadcastChannel と同じ形） */
export interface ChangeChannel {
  /**
   * ほかのタブに送る。
   * @param message 送るもの
   */
  postMessage(message: unknown): void;
  /**
   * ほかのタブから受け取る。
   * @param type 受け取る種類
   * @param listener 受け取ったときに呼ぶ
   */
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
}

/** get に渡すもの（拡張と同じく、なし・キー・キーの並び・既定値つきのキー） */
export type StorageKeys = string | readonly string[] | Readonly<Record<string, unknown>> | null;

/** 1つの保存の場所（拡張の storage.local などと同じ形の、使うところだけ） */
export interface WebStorageArea {
  /**
   * 値を読む。
   * @param keys 読むキー。なしか null なら全部。既定値つきなら、ないキーは既定値
   * @returns キーと値
   */
  get(keys?: StorageKeys): Promise<Record<string, unknown>>;
  /**
   * 値を書く。
   * @param items キーと値
   */
  set(items: Readonly<Record<string, unknown>>): Promise<void>;
  /**
   * 値を消す。
   * @param keys 消すキー
   */
  remove(keys: string | readonly string[]): Promise<void>;
  /** この場所の値をすべて消す */
  clear(): Promise<void>;
  /** この場所の値が変わったとき */
  readonly onChanged: WebEvent<[StorageChanges]>;
}

/** 保存の場所の全体（拡張の browser.storage と同じ形の、使うところだけ） */
export interface WebStorage {
  readonly local: WebStorageArea;
  readonly sync: WebStorageArea;
  readonly session: WebStorageArea;
  /** どこかの場所の値が変わったとき */
  readonly onChanged: WebEvent<[StorageChanges, AreaName]>;
}

/** ほかのタブに送る知らせの種類 */
const CHANGED_TYPE = 'rubipeta-pdf:storage-changed';
const AREAS: readonly AreaName[] = ['local', 'sync', 'session'];

/** ほかのタブに送る知らせ */
interface ChangedMessage {
  readonly type: typeof CHANGED_TYPE;
  readonly area: AreaName;
  readonly changes: StorageChanges;
}

const log = createLogger('web-storage');

/**
 * 拡張の browser.storage と同じ形の保存先を作る。
 * 値を書いたら、同じタブの受け取る関数を呼び、ほかのタブにも伝える（設定の画面で変えた設定を、開いているリーダーに反映するため）。
 * @param backend 値を実際に残す部品
 * @param channel ほかのタブに伝える道。なければ同じタブの中だけ
 * @returns 保存先
 */
export function createStorage(backend: StorageBackend, channel?: ChangeChannel): WebStorage {
  const anyChanged = createEvent<[StorageChanges, AreaName]>();
  const areaChanged = new Map(AREAS.map((area) => [area, createEvent<[StorageChanges]>()]));
  // 読んでから書くので、書くのを1つずつ順に行い、途中で別の書き込みが混ざらないようにする
  let writing: Promise<void> = Promise.resolve();

  const notify = (area: AreaName, changes: StorageChanges): void => {
    areaChanged.get(area)?.emit(changes);
    anyChanged.emit(changes, area);
  };

  channel?.addEventListener('message', (event) => {
    if (isChangedMessage(event.data)) {
      notify(event.data.area, event.data.changes);
    }
  });

  const update = async (area: AreaName, next: ReadonlyMap<string, unknown>): Promise<void> => {
    const run = writing.then(async () => {
      const current = await backend.readAll(area);
      const changes: StorageChanges = {};
      const written = new Map<string, unknown>();
      for (const [key, value] of next) {
        const oldValue = current.get(key);
        if (isSameValue(oldValue, value)) {
          continue;
        }
        written.set(key, value);
        changes[key] = {
          ...(oldValue !== undefined && { oldValue }),
          ...(value !== undefined && { newValue: value }),
        };
      }
      if (written.size === 0) {
        return;
      }
      await backend.write(area, written);
      notify(area, changes);
      try {
        channel?.postMessage({ type: CHANGED_TYPE, area, changes } satisfies ChangedMessage);
      } catch (error) {
        log.error('ほかのタブに、値が変わったことを伝えられませんでした', error);
      }
    });
    // 1つが失敗しても、次の書き込みは進める
    writing = run.catch(() => undefined);
    await run;
  };

  const createArea = (area: AreaName): WebStorageArea => ({
    async get(keys) {
      const stored = await backend.readAll(area);
      return structuredClone(pick(stored, keys));
    },
    async set(items) {
      await update(area, new Map(Object.entries(structuredClone(items))));
    },
    async remove(keys) {
      const list = typeof keys === 'string' ? [keys] : keys;
      await update(area, new Map(list.map((key) => [key, undefined])));
    },
    async clear() {
      const stored = await backend.readAll(area);
      await update(area, new Map([...stored.keys()].map((key) => [key, undefined])));
    },
    onChanged: areaChanged.get(area)?.event ?? createEvent<[StorageChanges]>().event,
  });

  return {
    local: createArea('local'),
    sync: createArea('sync'),
    session: createArea('session'),
    onChanged: anyChanged.event,
  };
}

/**
 * 読んだ値から、頼まれたキーだけを取り出す。
 * @param stored 残っている値
 * @param keys 読むキー
 * @returns キーと値
 */
function pick(
  stored: ReadonlyMap<string, unknown>,
  keys: StorageKeys | undefined,
): Record<string, unknown> {
  if (keys === undefined || keys === null) {
    return Object.fromEntries(stored);
  }
  if (typeof keys === 'string' || Array.isArray(keys)) {
    const list: readonly string[] = typeof keys === 'string' ? [keys] : keys;
    return Object.fromEntries(
      list.filter((key) => stored.has(key)).map((key) => [key, stored.get(key)]),
    );
  }
  const defaults = keys as Readonly<Record<string, unknown>>;
  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [key, stored.get(key) ?? fallback]),
  );
}

/**
 * 同じ値か。拡張と同じく、値が変わらないときは知らせない。保存できる値（JSON の形）だけを比べる。
 * @param a 前の値
 * @param b 新しい値
 * @returns 同じなら true
 */
function isSameValue(a: unknown, b: unknown): boolean {
  return a === b || (a !== undefined && b !== undefined && JSON.stringify(a) === JSON.stringify(b));
}

/**
 * ほかのタブからの知らせか。
 * @param value 受け取ったもの
 * @returns 知らせなら true
 */
function isChangedMessage(value: unknown): value is ChangedMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { type, area, changes } = value as Partial<Record<keyof ChangedMessage, unknown>>;
  return (
    type === CHANGED_TYPE &&
    AREAS.includes(area as AreaName) &&
    typeof changes === 'object' &&
    changes !== null
  );
}
