/**
 * 말을 글로 받아 적기 — 네이티브(앱) 쪽.
 *
 * 앱에는 아직 받아쓰기가 없다. 기기 안에서 도는 받아쓰기를 쓰려면 새 네이티브
 * 묶음을 싣고 APK 를 다시 구워야 하는데(이 계정은 EAS 무료 할당이라 빌드가
 * 귀하다), **녹음은 그것 없이도 된다.** 그래서 앱에서는 녹음만 하고, 글로
 * 옮기는 일은 나중에 웹에서 하거나 사람이 받아 적는다.
 *
 * 화면은 `supported` 하나만 보고 갈라지므로, 나중에 앱 받아쓰기를 붙일 때
 * 이 파일만 바꾸면 된다.
 */
export type Dictation = {
  supported: boolean;
  start(handlers: { onText: (text: string, isFinal: boolean) => void; onError: (message: string) => void }): void;
  stop(): void;
};

export function createDictation(): Dictation {
  return {
    supported: false,
    start({ onError }) {
      onError('앱에서는 아직 받아쓰기를 못 합니다. 녹음만 남깁니다.');
    },
    stop() {},
  };
}
