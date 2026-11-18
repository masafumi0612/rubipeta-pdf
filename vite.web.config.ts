// Web 版のビルド：拡張と同じリーダー・設定の画面を、ふつうの Web ページとして出す（`npm run build:web`）。
// 拡張の API（`wxt/browser`）は、Web ページでできる形の代わり（src/web/）に差し替える。
// 置き場所は `--base` で変えられる（既定は一番上。GitHub Pages なら `/yomigana-pdf/`）
import { copyFile, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { defineConfig, type Plugin } from 'vite';

import { listPublicAssets } from './scripts/public-assets';

const ROOT = import.meta.dirname;
const SRC_DIR = join(ROOT, 'src');
/** 画面の入口のフォルダ（拡張と同じもの） */
const ENTRYPOINTS_DIR = join(SRC_DIR, 'entrypoints');
/** 出す先 */
const OUT_DIR = join(ROOT, '.output', 'web');
/** 出す画面。拡張と同じく、どれも一番上に `<名前>.html` で置く（今のコードが同じパスで互いを指すため） */
const PAGES = ['viewer', 'options', 'licenses'] as const;
/** 一番上の URL で開いたときに、リーダーへ移すだけのページ */
const INDEX_HTML = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=viewer.html" />
    <title>ルビぺたPDF</title>
  </head>
  <body>
    <a href="viewer.html">ルビぺたPDF を開く</a>
  </body>
</html>
`;

/**
 * `wxt/browser` を、Web 版の代わりに差し替える。
 * 別名（resolve.alias）は Worker にも効くので、画面と Worker で別の代わりを使えるよう、プラグインで差し替える。
 * @param replacement 代わりのファイル
 * @returns プラグイン
 */
function replaceExtensionApi(replacement: string): Plugin {
  return {
    name: 'yomigana-pdf:replace-extension-api',
    enforce: 'pre',
    resolveId: (source) => (source === 'wxt/browser' ? replacement : undefined),
  };
}

/**
 * 出したものを、拡張と同じ並びにする。`viewer/index.html` を `viewer.html` に移し、同梱のファイルを写し、一番上のページを置く。
 * @returns プラグイン
 */
function arrangeOutput(): Plugin {
  return {
    name: 'yomigana-pdf:arrange-output',
    apply: 'build',
    async writeBundle() {
      for (const page of PAGES) {
        await rename(join(OUT_DIR, page, 'index.html'), join(OUT_DIR, `${page}.html`));
        await rm(join(OUT_DIR, page), { recursive: true });
      }
      for (const asset of listPublicAssets(ROOT)) {
        const dest = join(OUT_DIR, asset.relativeDest);
        await mkdir(dirname(dest), { recursive: true });
        await copyFile(asset.absoluteSrc, dest);
      }
      await writeFile(join(OUT_DIR, 'index.html'), INDEX_HTML);
    },
  };
}

export default defineConfig({
  root: ENTRYPOINTS_DIR,
  base: '/',
  // 文言（_locales）とアイコンも写す。文言は src/web/browser.ts が読み込んで使う
  publicDir: join(ROOT, 'public'),
  resolve: { alias: { '@': SRC_DIR } },
  plugins: [replaceExtensionApi(join(SRC_DIR, 'web', 'browser.ts')), arrangeOutput()],
  worker: {
    format: 'es',
    plugins: () => [replaceExtensionApi(join(SRC_DIR, 'web', 'worker-browser.ts'))],
  },
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    // リーダーは、一番上の await で表示の部品を読み込む
    target: 'esnext',
    // 辞書を引く部品と pdf.js は大きいが、拡張と同じく分けずに読む
    chunkSizeWarningLimit: 2000,
    rolldownOptions: {
      input: Object.fromEntries(
        PAGES.map((page) => [page, join(ENTRYPOINTS_DIR, page, 'index.html')]),
      ),
    },
  },
});
