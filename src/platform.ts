// どの形で動いているか。拡張と Web 版で同じコードを使い、違うところだけをこれで分ける

/**
 * Web 版（vite.web.config.ts で `--mode web` を付けてビルドしたもの）なら true。拡張と単体テストでは false。
 * Web 版には、自動で開く仕組み・サイトを読む権限・［開く］の PDF を渡す service worker がない
 */
export const isWeb = import.meta.env.MODE === 'web';
