// PDF を開くときに pdf.js へ渡す設定のうち、安全にかかわるもの。
// 既定のままでも同じ動きだが、pdf.js の既定が変わっても困らないよう、はっきり書いておく

/** pdf.js の getDocument に渡す、安全にかかわる設定 */
export const SAFE_DOCUMENT_OPTIONS = {
  /**
   * XFA（PDF の中に HTML に近い形で書かれた入力欄）を描かない。
   * PDF の中身から画面の要素を作らないようにする
   */
  enableXfa: false,
  /** 拡張の外のフォント（パソコンに入っているフォント）を読まない */
  useSystemFonts: false,
} as const;
