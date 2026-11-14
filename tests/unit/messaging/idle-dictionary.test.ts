import { describe, expect, it, vi } from 'vitest';

import {
  CHECK_INTERVAL_MS,
  closeIdleOffscreen,
  type CloseOffscreenApi,
  createIdleWatch,
  IDLE_MS,
  isOffscreenIdleMessage,
  OFFSCREEN_IDLE_MESSAGE,
} from '@/messaging/idle-dictionary';

const ORIGIN = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop';

/**
 * 時計を進められる見張りを作る。
 * @returns 見張りと、時計を進める関数と、知らせの記録
 */
function watchWithClock() {
  let now = 0;
  let tick: () => void = () => undefined;
  const onIdle = vi.fn<() => void>();
  const watch = createIdleWatch({
    now: () => now,
    every: (callback, intervalMs) => {
      expect(intervalMs).toBe(CHECK_INTERVAL_MS);
      tick = callback;
    },
    onIdle,
  });
  const advance = (ms: number): void => {
    now += ms;
    tick();
  };
  return { watch, advance, onIdle };
}

describe('createIdleWatch', () => {
  it('問い合わせがないまま決まった時間を過ぎたとき、知らせる', () => {
    const { advance, onIdle } = watchWithClock();

    advance(IDLE_MS);
    expect(onIdle).not.toHaveBeenCalled();
    advance(1);

    expect(onIdle).toHaveBeenCalledOnce();
  });

  it('途中で問い合わせを受けたとき、そこから数え直す', () => {
    const { watch, advance, onIdle } = watchWithClock();

    advance(IDLE_MS - 1);
    watch.touch();
    advance(IDLE_MS);

    expect(onIdle).not.toHaveBeenCalled();
  });
});

describe('isOffscreenIdleMessage', () => {
  it.each([
    [OFFSCREEN_IDLE_MESSAGE, true],
    [{ target: 'offscreen', type: 'offscreen-idle' }, false],
    [{ target: 'background', type: 'read-texts' }, false],
    ['offscreen-idle', false],
    [undefined, false],
  ])('%j のとき、%s', (message, expected) => {
    expect(isOffscreenIdleMessage(message)).toBe(expected);
  });
});

/**
 * 開いている画面を決めた API のまねを作る。
 * @param tabUrls 開いている拡張の画面の URL
 * @param hasOffscreen offscreen document があるなら true
 * @returns まねと、閉じる関数の記録
 */
function apiWith(tabUrls: readonly string[], hasOffscreen: boolean) {
  const closeDocument = vi.fn(() => Promise.resolve());
  const api = {
    runtime: {
      getURL: (path: string) => `${ORIGIN}${path}`,
      getContexts: (filter: { contextTypes?: readonly string[] }) =>
        Promise.resolve(
          filter.contextTypes?.[0] === 'TAB'
            ? tabUrls.map((documentUrl) => ({ documentUrl }))
            : hasOffscreen
              ? [{ documentUrl: `${ORIGIN}/offscreen.html` }]
              : [],
        ),
    },
    offscreen: { closeDocument },
  } as unknown as CloseOffscreenApi;
  return { api, closeDocument };
}

describe('closeIdleOffscreen', () => {
  it('リーダーも設定の画面も開いていないとき、閉じる', async () => {
    const { api, closeDocument } = apiWith([], true);

    expect(await closeIdleOffscreen(api)).toBe(true);
    expect(closeDocument).toHaveBeenCalledOnce();
  });

  it.each([
    ['リーダー', `${ORIGIN}/viewer.html?file=https%3A%2F%2Fexample.com%2Fa.pdf`],
    ['設定の画面', `${ORIGIN}/options.html`],
  ])('%sが開いているとき、閉じない', async (_name, url) => {
    const { api, closeDocument } = apiWith([url], true);

    expect(await closeIdleOffscreen(api)).toBe(false);
    expect(closeDocument).not.toHaveBeenCalled();
  });

  it('ライセンスの画面だけが開いているとき、閉じる', async () => {
    const { api } = apiWith([`${ORIGIN}/licenses.html`], true);

    expect(await closeIdleOffscreen(api)).toBe(true);
  });

  it('offscreen document がもうないとき、何もしない', async () => {
    const { api, closeDocument } = apiWith([], false);

    expect(await closeIdleOffscreen(api)).toBe(false);
    expect(closeDocument).not.toHaveBeenCalled();
  });
});
