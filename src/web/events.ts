// Web 版の、拡張の API と同じ形の出来事（addListener・removeListener・hasListener）

/** 拡張の API の出来事と同じ形 */
export interface WebEvent<T extends unknown[]> {
  /**
   * 受け取る関数を足す。
   * @param listener 出来事のときに呼ぶ
   */
  addListener(listener: (...args: T) => void): void;
  /**
   * 受け取る関数を外す。
   * @param listener 足した関数
   */
  removeListener(listener: (...args: T) => void): void;
  /**
   * 受け取る関数が足してあるか。
   * @param listener 調べる関数
   * @returns 足してあれば true
   */
  hasListener(listener: (...args: T) => void): boolean;
}

/** 出来事と、それを起こす関数 */
export interface WebEventSource<T extends unknown[]> {
  /** 外に渡す出来事 */
  readonly event: WebEvent<T>;
  /**
   * 足してある関数をすべて呼ぶ。
   * @param args 渡すもの
   */
  emit(...args: T): void;
}

/**
 * 出来事を作る。
 * @returns 出来事と、それを起こす関数
 */
export function createEvent<T extends unknown[]>(): WebEventSource<T> {
  const listeners = new Set<(...args: T) => void>();
  return {
    event: {
      addListener: (listener) => {
        listeners.add(listener);
      },
      removeListener: (listener) => {
        listeners.delete(listener);
      },
      hasListener: (listener) => listeners.has(listener),
    },
    emit: (...args) => {
      for (const listener of listeners) {
        listener(...args);
      }
    },
  };
}
