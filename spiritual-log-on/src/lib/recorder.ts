'use client';

/**
 * 녹음 — `MediaRecorder` 하나로 한다.
 *
 * **파일 종류를 확장자에서 짐작하지 않는다.** 브라우저마다 webm 으로도 mp4 로도
 * 떨어지는데, 이름만 `.m4a` 로 붙여 두면 속은 webm 인 파일이 되어 나중에 어떤
 * 브라우저에서는 재생이 안 된다. 녹음기가 실제로 쓴 `mimeType` 을 그대로 쓴다.
 */
export type Recorder = {
  stream: MediaStream;
  recorder: MediaRecorder;
  stop(): Promise<{ blob: Blob; type: string; ext: string }>;
};

const PREFERRED = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

function pickType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return PREFERRED.find((t) => MediaRecorder.isTypeSupported(t));
}

export function extensionFor(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  recorder.start(1000);

  return {
    stream,
    recorder,
    stop() {
      return new Promise((resolve) => {
        recorder.onstop = () => {
          const type = recorder.mimeType || mimeType || 'audio/webm';
          stream.getTracks().forEach((track) => track.stop());
          resolve({ blob: new Blob(chunks, { type }), type, ext: extensionFor(type) });
        };
        if (recorder.state !== 'inactive') recorder.stop();
        else recorder.onstop?.(new Event('stop'));
      });
    },
  };
}
