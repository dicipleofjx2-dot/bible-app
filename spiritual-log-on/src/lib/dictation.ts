'use client';

/**
 * 말을 글로 받아 적기 — **브라우저에 들어 있는 것**을 쓴다.
 *
 * 열쇠도, 돈도, 서버도 필요 없다. 그리고 무엇보다 **꿈과 예언의 원문을 외부
 * 받아쓰기 서비스로 통째로 보내지 않아도 된다**(기획서 §12 「모든 기록은 기본
 * 비공개」와 같은 줄기다. 크롬은 구글 서버를 거치지만, 우리가 열쇠를 쥐고 원문을
 * 쌓아 두는 것과는 다르다).
 *
 * 사파리와 일부 브라우저에는 없다. 없으면 조용히 물러서고 **녹음은 그대로 된다** —
 * 받아쓰기는 덤이지 필수가 아니다. 나중에 사람이 듣고 적으면 된다.
 */
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

export type Dictation = {
  supported: boolean;
  start(handlers: { onText: (text: string, isFinal: boolean) => void; onError: (message: string) => void }): void;
  stop(): void;
};

function recognizerClass(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recognition) | null;
}

export function createDictation(lang = 'ko-KR'): Dictation {
  const Recognizer = recognizerClass();
  if (!Recognizer) {
    return {
      supported: false,
      start: ({ onError }) => onError('이 브라우저는 받아쓰기를 지원하지 않습니다. 녹음만 남습니다.'),
      stop: () => {},
    };
  }

  let recognition: Recognition | null = null;
  // 크롬은 몇 초만 조용해도 혼자 끝낸다. 꿈을 떠올리며 말하는 사이는 길다 —
  // 사용자가 멈춘 것이 아니면 다시 켠다.
  let stoppedByUser = false;

  return {
    supported: true,
    start({ onText, onError }) {
      stoppedByUser = false;
      const begin = () => {
        const r = new Recognizer();
        recognition = r;
        r.lang = lang;
        r.continuous = true;
        r.interimResults = true;
        r.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i];
            onText(result[0].transcript, result.isFinal);
          }
        };
        r.onerror = (event) => {
          if (event.error === 'no-speech' || event.error === 'aborted') return;
          onError(event.error === 'not-allowed'
            ? '마이크를 쓸 수 없습니다. 브라우저 권한을 확인해 주세요.'
            : `받아쓰기가 멈췄습니다 (${event.error ?? '알 수 없음'}). 녹음은 계속됩니다.`);
        };
        r.onend = () => {
          if (!stoppedByUser) {
            try { begin(); } catch { /* 다시 켜지 못하면 녹음만 남는다 */ }
          }
        };
        r.start();
      };
      try { begin(); } catch (e) {
        onError(e instanceof Error ? e.message : '받아쓰기를 시작하지 못했습니다.');
      }
    },
    stop() {
      stoppedByUser = true;
      try { recognition?.stop(); } catch { /* 이미 끝났으면 그만 */ }
      recognition = null;
    },
  };
}
