import { describe, expect, it } from 'vitest';

import { rubyAmountLabel } from '@/viewer/ruby-amount';

import { localeMessage } from '../../helpers/locale-message';

describe('rubyAmountLabel', () => {
  it('段階が g3（3年まで習った）のとき、バーの文字は「ルビ：4年生以上」になる', () => {
    expect(rubyAmountLabel('g3', localeMessage).text).toBe('ルビ：4年生以上');
  });

  it('段階がすべての漢字に付けるとき、バーの文字は「ルビ：全学年」になる', () => {
    expect(rubyAmountLabel('all', localeMessage).text).toBe('ルビ：全学年');
  });

  it('段階が常用漢字のとき、バーの文字は「ルビ：常用漢字を除くすべて」になる', () => {
    expect(rubyAmountLabel('joyo', localeMessage).text).toBe('ルビ：常用漢字を除くすべて');
  });

  it('読み上げの名前は、見えている文字に、設定を開くことを足したものになる', () => {
    expect(rubyAmountLabel('m1', localeMessage).name).toBe(
      'ルビ：中2以上（目安）（ルビの設定を開く）',
    );
  });
});
