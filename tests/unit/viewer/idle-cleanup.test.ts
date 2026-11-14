import { describe, expect, it, vi } from 'vitest';

import { createIdleCleanup } from '@/viewer/idle-cleanup';

/**
 * 片づける相手のまねを作る。
 * @param options 開いている文書があるか・忙しいか・文書の片づけが断られるか
 * @param options.hasDocument 開いている文書があるなら true
 * @param options.isBusy 忙しいなら true
 * @param options.isRefused 文書の片づけが断られるなら true
 * @returns まねと、呼ばれた記録
 */
function fake(options: { hasDocument: boolean; isBusy: boolean; isRefused?: boolean }) {
  const viewerCleanup = vi.fn<() => void>();
  const documentCleanup = vi.fn<() => Promise<void>>(() =>
    options.isRefused === true ? Promise.reject(new Error('rendering')) : Promise.resolve(),
  );
  const run = createIdleCleanup({
    viewer: { cleanup: viewerCleanup },
    getDocument: () => (options.hasDocument ? { cleanup: documentCleanup } : undefined),
    isBusy: () => options.isBusy,
  });
  return { run, viewerCleanup, documentCleanup };
}

describe('createIdleCleanup', () => {
  it('文書を開いていて忙しくないとき、見えないページを戻してから、文書を片づける', () => {
    const { run, viewerCleanup, documentCleanup } = fake({ hasDocument: true, isBusy: false });

    run();

    expect(viewerCleanup).toHaveBeenCalledOnce();
    expect(documentCleanup).toHaveBeenCalledOnce();
    expect(viewerCleanup.mock.invocationCallOrder[0]).toBeLessThan(
      documentCleanup.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it.each([
    ['ルビ付きの PDF を作っている途中', { hasDocument: true, isBusy: true }],
    ['文書を開いていない', { hasDocument: false, isBusy: false }],
  ])('%sのとき、何も片づけない', (_name, options) => {
    const { run, viewerCleanup, documentCleanup } = fake(options);

    run();

    expect([viewerCleanup.mock.calls.length, documentCleanup.mock.calls.length]).toEqual([0, 0]);
  });

  it('描いている途中で文書の片づけを断られたとき、失敗を外に出さない', async () => {
    const { run, documentCleanup } = fake({ hasDocument: true, isBusy: false, isRefused: true });

    expect(() => {
      run();
    }).not.toThrow();
    await expect(documentCleanup.mock.results[0]?.value).rejects.toThrow('rendering');
  });
});
