import { describe, expect, it } from 'vitest';

import { inlineDisposition, openedPath, parseOpenedPath } from '@/viewer/opened-pdf';

const TOKEN = '0f8fad5b-d9cb-469f-a165-70867728950e';

describe('openedPath・parseOpenedPath', () => {
  it('日本語の名前のとき、パスにして戻すと同じ印と名前になる', () => {
    const path = openedPath(TOKEN, 'お知らせ（ルビ付き）.pdf');

    expect(path.startsWith(`/opened/${TOKEN}/`)).toBe(true);
    expect(parseOpenedPath(path)).toEqual({ token: TOKEN, fileName: 'お知らせ（ルビ付き）.pdf' });
  });

  it('名前に / や # があるとき、名前の一部として戻る', () => {
    const path = openedPath(TOKEN, 'a/b#c.pdf');

    expect(parseOpenedPath(path)).toEqual({ token: TOKEN, fileName: 'a/b#c.pdf' });
  });

  it.each([
    ['/viewer.html'],
    [`/opened/${TOKEN}`],
    [`/opened/${TOKEN}/`],
    ['/opened/not-a-token/a.pdf'],
    [`/opened/${TOKEN}/a.pdf/extra`],
    [`/opened/${TOKEN}/%E0%A4%A.pdf`],
  ])('形の違うパス「%s」のとき、undefined になる', (path) => {
    expect(parseOpenedPath(path)).toBeUndefined();
  });
});

describe('inlineDisposition', () => {
  it('日本語の名前のとき、表示はそのままで、符号にした名前を渡す', () => {
    expect(inlineDisposition('見本（ルビ付き）.pdf')).toBe(
      `inline; filename*=UTF-8''${encodeURIComponent('見本（ルビ付き）.pdf')}`,
    );
  });
});
