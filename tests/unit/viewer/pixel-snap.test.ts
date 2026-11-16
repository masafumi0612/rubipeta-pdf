import { describe, expect, it } from 'vitest';

import { snapDelta, snapStep, snapTops } from '@/viewer/pixel-snap';

describe('snapStep', () => {
  it.each([
    [1, 1],
    [1.25, 4],
    [1.5, 2],
    [1.75, 4],
    [2, 1],
  ])('画面の倍率が %s のとき、刻みは %s になる', (pixelRatio, step) => {
    expect(snapStep(pixelRatio)).toBe(step);
  });

  it('分母 8 までの分数にならない倍率のとき、undefined になる', () => {
    expect(snapStep(1.1)).toBeUndefined();
  });
});

describe('snapDelta', () => {
  it('位置が刻みの途中のとき、次の倍数までの量になる', () => {
    expect(snapDelta(104.5, 4)).toBeCloseTo(3.5);
  });

  it('位置がちょうど刻みの倍数のとき、0 になる', () => {
    expect(snapDelta(104, 4)).toBe(0);
  });

  it('計算の誤差で倍数をわずかに超えたとき、0 になる', () => {
    expect(snapDelta(104.000_000_01, 4)).toBe(0);
  });
});

describe('snapTops', () => {
  it('上の紙面を下げたとき、下の紙面はその分も数に入れて合わせる', () => {
    // 1 枚目を 2 下げると、2 枚目は 1501 になるので、あと 3 下げる
    expect(snapTops([98, 1499], 4)).toEqual([2, 3]);
  });

  it('紙面がないとき、空になる', () => {
    expect(snapTops([], 4)).toEqual([]);
  });
});
