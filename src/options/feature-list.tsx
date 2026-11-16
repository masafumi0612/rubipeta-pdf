import type { JSX } from 'preact';

import { message } from './message';

/** できることの文言のキー。並べる順に書く */
const FEATURE_KEYS = [
  'options_features_open',
  'options_features_direction',
  'options_features_grade',
  'options_features_fix',
  'options_features_export',
] as const;

/** できることの一覧に渡すもの */
interface FeatureListProps {
  /** 一覧の見出しの ID。同じ画面に2つ出ても重ならないよう、置く場所ごとに変える */
  readonly titleId: string;
}

/**
 * この拡張でできることの一覧。小学生にも読める言葉で、縦書き・横書きの両方に付くことを伝える。
 * 入れた直後の案内と「この拡張について」の両方に出す。
 * @param props 見出しの ID
 * @param props.titleId 一覧の見出しの ID
 * @returns できることの一覧
 */
export function FeatureList({ titleId }: FeatureListProps): JSX.Element {
  return (
    <section class="features" aria-labelledby={titleId}>
      <h3 id={titleId} class="features-title">
        {message('options_features_title')}
      </h3>
      <ol class="features-list">
        {FEATURE_KEYS.map((key) => (
          <li key={key}>{message(key)}</li>
        ))}
      </ol>
    </section>
  );
}
