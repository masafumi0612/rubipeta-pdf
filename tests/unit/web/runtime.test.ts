import { describe, expect, it, vi } from 'vitest';

import type { ReadingRequest, ReadingResult } from '@/messaging/messages';
import type { WorkerClient } from '@/messaging/worker';
import { createRuntime, OPTIONS_TARGET, type WebRuntimeDeps } from '@/web/runtime';

const REQUEST: ReadingRequest = {
  target: 'offscreen',
  type: 'read-texts',
  texts: ['学校'],
  level: 'all',
  userDictionary: [],
};
const RESULT: ReadingResult = { ok: true, value: [[]] };

/**
 * テスト用の、runtime を作るのに使うものを作る。
 * @returns 使うものと、Worker への問い合わせ
 */
function createDeps(): WebRuntimeDeps & {
  readonly request: ReturnType<typeof vi.fn<WorkerClient['request']>>;
} {
  const request = vi.fn<WorkerClient['request']>(async () => Promise.resolve(RESULT));
  const client: WorkerClient = { request };
  return {
    request,
    baseUrl: new URL('https://example.test/yomigana-pdf/'),
    version: '1.2.3',
    openTab: vi.fn(),
    connectWorker: vi.fn(() => client),
  };
}

describe('createRuntime', () => {
  it('getURL のとき、置き場所の一番上からの URL にする', () => {
    const runtime = createRuntime(createDeps());

    expect(runtime.getURL('/viewer.html')).toBe('https://example.test/yomigana-pdf/viewer.html');
    expect(runtime.getURL('dict/')).toBe('https://example.test/yomigana-pdf/dict/');
  });

  it('getManifest のとき、版を返す', () => {
    expect(createRuntime(createDeps()).getManifest().version).toBe('1.2.3');
  });

  it('openOptionsPage のとき、設定の画面を名前の付いたタブで開く', async () => {
    const deps = createDeps();
    await createRuntime(deps).openOptionsPage();

    expect(deps.openTab).toHaveBeenCalledWith(
      'https://example.test/yomigana-pdf/options.html',
      OPTIONS_TARGET,
    );
  });

  it('getContexts のとき、offscreen document があることにする', async () => {
    expect(await createRuntime(createDeps()).getContexts()).toHaveLength(1);
  });

  it('読みの問い合わせのとき、Worker に渡して返事を返す', async () => {
    const deps = createDeps();
    const runtime = createRuntime(deps);

    expect(await runtime.sendMessage(REQUEST)).toEqual(RESULT);
    expect(deps.request).toHaveBeenCalledWith(REQUEST);
  });

  it('何度問い合わせても、Worker は1回だけ立ち上げる', async () => {
    const deps = createDeps();
    const runtime = createRuntime(deps);
    await runtime.sendMessage(REQUEST);
    await runtime.sendMessage(REQUEST);

    expect(deps.connectWorker).toHaveBeenCalledTimes(1);
  });

  it('読みの問い合わせでないメッセージのとき、Worker を立ち上げずに undefined を返す', async () => {
    const deps = createDeps();

    expect(await createRuntime(deps).sendMessage({ type: 'other' })).toBeUndefined();
    expect(deps.connectWorker).not.toHaveBeenCalled();
  });
});
