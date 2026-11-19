// ビルドで node_modules などから写す、同梱のファイルの一覧。拡張（wxt.config.ts）と Web 版（vite.web.config.ts）で同じものを写す
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { DICTIONARY_DIR, SAMPLE_PDF_PATH } from '../src/config';

/** 写すファイル1つ */
export interface PublicAsset {
  /** 写す元（絶対パス） */
  readonly absoluteSrc: string;
  /** 写す先（出力のフォルダからの相対パス） */
  readonly relativeDest: string;
}

/**
 * pdf.js が読むデータのフォルダ。外から読まずに済むよう、ビルドで node_modules から写す。
 * wasm は、wasm が使えないとき用の JS と、PDF の中のスクリプトを動かす部品（quickjs）を入れない
 */
const PDFJS_ASSET_DIRS = ['cmaps', 'standard_fonts', 'iccs', 'wasm'];
const isPdfjsAssetIncluded = (file: string): boolean =>
  !file.startsWith('quickjs') && !file.endsWith('.js');

/**
 * 同梱のファイルの一覧を作る。辞書・pdf.js のデータはリポジトリに入れず、ビルドのたびに node_modules から写す。
 * 辞書を配るときは、著作権表示とライセンスの文も一緒に配る。
 * @param rootDir リポジトリの一番上のフォルダ
 * @returns 写すファイル
 */
export function listPublicAssets(rootDir: string): PublicAsset[] {
  /** @patdx/kuromoji のフォルダ（IPADIC の辞書（gzip）とライセンスの文が入っている） */
  const kuromojiDir = join(rootDir, 'node_modules', '@patdx', 'kuromoji');
  /** pdfjs-dist のフォルダ（CMap・標準フォント情報などのデータが入っている） */
  const pdfjsDir = join(rootDir, 'node_modules', 'pdfjs-dist');
  const files: PublicAsset[] = [];
  const dictionaryDir = join(kuromojiDir, 'dict');
  for (const name of readdirSync(dictionaryDir)) {
    files.push({
      absoluteSrc: join(dictionaryDir, name),
      relativeDest: `${DICTIONARY_DIR}/${name}`,
    });
  }
  for (const dir of PDFJS_ASSET_DIRS) {
    for (const file of readdirSync(join(pdfjsDir, dir)).filter(isPdfjsAssetIncluded)) {
      files.push({ absoluteSrc: join(pdfjsDir, dir, file), relativeDest: `${dir}/${file}` });
    }
  }
  files.push(
    // 設定の画面の「見本の PDF で試す」で開く PDF。自分で書いた文と OFL のフォントだけで作ったもの（test-pdfs/README.md）
    {
      absoluteSrc: join(rootDir, 'test-pdfs', 'out', 'sample.pdf'),
      relativeDest: SAMPLE_PDF_PATH,
    },
    {
      absoluteSrc: join(rootDir, 'THIRD_PARTY_NOTICES.md'),
      relativeDest: 'THIRD_PARTY_NOTICES.md',
    },
    { absoluteSrc: join(rootDir, 'LICENSE'), relativeDest: 'LICENSE' },
    { absoluteSrc: join(kuromojiDir, 'LICENSE-2.0.txt'), relativeDest: 'licenses/Apache-2.0.txt' },
    // ルビのフォント（仮名だけの部分集合）の著作権表示とライセンスの文
    {
      absoluteSrc: join(rootDir, 'src', 'assets', 'fonts', 'OFL.txt'),
      relativeDest: 'licenses/OFL-1.1.txt',
    },
  );
  return files;
}
