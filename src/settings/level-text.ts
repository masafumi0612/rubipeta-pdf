// 段階を「どこからの漢字にルビを付けるか」の名前にする（例：4年生以上）。リーダーのバーと設定の画面で同じ言い方にそろえる
import type { browser } from 'wxt/browser';

import type { Level } from '@/text/types';

/** 文言のキー */
export type MessageName = Parameters<typeof browser.i18n.getMessage>[0];

/**
 * 文言を引く関数（`browser.i18n.getMessage` と同じ形）。
 * テストでは、public/_locales の文言を読む関数に差しかえる
 */
export type MessageLookup = (name: MessageName, substitution?: string) => string;

/** 引く文言と、その中の `$1` に入れる文字 */
interface MessageRef {
  readonly name: MessageName;
  readonly substitution?: string;
}

/**
 * 段階ごとの文言。段階は「習い終えた学年」で持つので、名前の学年は 1つ後になる
 * （例：g3 は 3年までの漢字に付けないので「4年生以上」）
 */
const LEVEL_AMOUNTS: Readonly<Record<Level, MessageRef>> = {
  all: { name: 'common_level_all' },
  g1: { name: 'common_level_grade', substitution: '2' },
  g2: { name: 'common_level_grade', substitution: '3' },
  g3: { name: 'common_level_grade', substitution: '4' },
  g4: { name: 'common_level_grade', substitution: '5' },
  g5: { name: 'common_level_grade', substitution: '6' },
  g6: { name: 'common_level_middle', substitution: '1' },
  m1: { name: 'common_level_middleEstimate', substitution: '2' },
  m2: { name: 'common_level_middleEstimate', substitution: '3' },
  joyo: { name: 'common_level_joyo' },
};

/**
 * 段階を、どこからの漢字にルビを付けるかの名前にする（例：g3 なら「4年生以上」）。
 * @param level 段階
 * @param message 文言を引く関数
 * @returns 段階の名前
 */
export function levelAmountText(level: Level, message: MessageLookup): string {
  const { name, substitution } = LEVEL_AMOUNTS[level];
  return message(name, substitution);
}
