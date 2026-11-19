import { defineConfig } from 'wxt';

import { listPublicAssets } from './scripts/public-assets';

/** ツールバーのアイコン。PNG は scripts/build-icons.ts が src/assets/icon/ の SVG から作る */
const ACTION_ICONS = {
  16: 'icon/16.png',
  32: 'icon/32.png',
  48: 'icon/48.png',
  128: 'icon/128.png',
};

// 設定の一覧：https://wxt.dev/api/config.html
export default defineConfig({
  // `@/text/split` のような別名を src/ から引けるようにするため、コードは src/ に置く
  srcDir: 'src',
  manifest: {
    name: '__MSG_manifest_ext_name__',
    description: '__MSG_manifest_ext_description__',
    default_locale: 'ja',
    // PDF の自動切り替えに使う DNR の応答ヘッダの条件が 128 から
    minimum_chrome_version: '128',
    // offscreen：辞書を offscreen document の中の Worker で1回だけ読み込むため。
    // declarativeNetRequestWithHostAccess：許可されたサイトの PDF だけをリーダーに移すため。
    // storage：自動で移すスイッチの値を残すため
    permissions: ['offscreen', 'declarativeNetRequestWithHostAccess', 'storage'],
    // すべてのサイトを読む権限は、利用者が自動で移すことを選んだときに後から許可してもらう
    optional_host_permissions: ['<all_urls>'],
    // 他のサイトの PDF の移し先として、ページ全体や枠の中でリーダーを開けるようにする
    web_accessible_resources: [{ resources: ['viewer.html'], matches: ['<all_urls>'] }],
    // pdf.js は、白黒の画像（JBIG2）・JPEG 2000 の画像・色の変換（ICC）を wasm で読む。
    // wasm が使えないとき用の JS は入れない（scripts/public-assets.ts）。
    // 拡張の決まりの CSP は wasm を認めないので、wasm だけを足す（ほかは決まりのまま）
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
    // 拡張のアイコン。小さな枠（popup）は付けず、押したら設定の画面を開く（background.ts）。
    // icons は WXT が public/icon/<大きさ>.png から入れるが、action の絵は popup がないと
    // 入れてくれないので、ここで同じ PNG を指す
    action: { default_icon: ACTION_ICONS },
  },
  hooks: {
    // 辞書・pdf.js のデータ・ライセンスの文などを写す。Web 版（vite.web.config.ts）と同じ一覧を使う
    'build:publicAssets': (_wxt, files) => {
      files.push(...listPublicAssets(import.meta.dirname));
    },
  },
});
