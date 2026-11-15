// Web 版の保存の部品：IndexedDB に置く。その端末の、そのブラウザの、このサイトの中にだけ残る
import type { AreaName, StorageBackend } from './storage';

/** データベースの名前と版 */
const DB_NAME = 'yomigana-pdf';
const DB_VERSION = 1;
/** 値を置く入れ物。キーは `場所:キー` */
const STORE_NAME = 'items';
/** キーの範囲の終わり（`場所:` で始まるキーをすべて含める） */
const KEY_END = '￿';

/**
 * IndexedDB の頼みごとが終わるのを待つ。
 * @param request 頼みごと
 * @returns 結果
 */
async function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => {
      resolve(request.result);
    });
    request.addEventListener('error', () => {
      reject(request.error ?? new Error('IndexedDB の頼みごとが失敗しました'));
    });
  });
}

/**
 * IndexedDB に置く保存の部品を作る。データベースは初めて使うときに開く。
 * @param factory IndexedDB（ふつうは globalThis.indexedDB）
 * @returns 保存の部品
 */
export function createIndexedDbBackend(factory: IDBFactory = indexedDB): StorageBackend {
  let opening: Promise<IDBDatabase> | undefined;
  const open = async (): Promise<IDBDatabase> => {
    opening ??= new Promise((resolve, reject) => {
      const request = factory.open(DB_NAME, DB_VERSION);
      request.addEventListener('upgradeneeded', () => {
        request.result.createObjectStore(STORE_NAME);
      });
      request.addEventListener('success', () => {
        resolve(request.result);
      });
      request.addEventListener('error', () => {
        opening = undefined;
        reject(request.error ?? new Error('IndexedDB を開けませんでした'));
      });
    });
    return opening;
  };
  const rangeOf = (area: AreaName): IDBKeyRange =>
    IDBKeyRange.bound(`${area}:`, `${area}:${KEY_END}`);

  return {
    async readAll(area) {
      const store = (await open()).transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
      const [keys, values] = await Promise.all([
        done(store.getAllKeys(rangeOf(area))),
        done(store.getAll(rangeOf(area))),
      ]);
      return new Map(
        keys.map((key, index) => [
          typeof key === 'string' ? key.slice(area.length + 1) : '',
          values[index] as unknown,
        ]),
      );
    },
    async write(area, changes) {
      const transaction = (await open()).transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      for (const [key, value] of changes) {
        if (value === undefined) {
          store.delete(`${area}:${key}`);
        } else {
          store.put(value, `${area}:${key}`);
        }
      }
      await new Promise<void>((resolve, reject) => {
        transaction.addEventListener('complete', () => {
          resolve();
        });
        transaction.addEventListener('error', () => {
          reject(transaction.error ?? new Error('IndexedDB に書けませんでした'));
        });
        transaction.addEventListener('abort', () => {
          reject(transaction.error ?? new Error('IndexedDB に書くのが止まりました'));
        });
      });
    },
  };
}
