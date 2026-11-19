// Web 版の文言：拡張の browser.i18n.getMessage と同じ決まりで、messages.json から文言を作る

/** messages.json の1つの文言 */
export interface LocaleMessage {
  /** 文言。`$名前$` の所に placeholders の中身が入る */
  readonly message: string;
  /** 差し込みの場所。中身は `$1` などで、getMessage に渡した値を指す */
  readonly placeholders?: Readonly<Record<string, { readonly content: string }>>;
}

/** messages.json の中身（キーごとの文言） */
export type LocaleMessages = Readonly<Record<string, LocaleMessage>>;

/** `$名前$` の形（名前は大文字・小文字を区別しない） */
const PLACEHOLDER_PATTERN = /\$([\w@]+)\$/gu;
/** `$1`〜`$9` と、`$` そのものを表す `$$` */
const SUBSTITUTION_PATTERN = /\$(\$|[1-9])/gu;

/**
 * 文言を作る。Chrome と同じく、`$名前$` を placeholders の中身に変えてから、`$1` などに渡した値を入れる。
 * @param messages messages.json の中身
 * @param name 文言のキー
 * @param substitutions 差し込む値。1つなら文字列のままでもよい
 * @returns 文言。キーがなければ空の文字列（Chrome と同じ）
 */
export function formatMessage(
  messages: LocaleMessages,
  name: string,
  substitutions?: string | readonly string[],
): string {
  const entry = messages[name];
  if (entry === undefined) {
    return '';
  }
  const values = typeof substitutions === 'string' ? [substitutions] : (substitutions ?? []);
  const placeholders = new Map(
    Object.entries(entry.placeholders ?? {}).map(([key, value]) => [
      key.toLowerCase(),
      value.content,
    ]),
  );
  return entry.message
    .replaceAll(
      PLACEHOLDER_PATTERN,
      (whole, key: string) => placeholders.get(key.toLowerCase()) ?? whole,
    )
    .replaceAll(SUBSTITUTION_PATTERN, (_whole, token: string) =>
      token === '$' ? '$' : (values[Number(token) - 1] ?? ''),
    );
}
