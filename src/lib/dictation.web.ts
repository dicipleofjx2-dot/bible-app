/**
 * 말을 글로 받아 적기 — 웹 쪽.
 *
 * **브라우저에 들어 있는 음성 인식을 쓴다**(SpeechRecognition). 열쇠도, 돈도,
 * 새 묶음도 필요 없다. 사역자의 생애 이야기를 외부 받아쓰기 서비스로 통째로
 * 보내지 않아도 된다는 점이 이 선택의 진짜 이유다(0079 머리말의 §14 판단과
 * 같은 줄기다. 크롬은 구글 서버를 거치지만, 우리가 열쇠를 쥐고 원문을 쌓아 두는
 * 것과는 다르다 — 그래도 보안 지역 이야기는 받아쓰기를 끄고 녹음만 남기시라고
 * 화면에 적어 둔다).
 *
 * 사파리와 일부 브라우저에는 없다. 없으면 `supported: false` 로 조용히 물러서고
 * 녹음은 그대로 된다 — 받아쓰기는 덤이지 필수가 아니다.
 */
export type Dictation = {
  supported: boolean;
  start(handlers: { onText: (text: string, isFinal: boolean) => void; onError: (message: string) => void }): void;
  stop(): void;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function recognizerClass(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | null;
}

export function createDictation(lang = 'ko-KR'): Dictation {
  const Recognizer = recognizerClass();
  if (!Recognizer) {
    return {
      supported: false,
      start({ onError }) {
        onError('이 브라우저는 받아쓰기를 지원하지 않습니다. 녹음만 남습니다.');
      },
      stop() {},
    };
  }

  let recognizer: SpeechRecognitionLike | null = null;
  // 사용자가 멈춘 것인지, 브라우저가 조용하다고 혼자 끝낸 것인지 가른다.
  // 크롬은 몇 초만 조용해도 스스로 끝내 버리는데, 인터뷰는 말과 말 사이가 길다 —
  // 사용자가 멈추지 않았으면 다시 켠다.
  let stoppedByUser = false;

  return {
    supported: true,
    start({ onText, onError }) {
      stoppedByUser = false;
      const begin = () => {
        const r = new Recognizer();
        recognizer = r;
        r.lang = lang;
        r.continuous = true;
        r.interimResults = true;
        r.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i];
            const text = result[0]?.transcript ?? '';
            if (text) onText(text, !!result.isFinal);
          }
        };
        r.onerror = (event: any) => {
          const code = event?.error ?? '';
          // 조용해서 끊긴 것은 오류가 아니다. 말을 고르는 동안에도 일어난다.
          if (code === 'no-speech' || code === 'aborted') return;
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            stoppedByUser = true;
            onError('마이크 사용이 막혀 있습니다. 주소창 옆 자물쇠에서 마이크를 허용해 주세요.');
            return;
          }
          onError(`받아쓰기가 멈췄습니다 (${code}). 녹음은 계속됩니다.`);
        };
        r.onend = () => {
          if (!stoppedByUser) begin();
        };
        try {
          r.start();
        } catch {
          // 이미 돌고 있는데 또 start 하면 던진다. 무시해도 된다.
        }
      };
      begin();
    },
    stop() {
      stoppedByUser = true;
      try {
        recognizer?.stop();
      } catch {
        /* 이미 멈춰 있으면 그만이다 */
      }
      recognizer = null;
    },
  };
}
