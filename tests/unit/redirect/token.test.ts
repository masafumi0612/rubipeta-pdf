import { describe, expect, it } from 'vitest';

import { ensureRedirectToken, isRedirectToken, type TokenStore } from '@/redirect/token';

/**
 * 中身をメモリに持つ置き場所を作る。
 * @param initial 初めの中身
 * @returns 置き場所
 */
function createStore(initial: Record<string, unknown> = {}): TokenStore & {
  items: Record<string, unknown>;
} {
  const items = { ...initial };
  return {
    items,
    get: async (key) => Promise.resolve(key in items ? { [key]: items[key] } : {}),
    set: async (next) => {
      Object.assign(items, next);
      return Promise.resolve();
    },
  };
}

describe('ensureRedirectToken', () => {
  it('印がないとき、16 進の 32 字の印を作って置く', async () => {
    const store = createStore();

    const token = await ensureRedirectToken(store);

    expect(token).toMatch(/^[0-9a-f]{32}$/u);
    expect(store.items).toEqual({ redirectToken: token });
  });

  it('印があるとき、同じ印を返し、作り直さない', async () => {
    const store = createStore();
    const first = await ensureRedirectToken(store);

    expect(await ensureRedirectToken(store)).toBe(first);
  });

  it('置いてある印の形が違うとき、作り直す', async () => {
    const store = createStore({ redirectToken: 'bad' });

    expect(await ensureRedirectToken(store)).toMatch(/^[0-9a-f]{32}$/u);
  });
});

describe('isRedirectToken', () => {
  const token = '0123456789abcdef0123456789abcdef';

  it('置いてある印と同じとき、true', async () => {
    expect(await isRedirectToken(createStore({ redirectToken: token }), token)).toBe(true);
  });

  it.each([
    ['違う印', 'fedcba9876543210fedcba9876543210'],
    ['印がない', undefined],
    ['形の違う印', 'https'],
  ])('%sのとき、false', async (_name, given) => {
    expect(await isRedirectToken(createStore({ redirectToken: token }), given)).toBe(false);
  });

  it('置いてある印がないとき、false', async () => {
    expect(await isRedirectToken(createStore(), token)).toBe(false);
  });
});
