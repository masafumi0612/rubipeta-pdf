import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { SAMPLE_PDF_PATH } from '@/config';
import { createLogger } from '@/log';

import { turnOnAutoRedirect } from './auto-redirect-section';
import { FeatureList } from './feature-list';
import { message } from './message';
import { openReader } from './open-pdf-section';
import { dismissWelcome, getWelcomeShown } from './welcome';

const log = createLogger('options');

/**
 * 入れた直後の案内を出すかを読み、閉じる関数と一緒に返す。
 * @returns 出すなら true（読み終わるまでは false）と、案内を閉じる関数
 */
export function useWelcome(): [boolean, () => void] {
  const [isShown, setIsShown] = useState(false);
  useEffect(() => {
    getWelcomeShown()
      .then(setIsShown)
      .catch((error: unknown) => {
        log.error('入れた直後の案内の状態を読むのに失敗しました', error);
      });
  }, []);
  const close = (): void => {
    setIsShown(false);
    dismissWelcome().catch((error: unknown) => {
      log.error('入れた直後の案内を閉じたことを残すのに失敗しました', error);
    });
  };
  return [isShown, close];
}

/** 入れた直後の案内に渡すもの */
interface WelcomeCardProps {
  /** 「PDF を開いたら、自動でルビを付ける」がオンなら true */
  readonly isAutoOn: boolean;
  /** 「閉じる」を押したときに呼ぶ */
  readonly onClose: () => void;
}

/**
 * 初めて入れた直後の案内。できることを並べ、自動でルビを付けるのをその場でオンにでき、同梱した見本の PDF を開けるようにする。
 * 入れたときに自動で許可を求めることはできない（許可の画面は、押した操作の中でしか出ない）ので、ここで押してもらう。
 * @param props 自動でルビを付けるかと、閉じるときに呼ぶ関数
 * @param props.isAutoOn 「PDF を開いたら、自動でルビを付ける」がオンなら true
 * @param props.onClose 「閉じる」を押したときに呼ぶ
 * @returns 案内の場所
 */
export function WelcomeCard({ isAutoOn, onClose }: WelcomeCardProps): JSX.Element {
  const [isAsking, setIsAsking] = useState(false);
  const turnOn = (): void => {
    if (isAsking) {
      return;
    }
    setIsAsking(true);
    turnOnAutoRedirect()
      .catch((error: unknown) => {
        log.error('入れた直後の案内から、自動でルビを付けるのをオンにするのに失敗しました', error);
      })
      .finally(() => {
        setIsAsking(false);
      });
  };
  // 見本は拡張の中にあるので、この画面と同じ起点の URL で開ける
  const openSample = (): void => {
    openReader(new URL(`/${SAMPLE_PDF_PATH}`, location.href).href);
  };

  return (
    <section class="welcome" aria-labelledby="welcome-title">
      <div class="heading welcome-text">
        <h2 id="welcome-title" class="welcome-title">
          {message('options_welcome_title')}
        </h2>
        <FeatureList titleId="welcome-features-title" />
        <p class="note">{message(isAutoOn ? 'options_welcome_leadOn' : 'options_welcome_lead')}</p>
      </div>
      <div class="row">
        {!isAutoOn && (
          <button type="button" class="button button-primary" disabled={isAsking} onClick={turnOn}>
            {message('options_welcome_turnOnAuto')}
          </button>
        )}
        <button
          type="button"
          class={isAutoOn ? 'button button-primary' : 'button button-outline'}
          onClick={openSample}
        >
          {message('options_welcome_trySample')}
        </button>
        <button type="button" class="button button-outline" onClick={onClose}>
          {message('options_welcome_close')}
        </button>
      </div>
    </section>
  );
}
