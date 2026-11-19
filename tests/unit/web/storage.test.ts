import { describe, expect, it, vi } from 'vitest';

import {
  type AreaName,
  type ChangeChannel,
  createStorage,
  type StorageBackend,
} from '@/web/storage';

/**
 * 値を Map に置く、テスト用の保存の部品を作る。
 * @returns 保存の部品と、中の Map
 */
function createMapBackend(): StorageBackend & { readonly data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    readAll: async (area: AreaName) =>
      Promise.resolve(
        new Map(
          [...data]
            .filter(([key]) => key.startsWith(`${area}:`))
            .map(([key, value]) => [key.slice(area.length + 1), value]),
        ),
      ),
    write: async (area, changes) => {
      for (const [key, value] of changes) {
        if (value === undefined) {
          data.delete(`${area}:${key}`);
        } else {
          data.set(`${area}:${key}`, value);
        }
      }
      return Promise.resolve();
    },
  };
}

/** テスト用の、ほかのタブに伝える道 */
interface FakeChannel extends ChangeChannel {
  /** 送ったもの */
  readonly sent: unknown[];
  /**
   * ほかのタブから届いたことにする。
   * @param data 届いたもの
   */
  receive(data: unknown): void;
}

/**
 * テスト用の、ほかのタブに伝える道を作る。
 * @returns 道
 */
function createFakeChannel(): FakeChannel {
  const sent: unknown[] = [];
  const listeners: ((event: MessageEvent<unknown>) => void)[] = [];
  return {
    sent,
    postMessage: (message) => {
      sent.push(message);
    },
    addEventListener: (_type, listener) => {
      listeners.push(listener);
    },
    receive: (data) => {
      for (const listener of listeners) {
        listener(new MessageEvent('message', { data }));
      }
    },
  };
}

describe('createStorage の get', () => {
  it('キーを渡さないとき、その場所の値をすべて返す', async () => {
    const storage = createStorage(createMapBackend());
    await storage.sync.set({ level: 'grade3', autoRedirect: true });
    await storage.local.set({ welcome: true });

    expect(await storage.sync.get()).toEqual({ level: 'grade3', autoRedirect: true });
  });

  it('キーを1つ渡したとき、あればその値だけを返す', async () => {
    const storage = createStorage(createMapBackend());
    await storage.sync.set({ level: 'grade3', autoRedirect: true });

    expect(await storage.sync.get('level')).toEqual({ level: 'grade3' });
    expect(await storage.sync.get('missing')).toEqual({});
  });

  it('キーの並びを渡したとき、あるものだけを返す', async () => {
    const storage = createStorage(createMapBackend());
    await storage.sync.set({ level: 'grade3', autoRedirect: true });

    expect(await storage.sync.get(['level', 'missing'])).toEqual({ level: 'grade3' });
  });

  it('既定値つきで渡したとき、ないキーは既定値にする', async () => {
    const storage = createStorage(createMapBackend());
    await storage.sync.set({ level: 'grade3' });

    expect(await storage.sync.get({ level: 'all', autoRedirect: false })).toEqual({
      level: 'grade3',
      autoRedirect: false,
    });
  });

  it('読んだ値を書き換えても、残っている値は変わらない', async () => {
    const storage = createStorage(createMapBackend());
    await storage.local.set({ list: ['a'] });
    const read = await storage.local.get('list');
    (read.list as string[]).push('b');

    expect(await storage.local.get('list')).toEqual({ list: ['a'] });
  });
});

describe('createStorage の set・remove・clear', () => {
  it('消したキーは読めなくなり、ほかのキーは残る', async () => {
    const storage = createStorage(createMapBackend());
    await storage.local.set({ a: 1, b: 2 });
    await storage.local.remove('a');

    expect(await storage.local.get()).toEqual({ b: 2 });
  });

  it('clear のとき、その場所だけを空にする', async () => {
    const storage = createStorage(createMapBackend());
    await storage.local.set({ a: 1 });
    await storage.sync.set({ b: 2 });
    await storage.local.clear();

    expect(await storage.local.get()).toEqual({});
    expect(await storage.sync.get()).toEqual({ b: 2 });
  });
});

describe('createStorage の onChanged', () => {
  it('値を書いたとき、前と後の値を、その場所と全体の受け取る関数に伝える', async () => {
    const storage = createStorage(createMapBackend());
    await storage.sync.set({ level: 'all' });
    const onArea = vi.fn();
    const onAny = vi.fn();
    storage.sync.onChanged.addListener(onArea);
    storage.onChanged.addListener(onAny);
    await storage.sync.set({ level: 'grade3' });

    const changes = { level: { oldValue: 'all', newValue: 'grade3' } };
    expect(onArea).toHaveBeenCalledWith(changes);
    expect(onAny).toHaveBeenCalledWith(changes, 'sync');
  });

  it('同じ値を書いたとき、知らせない', async () => {
    const storage = createStorage(createMapBackend());
    await storage.sync.set({ dictionary: [['林', 'はやし']] });
    const listener = vi.fn();
    storage.onChanged.addListener(listener);
    await storage.sync.set({ dictionary: [['林', 'はやし']] });

    expect(listener).not.toHaveBeenCalled();
  });

  it('値を消したとき、前の値だけを伝える', async () => {
    const storage = createStorage(createMapBackend());
    await storage.local.set({ a: 1 });
    const listener = vi.fn();
    storage.onChanged.addListener(listener);
    await storage.local.remove(['a', 'missing']);

    expect(listener).toHaveBeenCalledWith({ a: { oldValue: 1 } }, 'local');
  });

  it('外した受け取る関数は、呼ばない', async () => {
    const storage = createStorage(createMapBackend());
    const listener = vi.fn();
    storage.onChanged.addListener(listener);
    storage.onChanged.removeListener(listener);
    await storage.local.set({ a: 1 });

    expect(storage.onChanged.hasListener(listener)).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('値を書いたとき、ほかのタブにも変わり方を送る', async () => {
    const channel = createFakeChannel();
    const storage = createStorage(createMapBackend(), channel);
    await storage.sync.set({ level: 'grade3' });

    expect(channel.sent).toEqual([
      {
        type: 'rubipeta-pdf:storage-changed',
        area: 'sync',
        changes: { level: { newValue: 'grade3' } },
      },
    ]);
  });

  it('ほかのタブから変わり方が届いたとき、受け取る関数に伝える', () => {
    const channel = createFakeChannel();
    const storage = createStorage(createMapBackend(), channel);
    const listener = vi.fn();
    storage.onChanged.addListener(listener);
    const changes = { level: { oldValue: 'all', newValue: 'grade3' } };
    channel.receive({ type: 'rubipeta-pdf:storage-changed', area: 'sync', changes });

    expect(listener).toHaveBeenCalledWith(changes, 'sync');
  });

  it('ほかのタブから形のおかしい知らせが届いたとき、無視する', () => {
    const channel = createFakeChannel();
    const storage = createStorage(createMapBackend(), channel);
    const listener = vi.fn();
    storage.onChanged.addListener(listener);
    channel.receive({ type: 'rubipeta-pdf:storage-changed', area: 'other', changes: {} });
    channel.receive('changed');

    expect(listener).not.toHaveBeenCalled();
  });

  it('書くのに失敗しても、次の書き込みは進める', async () => {
    const backend = createMapBackend();
    const storage = createStorage({
      readAll: async (area) => backend.readAll(area),
      write: vi
        .fn<StorageBackend['write']>()
        .mockRejectedValueOnce(new Error('書けない'))
        .mockImplementation(async (area, changes) => backend.write(area, changes)),
    });

    await expect(storage.local.set({ a: 1 })).rejects.toThrow('書けない');
    await storage.local.set({ b: 2 });
    expect(await storage.local.get()).toEqual({ b: 2 });
  });
});
