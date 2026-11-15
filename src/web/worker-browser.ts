// Web 版の Worker の中で `wxt/browser` の代わりに使うもの（vite.web.config.ts が差し替える）。
// 拡張の Worker の中にも拡張の API はないので、同じく「ない」にする（log.ts は、ないときは記録を残さない）
import type { browser as ExtensionBrowser } from 'wxt/browser';

/** 拡張の API の代わり。Worker の中にはない */
export const browser = undefined as unknown as typeof ExtensionBrowser;
