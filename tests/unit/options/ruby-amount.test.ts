import { describe, expect, it } from 'vitest';

import { ELEMENTARY_LEVELS, levelChoiceText, MIDDLE_LEVELS } from '@/options/ruby-amount';
import { KANJI_TIERS } from '@/text/kanji-data';
import type { Level } from '@/text/types';

import { localeMessage } from '../../helpers/locale-message';

describe('levelChoiceText', () => {
  it.each<[Level, string, string]>([
    ['all', '全学年', '2,136字に付ける'],
    ['g1', '2年生以上', '2,056字に付ける'],
    ['g3', '4年生以上', '1,696字に付ける'],
    ['g5', '6年生以上', '1,301字に付ける'],
    ['g6', '中1以上', '1,110字に付ける'],
    ['m1', '中2以上（目安）', '760字に付ける'],
    ['m2', '中3以上（目安）', '360字に付ける'],
  ])('段階が %s のとき、名前は「%s」、説明は「%s」になる', (level, name, note) => {
    expect(levelChoiceText(level, localeMessage)).toEqual({ name, note });
  });

  it('段階が joyo のとき、名前は「常用漢字を除くすべて」で、説明は出さない', () => {
    expect(levelChoiceText('joyo', localeMessage)).toEqual({ name: '常用漢字を除くすべて' });
  });
});

describe('ELEMENTARY_LEVELS と MIDDLE_LEVELS', () => {
  it('つなげたとき、「全学年」のあとにすべての段階が習う順に並ぶ', () => {
    expect([...ELEMENTARY_LEVELS, ...MIDDLE_LEVELS]).toEqual(['all', ...KANJI_TIERS]);
  });
});
