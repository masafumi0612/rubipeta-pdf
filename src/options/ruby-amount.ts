// 「ルビを付ける範囲」の場所に並べる段階と、その名前・ルビを付ける字の数
import { levelAmountText, type MessageLookup } from '@/settings/level-text';
import { countKanjiWithin, KANJI_TIERS, type KanjiTier } from '@/text/kanji-data';
import type { Level } from '@/text/types';

/**
 * 小学校（学年別漢字配当表）のまとまりの段階。すべての漢字にルビを付ける「全学年」を先頭に置く。
 * g6（6年までの漢字に付けない）は「中1以上」になるので、中学・高校のまとまりに入れる
 */
export const ELEMENTARY_LEVELS: readonly Level[] = ['all', 'g1', 'g2', 'g3', 'g4', 'g5'];

/** 中学・高校（常用漢字）のまとまりの段階 */
export const MIDDLE_LEVELS: readonly Level[] = ['g6', 'm1', 'm2', 'joyo'];

/** 字の数の書き方（3けたごとに区切る。例：1,026） */
const COUNT_FORMAT = new Intl.NumberFormat('ja-JP');

/** 常用漢字の字の数（2,136） */
const JOYO_COUNT = countKanjiWithin('joyo');

/**
 * 段階ごとの、ルビを付ける常用漢字の字の数（常用漢字のうち、その段階までに習わない字）。
 * 画面を描き直すたびに数えないよう、一度だけ数える
 */
const RUBY_COUNTS: ReadonlyMap<KanjiTier, number> = new Map(
  KANJI_TIERS.map((tier) => [tier, JOYO_COUNT - countKanjiWithin(tier)]),
);

/** 選ぶ欄の1つに出す文字 */
export interface LevelChoiceText {
  /** 段階の名前（例：4年生以上） */
  readonly name: string;
  /** 名前の下の説明（例：1,696字に付ける）。「常用漢字を除くすべて」は名前だけで分かるので出さない */
  readonly note?: string;
}

/**
 * 段階を選ぶ欄の1つに出す、名前と説明を作る。
 * @param level 段階
 * @param message 文言を引く関数
 * @returns 名前と説明
 */
export function levelChoiceText(level: Level, message: MessageLookup): LevelChoiceText {
  const name = levelAmountText(level, message);
  if (level === 'joyo') {
    return { name };
  }
  const count = level === 'all' ? JOYO_COUNT : (RUBY_COUNTS.get(level) ?? 0);
  return { name, note: message('options_amount_count', COUNT_FORMAT.format(count)) };
}
