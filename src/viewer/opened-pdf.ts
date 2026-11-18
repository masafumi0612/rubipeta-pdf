// ［開く］で新しいタブに出す、ルビ付きの PDF を、名前の付いた拡張の URL で渡す。
// blob: の URL のまま開くと、Chrome の PDF の表示で保存したときの名前が UUID になる。
// そこで PDF を拡張の Cache Storage に置き、拡張の service worker（background.ts）が
// chrome-extension://<ID>/opened/<印>/<名前>.pdf の問い合わせに、その PDF を返す。
// 置いた PDF は、次の PDF ができたとき・別の PDF を開いたときに消し、置いてから1日たったものも消す。

/** 名前の付いた URL のパスの頭 */
export const OPENED_PREFIX = '/opened/';
/** PDF を置く Cache Storage の名前 */
const CACHE_NAME = 'opened-pdfs';
/** Cache Storage のキーの頭。chrome-extension: の URL はキーにできないので、使われない https の URL にする */
const KEY_BASE = 'https://opened.invalid/';
/** 置いた時刻を残すヘッダー */
const CREATED_HEADER = 'x-rubipeta-created';
/** 置いたままにする長さの上限（ミリ秒）。閉じたリーダーが消せなかったものを片づける */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** 印（randomUUID の形） */
const TOKEN_PATTERN = /^[0-9a-f-]{36}$/u;

/** 置いた PDF */
export interface OpenedPdf {
  /** 新しいタブで開く URL */
  readonly url: string;
  /** 置いた PDF を消す */
  dispose(): void;
}

/**
 * 名前の付いた URL のパスを作る。
 * @param token 印
 * @param fileName ファイルの名前（例：「お知らせ（ルビ付き）.pdf」）
 * @returns パス
 */
export function openedPath(token: string, fileName: string): string {
  return `${OPENED_PREFIX}${token}/${encodeURIComponent(fileName)}`;
}

/**
 * 名前の付いた URL のパスから、印とファイルの名前を取り出す。
 * @param pathname URL のパス
 * @returns 印とファイルの名前。形が違えば undefined
 */
export function parseOpenedPath(
  pathname: string,
): { readonly token: string; readonly fileName: string } | undefined {
  if (!pathname.startsWith(OPENED_PREFIX)) return undefined;
  const [token = '', name = '', ...rest] = pathname.slice(OPENED_PREFIX.length).split('/');
  if (!TOKEN_PATTERN.test(token) || name === '' || rest.length > 0) return undefined;
  try {
    return { token, fileName: decodeURIComponent(name) };
  } catch {
    return undefined;
  }
}

/**
 * Content-Disposition の値を作る。表示はそのまま（inline）で、保存の名前を渡す。
 * @param fileName ファイルの名前
 * @returns ヘッダーの値
 */
export function inlineDisposition(fileName: string): string {
  return `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/**
 * PDF を置き、名前の付いた URL を作る。
 * @param blob PDF
 * @param fileName ファイルの名前
 * @param toExtensionUrl 拡張の中のパスを URL にする（browser.runtime.getURL）
 * @returns 置いた PDF
 */
export async function storeOpenedPdf(
  blob: Blob,
  fileName: string,
  toExtensionUrl: (path: string) => string,
): Promise<OpenedPdf> {
  const cache = await caches.open(CACHE_NAME);
  await removeExpired(cache, Date.now());
  const token = crypto.randomUUID();
  await cache.put(
    KEY_BASE + token,
    new Response(blob, {
      headers: { 'content-type': 'application/pdf', [CREATED_HEADER]: String(Date.now()) },
    }),
  );
  return {
    url: toExtensionUrl(openedPath(token, fileName)),
    dispose() {
      cache.delete(KEY_BASE + token).catch(() => undefined);
    },
  };
}

/**
 * 名前の付いた URL の問い合わせに、置いた PDF を返す（service worker の fetch で使う）。
 * @param url 問い合わせの URL
 * @returns 返事。置いた PDF がなければ 404
 */
export async function respondOpenedPdf(url: URL): Promise<Response> {
  const parsed = parseOpenedPath(url.pathname);
  const stored =
    parsed === undefined
      ? undefined
      : await (await caches.open(CACHE_NAME)).match(KEY_BASE + parsed.token);
  if (parsed === undefined || stored === undefined) {
    return new Response('', { status: 404 });
  }
  return new Response(stored.body, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': inlineDisposition(parsed.fileName),
    },
  });
}

/**
 * 置いてから時間のたった PDF を消す。
 * @param cache 置き場所
 * @param now 今の時刻
 */
async function removeExpired(cache: Cache, now: number): Promise<void> {
  for (const request of await cache.keys()) {
    const stored = await cache.match(request);
    const created = Number(stored?.headers.get(CREATED_HEADER));
    if (!Number.isFinite(created) || now - created > MAX_AGE_MS) await cache.delete(request);
  }
}
