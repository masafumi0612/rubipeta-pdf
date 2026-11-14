// 見ているページの近くだけに、描いたページとルビの層を持つ（メモリの少ない PC 向け）。
// pdf.js は、描いたページを 10 ページほど持っておき、そのページの絵（Canvas）・文字の層・ルビの層が
// メモリに残る。見えているページから遠いページは、pdf.js に片づけさせ（また見えたら描き直す）、
// ルビの層は、さらに近いページにだけ作る（読みと置き場所は取っておくので、近づいたらすぐ作れる）。

/** 描いたページを持っておく、見えているページからの距離（ページ数）。これより遠いページは片づける */
export const KEEP_PAGES_AROUND = 2;
/**
 * ルビの層を作る、見えているページからの距離（ページ数）。
 * 今は前後 1 ページ。スクロールしたときにルビが出るのが遅れて気になるなどの方針しだいで、
 * 前後 2 ページ（KEEP_PAGES_AROUND と同じ）に変えることがある
 */
export const RUBY_PAGES_AROUND = 1;
/** pdf.js のページの描き方の状態のうち、まだ描いていない（片づけた）ことを表す値（RenderingStates.INITIAL） */
const INITIAL = 0;

/** 見えているページの範囲（ページ番号は 1 から） */
export interface VisibleRange {
  readonly first: number;
  readonly last: number;
}

/** 片づけるページの表示（pdf.js の PDFPageView のうち、使うところ） */
export interface TrimmablePageView {
  /** 描き方の状態（pdf.js の RenderingStates） */
  readonly renderingState: number;
  /** 描いたものを片づける（pdf.js の PDFPageView.destroy。ページの要素を外し、ページのデータを返す） */
  destroy(): void;
}

/**
 * 見えているページの番号から、範囲を出す。
 * @param visible 見えているページの番号
 * @returns 範囲。見えているページがなければ undefined
 */
export function visibleRangeOf(visible: readonly number[]): VisibleRange | undefined {
  if (visible.length === 0) return undefined;
  return { first: Math.min(...visible), last: Math.max(...visible) };
}

/**
 * ページが、見えているページから決めた距離の中にあるか。
 * @param pageNumber ページ番号
 * @param range 見えているページの範囲。分からなければ undefined（そのときは近いとみなす）
 * @param distance 距離（ページ数）
 * @returns 中にあれば true
 */
export function isNearVisible(
  pageNumber: number,
  range: VisibleRange | undefined,
  distance: number,
): boolean {
  if (range === undefined) return true;
  return pageNumber >= range.first - distance && pageNumber <= range.last + distance;
}

/**
 * 見えているページから遠いページを、pdf.js に片づけさせる。
 * @param range 見えているページの範囲
 * @param pageCount ページの数
 * @param getPageView ページの表示を引く（ページ番号は 1 から）
 * @returns 片づけたページの番号
 */
export function trimFarPages(
  range: VisibleRange | undefined,
  pageCount: number,
  getPageView: (pageNumber: number) => TrimmablePageView | undefined,
): number[] {
  if (range === undefined) return [];
  const trimmed: number[] = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    if (isNearVisible(pageNumber, range, KEEP_PAGES_AROUND)) continue;
    const view = getPageView(pageNumber);
    if (view === undefined || view.renderingState === INITIAL) continue;
    view.destroy();
    trimmed.push(pageNumber);
  }
  return trimmed;
}
