import { describe, expect, it, vi } from 'vitest';

import {
  isNearVisible,
  KEEP_PAGES_AROUND,
  RUBY_PAGES_AROUND,
  trimFarPages,
  visibleRangeOf,
} from '@/viewer/page-window';

describe('visibleRangeOf', () => {
  it('見えているページがあるとき、いちばん前と後ろの番号になる', () => {
    expect(visibleRangeOf([12, 10, 11])).toEqual({ first: 10, last: 12 });
  });

  it('見えているページがないとき、undefined になる', () => {
    expect(visibleRangeOf([])).toBeUndefined();
  });
});

describe('isNearVisible', () => {
  const range = { first: 10, last: 11 };

  it.each([
    [8, true],
    [7, false],
    [13, true],
    [14, false],
  ])('見えているのが 10〜11 で距離 2 のとき、%i ページは %s', (pageNumber, expected) => {
    expect(isNearVisible(pageNumber, range, 2)).toBe(expected);
  });

  it('範囲が分からないとき、近いとみなす', () => {
    expect(isNearVisible(100, undefined, 0)).toBe(true);
  });

  it('ルビの層を作る距離は、描いたページを持っておく距離より遠くない', () => {
    expect(RUBY_PAGES_AROUND).toBeLessThanOrEqual(KEEP_PAGES_AROUND);
  });
});

describe('trimFarPages', () => {
  it('見えているページから遠い、描いたページだけを片づける', () => {
    const destroyed: number[] = [];
    const states = new Map([
      [1, 3],
      [2, 0],
      [8, 3],
      [10, 3],
      [13, 3],
      [14, 2],
    ]);
    const getPageView = vi.fn((pageNumber: number) => {
      const renderingState = states.get(pageNumber);
      return renderingState === undefined
        ? undefined
        : {
            renderingState,
            destroy: () => {
              destroyed.push(pageNumber);
            },
          };
    });

    const trimmed = trimFarPages({ first: 10, last: 11 }, 20, getPageView);

    // 2 は描いていない（0）ので片づけない。8・10・13 は近いので残す
    expect(trimmed).toEqual([1, 14]);
    expect(destroyed).toEqual([1, 14]);
  });

  it('見えているページが分からないとき、何も片づけない', () => {
    expect(trimFarPages(undefined, 5, () => ({ renderingState: 3, destroy: vi.fn() }))).toEqual([]);
  });
});
