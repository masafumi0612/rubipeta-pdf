import { describe, expect, it } from 'vitest';

import { formatMessage, type LocaleMessages } from '@/web/i18n';

const MESSAGES: LocaleMessages = {
  plain: { message: 'ルビの設定' },
  one: { message: '/ $COUNT$', placeholders: { count: { content: '$1' } } },
  two: {
    message: '$DONE$ / $TOTAL$ ページ',
    placeholders: { done: { content: '$1' }, total: { content: '$2' } },
  },
  dollar: { message: '$$100' },
  unknown: { message: '$OTHER$ のまま' },
};

describe('formatMessage', () => {
  it('差し込みのない文言のとき、そのまま返す', () => {
    expect(formatMessage(MESSAGES, 'plain')).toBe('ルビの設定');
  });

  it('差し込みを文字列で渡したとき、名前の場所に入れる', () => {
    expect(formatMessage(MESSAGES, 'one', '12')).toBe('/ 12');
  });

  it('差し込みを並びで渡したとき、順に入れる', () => {
    expect(formatMessage(MESSAGES, 'two', ['3', '10'])).toBe('3 / 10 ページ');
  });

  it('差し込みが足りないとき、その場所は空にする', () => {
    expect(formatMessage(MESSAGES, 'two', ['3'])).toBe('3 /  ページ');
  });

  it('$$ のとき、$ にする', () => {
    expect(formatMessage(MESSAGES, 'dollar')).toBe('$100');
  });

  it('placeholders にない名前のとき、そのまま残す', () => {
    expect(formatMessage(MESSAGES, 'unknown')).toBe('$OTHER$ のまま');
  });

  it('ないキーのとき、空の文字列を返す', () => {
    expect(formatMessage(MESSAGES, 'missing')).toBe('');
  });
});
