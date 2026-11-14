// 描くのが止まってしばらくしたら、pdf.js に片づけさせる。
// pdf.js の本家の画面（viewer.html）は、描く順番の部品（PDFRenderingQueue）の onIdle で、
// 見えないページを戻し（PDFViewer.cleanup）、文書を片づける（PDFDocumentProxy.cleanup）。
// このリーダーは pdf.js の部品だけを使うので、これを呼ばないと、めくったページで読み込んだ
// フォント・画像・描く命令が残り続け、メモリが増える（63 ページで 70 個ほどのフォントが残る）。
import { createLogger } from '@/log';

const log = createLogger('viewer');

/** 片づける相手（pdf.js の PDFViewer と、開いている文書） */
export interface IdleCleanupTarget {
  /** 見えないページのうち、描き終えていないもの（途中で止めたもの）を戻す */
  readonly viewer: { cleanup(): void };
  /** 開いている文書。開いていなければ undefined */
  readonly getDocument: () => { cleanup(keepLoadedFonts?: boolean): Promise<void> } | undefined;
  /** 片づけてはいけないときに true（ルビ付きの PDF を作っている途中など） */
  readonly isBusy: () => boolean;
}

/**
 * 描くのが止まったときに呼ぶ関数を作る（PDFRenderingQueue の onIdle に渡す）。
 * 描いている途中のページがあると、pdf.js は文書の片づけを断るので、そのときは次の機会に回す。
 * @param target 片づける相手
 * @returns 片づける関数
 */
export function createIdleCleanup(target: IdleCleanupTarget): () => void {
  return () => {
    const pdfDocument = target.getDocument();
    if (pdfDocument === undefined || target.isBusy()) return;
    target.viewer.cleanup();
    pdfDocument.cleanup().catch(() => {
      log.debug('描いている途中のページがあるので、文書の片づけは次に回しました');
    });
  };
}
