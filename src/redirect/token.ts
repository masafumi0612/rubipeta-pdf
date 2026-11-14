// 自動でリーダーに移すときの、秘密の印。
// リーダーは、自動で移された PDF を、ログインの情報（Cookie）を付けて取り直す。
// 移した印が決まった文字だけだと、ほかのサイトが同じ URL を作り、拡張に Cookie 付きで別のサイトを読ませられる。
// そこで、ブラウザーを起動するたびに秘密の印を作って storage.session（拡張の画面だけが読める）に置き、
// 移すルールの URL に入れる。リーダーは、印が合うときだけ Cookie を付ける。

/** storage.session に置く鍵 */
const TOKEN_KEY = 'redirectToken';
/** 印の形（16 バイトの 16 進） */
const TOKEN_PATTERN = /^[0-9a-f]{32}$/u;
/** 印のバイト数 */
const TOKEN_BYTES = 16;

/** 印を置く場所（browser.storage.session のうち、使うところ） */
export interface TokenStore {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

/**
 * 印の形をしているか。
 * @param value 調べる文字
 * @returns 印の形なら true
 */
export function isTokenShape(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

/**
 * 置いてある印を引く。なければ作って置く（拡張の裏の service worker から呼ぶ）。
 * @param store 置き場所
 * @returns 印
 */
export async function ensureRedirectToken(store: TokenStore): Promise<string> {
  const stored = (await store.get(TOKEN_KEY))[TOKEN_KEY];
  if (typeof stored === 'string' && isTokenShape(stored)) return stored;
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  await store.set({ [TOKEN_KEY]: token });
  return token;
}

/**
 * 渡された印が、置いてある印と同じか（リーダーから呼ぶ）。
 * @param store 置き場所
 * @param token 渡された印。なければ undefined
 * @returns 同じなら true。置いてある印がないときも false
 */
export async function isRedirectToken(
  store: TokenStore,
  token: string | undefined,
): Promise<boolean> {
  if (token === undefined || !isTokenShape(token)) return false;
  const stored = (await store.get(TOKEN_KEY))[TOKEN_KEY];
  return stored === token;
}
