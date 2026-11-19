// ビルドした Web 版（.output/web）を、手元で GitHub Pages と同じように出すだけのサーバー。
// 辞書の .gz は、Pages と同じく、そのまま（Content-Encoding を付けずに）返す（vite preview は付けてしまい、辞書を読めない）。
// 使い方：node scripts/serve-web.ts [ポート] [置き場所]（既定は 4173 と /rubipeta-pdf/）
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';

const OUT_DIR = join(import.meta.dirname, '..', '.output', 'web');
const port = Number(process.argv[2] ?? '4173');
const basePath = process.argv[3] ?? '/rubipeta-pdf/';

/** 拡張子ごとの種類 */
const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.pdf': 'application/pdf',
  '.gz': 'application/gzip',
};

/**
 * URL のパスを、出したもののファイルにする。置き場所の外や、出したもののフォルダの外は指せない。
 * @param pathname URL のパス
 * @returns ファイル。なければ undefined
 */
async function resolveFile(pathname: string): Promise<string | undefined> {
  if (!pathname.startsWith(basePath)) {
    return undefined;
  }
  const relative = decodeURIComponent(pathname.slice(basePath.length)) || 'index.html';
  const file = normalize(join(OUT_DIR, relative));
  if (!file.startsWith(OUT_DIR + sep)) {
    return undefined;
  }
  const info = await stat(file).catch(() => undefined);
  return info?.isFile() === true ? file : undefined;
}

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost');
  resolveFile(pathname)
    .then(async (file) => {
      if (file === undefined) {
        response.writeHead(404).end();
        return;
      }
      const type = CONTENT_TYPES[extname(file)] ?? 'application/octet-stream';
      response.writeHead(200, { 'content-type': type }).end(await readFile(file));
    })
    .catch(() => {
      response.writeHead(500).end();
    });
}).listen(port, '127.0.0.1');
