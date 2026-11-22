import { describe, expect, it } from 'vitest';

import { levelAmountText } from '@/settings/level-text';
import type { Level } from '@/text/types';

import { localeMessage } from '../../helpers/locale-message';

describe('levelAmountText', () => {
  it.each<[Level, string]>([
    ['all', '全学年'],
    ['g1', '2年生以上'],
    ['g2', '3年生以上'],
    ['g3', '4年生以上'],
    ['g4', '5年生以上'],
    ['g5', '6年生以上'],
    ['g6', '中1以上'],
    ['m1', '中2以上（目安）'],
    ['m2', '中3以上（目安）'],
    ['joyo', '常用漢字を除くすべて'],
  ])('段階が %s のとき、「%s」になる', (level, expected) => {
    expect(levelAmountText(level, localeMessage)).toBe(expected);
  });
});
