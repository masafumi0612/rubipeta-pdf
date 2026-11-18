// 紙面（pdf.js が描いたページの絵）の位置を、画面の点の境目に合わせる。
// 画面の倍率が 125% などのとき、紙面を真ん中に寄せると、紙面の左や上が画面の点の途中に来る。
// すると、ブラウザーが絵を少しずらして重ねるので、字がわずかににじむ（くっきり具合が 1 割ほど落ちる）。
// pdf.js は絵の大きさを画面の点にちょうど合わせて描くので、置く位置だけを、点の境目まで少し（1 点ぶん未満）ずらす。

/** 刻みを探す上限（CSS の画素）。pdf.js も倍率を分母 8 までの分数で丸めて描く */
const MAX_STEP = 8;
/** 計算の誤差を、ちょうどとみなす幅 */
const EPSILON = 1e-6;
/** ブラウザーが位置を持つ細かさ（CSS の画素の 1/64）。足す余白はこの刻みにそろえる */
const LAYOUT_UNIT = 64;

/**
 * 位置を合わせる刻み（CSS の画素）を出す。刻みに倍率を掛けると、画面の点の数がちょうど整数になる。
 * @param pixelRatio 画面の倍率（devicePixelRatio）。125% なら 1.25
 * @returns 刻み（125% なら 4、150% なら 2、100% なら 1）。分母 8 までの分数にならない倍率では undefined（合わせない）
 */
export function snapStep(pixelRatio: number): number | undefined {
  for (let step = 1; step <= MAX_STEP; step += 1) {
    const devicePixels = pixelRatio * step;
    if (Math.abs(devicePixels - Math.round(devicePixels)) < EPSILON) {
      return step;
    }
  }
  return undefined;
}

/**
 * 位置を、刻みの倍数まで右（下）へずらす量を出す。左や上へはずらさない（前の紙面や画面の端にかぶらないように）。
 * @param position 位置（CSS の画素）
 * @param step 刻み（snapStep）
 * @returns ずらす量（0 以上、刻み未満）
 */
export function snapDelta(position: number, step: number): number {
  const delta = Math.ceil(position / step - EPSILON) * step - position;
  return delta > EPSILON ? delta : 0;
}

/**
 * 上から順に並んだ紙面の、上の余白に足す量を出す。上の紙面を下げると、下の紙面もすべて同じだけ下がるので、それも数に入れる。
 * @param tops 紙面の上の位置（CSS の画素。ずらす前、上から順）
 * @param step 刻み（snapStep）
 * @returns 紙面ごとの、上の余白に足す量（tops と同じ順）
 */
export function snapTops(tops: readonly number[], step: number): number[] {
  let shift = 0;
  return tops.map((top) => {
    const delta = snapDelta(top + shift, step);
    shift += delta;
    return delta;
  });
}

/**
 * 余白の値を、ブラウザーが位置を持つ細かさにそろえる（足したあとの位置が、ちょうど刻みの倍数になるように）。
 * @param value 余白（CSS の画素）
 * @returns そろえた余白
 */
function toLayoutUnit(value: number): number {
  return Math.round(value * LAYOUT_UNIT) / LAYOUT_UNIT;
}

/** 紙面の位置を合わせるのに使うもの */
export interface PixelSnapOptions {
  /** 紙面（pdf.js の .page）が並ぶ要素 */
  readonly viewer: HTMLElement;
  /** スクロールする要素 */
  readonly container: HTMLElement;
  /**
   * 今の画面の倍率を返す。
   * @returns 倍率（devicePixelRatio）
   */
  readonly pixelRatio: () => number;
}

/** 紙面の位置を合わせるもの */
export interface PixelSnap {
  /** 今の紙面の並びに合わせて、位置を合わせ直す */
  update(): void;
}

/**
 * 紙面の位置を合わせるものを作る。合わせるのは、紙面の中身（枠線の内側）の左と上。
 * @param options 紙面の要素と、画面の倍率
 * @returns 位置を合わせるもの
 */
export function createPixelSnap(options: PixelSnapOptions): PixelSnap {
  const { viewer, container, pixelRatio } = options;
  return {
    update() {
      const pages = [...viewer.querySelectorAll<HTMLElement>('.page')];
      // 前に足した余白を外してから、もとの位置を測る
      for (const page of pages) {
        page.style.marginLeft = '';
        page.style.marginTop = '';
      }
      const step = snapStep(pixelRatio());
      if (step === undefined || pages.length === 0) {
        return;
      }
      // 先に全部を測り、あとでまとめて書く（測るたびに並べ直しが起きないように）。
      // 上の位置はスクロールの量を足して、スクロールしていないときの位置にする
      const boxes = pages.map((page) => {
        const rect = page.getBoundingClientRect();
        const style = getComputedStyle(page);
        return {
          left: rect.left + container.scrollLeft + page.clientLeft,
          top: rect.top + container.scrollTop + page.clientTop,
          marginLeft: Number.parseFloat(style.marginLeft),
          marginTop: Number.parseFloat(style.marginTop),
        };
      });
      const topDeltas = snapTops(
        boxes.map((box) => box.top),
        step,
      );
      for (const [index, page] of pages.entries()) {
        const box = boxes[index];
        const topDelta = topDeltas[index] ?? 0;
        if (box === undefined) {
          continue;
        }
        const leftDelta = snapDelta(box.left, step);
        if (leftDelta > 0) {
          page.style.marginLeft = `${String(toLayoutUnit(box.marginLeft + leftDelta))}px`;
        }
        if (topDelta > 0) {
          page.style.marginTop = `${String(toLayoutUnit(box.marginTop + topDelta))}px`;
        }
      }
    },
  };
}

/**
 * 紙面の並びや画面の倍率が変わったら、位置を合わせ直す。
 * 拡大・縮小・回転・別の PDF では紙面の並ぶ要素の大きさが、窓の大きさを変えるとスクロールする要素の大きさが変わる。
 * 別の倍率の画面へ窓を動かしたときは、大きさが変わらないこともあるので、倍率も見張る。
 * @param options 紙面の要素と、画面の倍率
 */
export function watchPixelSnap(options: PixelSnapOptions): void {
  const snap = createPixelSnap(options);
  let frame: number | undefined;
  // 合わせ直すと紙面の並ぶ要素の大きさも少し変わる。ResizeObserver の呼び出しの中で大きさを変えると、
  // ブラウザーがエラー（ResizeObserver loop …）を出すので、次の描く前に1回だけ合わせ直す。
  // 2 回目は同じ大きさになるので、それ以上は呼ばれない
  const update = (): void => {
    frame ??= requestAnimationFrame(() => {
      frame = undefined;
      snap.update();
    });
  };
  const observer = new ResizeObserver(update);
  observer.observe(options.viewer);
  observer.observe(options.container);
  const watchRatio = (): void => {
    matchMedia(`(resolution: ${String(options.pixelRatio())}dppx)`).addEventListener(
      'change',
      () => {
        update();
        watchRatio();
      },
      { once: true },
    );
  };
  watchRatio();
}
