'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import { createDictation, type Dictation } from '@/lib/dictation';
import { createRecording, uploadAudio } from '@/lib/db';
import { KINDS, type KindKey } from '@/lib/kinds';
import { startRecording, type Recorder } from '@/lib/recorder';
import { todaySeoul } from '@/lib/types';

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * 녹음 화면 (기획서 §9).
 *
 * ── 이 화면이 지키는 것 ──────────────────────────────────────────────
 * **멈추면 그 자리에서 저장한다.** 저장 단추를 따로 누르게 해 두면, 새벽에 꿈을
 * 말하고 화면을 닫은 사람의 기록이 통째로 사라진다. 「멈추기」가 곧 저장이다.
 *
 * **받아쓰기가 안 되어도 녹음은 된다.** 사파리에는 받아쓰기가 없고, 크롬도 중간에
 * 끊긴다. 그때도 목소리는 남으므로 나중에 글로 옮길 수 있다 — 반대는 안 된다.
 *
 * **종류를 먼저 고르지 않아도 된다**(§3 「고르거나 바로 말한다」). 잊히기 전에
 * 말하는 것이 먼저다. 종류는 정리 화면에서 추천과 함께 고른다.
 */
function RecordScreen({ userId }: { userId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const memoOnly = params.get('memo') === '1';

  const [kind, setKind] = useState<KindKey | ''>('');
  const [state, setState] = useState<'idle' | 'recording' | 'paused' | 'saving'>('idle');
  const [seconds, setSeconds] = useState(0);
  /** 이미 끝낸 토막들. 「새 기록으로 나누기」를 누를 때마다 하나씩 쌓인다. */
  const [segments, setSegments] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [interim, setInterim] = useState('');
  const [notice, setNotice] = useState('');
  const [dictationOn, setDictationOn] = useState(true);

  const recorderRef = useRef<Recorder | null>(null);
  const dictationRef = useRef<Dictation | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supported = useRef<boolean>(true);

  useEffect(() => {
    supported.current = createDictation().supported;
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      dictationRef.current?.stop();
      recorderRef.current?.recorder.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startDictation = useCallback(() => {
    if (!dictationOn) return;
    const dictation = createDictation();
    dictationRef.current = dictation;
    if (!dictation.supported) {
      setNotice('이 브라우저는 받아쓰기를 지원하지 않습니다. 녹음만 남습니다 — 나중에 글로 옮길 수 있습니다.');
      return;
    }
    dictation.start({
      onText: (text, isFinal) => {
        if (isFinal) {
          setCurrent((prev) => `${prev} ${text}`.replace(/\s+/g, ' ').trim());
          setInterim('');
        } else {
          setInterim(text);
        }
      },
      onError: (message) => setNotice(message),
    });
  }, [dictationOn]);

  const begin = async () => {
    setNotice('');
    try {
      if (!memoOnly) recorderRef.current = await startRecording();
    } catch {
      setNotice('마이크를 열지 못했습니다. 권한을 확인해 주세요. 글로 적는 것은 그대로 됩니다.');
    }
    startDictation();
    setState('recording');
    tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const pause = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    dictationRef.current?.stop();
    try { recorderRef.current?.recorder.pause(); } catch { /* 지원하지 않는 브라우저도 있다 */ }
    setState('paused');
  };

  const resume = () => {
    try { recorderRef.current?.recorder.resume(); } catch { /* 위와 같다 */ }
    startDictation();
    tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    setState('recording');
  };

  /** 「여기서부터 다른 기록」 — 본문에 말을 끼워 넣지 않고 자리만 기억한다. */
  const splitHere = () => {
    const text = `${current} ${interim}`.trim();
    if (!text) {
      setNotice('아직 이 토막에 옮겨진 말이 없습니다.');
      return;
    }
    setSegments((prev) => [...prev, text]);
    setCurrent('');
    setInterim('');
    setNotice('여기까지를 한 기록으로 두었습니다. 이어서 말씀하세요.');
  };

  const finish = async () => {
    if (tickRef.current) clearInterval(tickRef.current);
    dictationRef.current?.stop();
    setState('saving');

    const all = [...segments, `${current} ${interim}`.trim()].filter(Boolean);
    const transcript = all.join('\n\n');

    let audioPath: string | null = null;
    try {
      const recorder = recorderRef.current;
      if (recorder) {
        const { blob, ext } = await recorder.stop();
        if (blob.size > 0) audioPath = await uploadAudio(userId, blob, ext);
      }
    } catch (e) {
      setNotice(`녹음 파일을 올리지 못했습니다: ${e instanceof Error ? e.message : '알 수 없음'}`);
    }

    if (!audioPath && !transcript.trim()) {
      setNotice('남은 것이 없습니다. 다시 시도해 주세요.');
      setState('idle');
      return;
    }

    try {
      const recording = await createRecording({
        userId,
        audioPath,
        seconds: seconds || null,
        transcript,
        recordedOn: todaySeoul(),
      });
      const query = kind ? `?kind=${kind}` : '';
      router.push(`/review/${recording.id}${query}`);
    } catch (e) {
      setNotice(`저장하지 못했습니다: ${e instanceof Error ? e.message : '알 수 없음'}`);
      setState('paused');
    }
  };

  const live = `${current} ${interim}`.trim();

  return (
    <div className="stack">
      <h1>{memoOnly ? '짧게 메모하기' : '녹음하기'}</h1>

      <section>
        <p className="muted">종류는 나중에 골라도 됩니다. 잊히기 전에 먼저 말씀하세요.</p>
        <div className="row">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              className={`chip ${kind === k.key ? 'on' : ''}`}
              onClick={() => setKind(kind === k.key ? '' : k.key)}
            >
              {k.label}
            </button>
          ))}
        </div>
      </section>

      {state === 'idle' ? (
        <>
          {!memoOnly ? (
            <button className="record-big" type="button" onClick={begin}>
              🎙️ 녹음 시작
            </button>
          ) : (
            <button className="record-big" type="button" onClick={begin}>
              ✏️ 적기 시작
            </button>
          )}
          <label className="row" style={{ marginTop: 12 }}>
            <input
              type="checkbox"
              style={{ width: 20 }}
              checked={dictationOn}
              onChange={(e) => setDictationOn(e.target.checked)}
            />
            <span>말하는 동안 글로 받아 적기</span>
          </label>
          <p className="muted">
            끄면 <strong>목소리만</strong> 남습니다. 민감한 내용을 남기실 때는 꺼 두셔도 됩니다 —
            나중에 직접 글로 옮길 수 있습니다.
          </p>
        </>
      ) : (
        <div className={`card ${state === 'recording' ? 'recording' : ''}`}>
          <div className="spread">
            <span className="clock">{clock(seconds)}</span>
            <span className="pill">{state === 'recording' ? '기록 중' : state === 'paused' ? '멈춤' : '저장 중'}</span>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            {state === 'recording' ? (
              <button type="button" onClick={pause}>⏸ 잠시 멈춤</button>
            ) : state === 'paused' ? (
              <button type="button" onClick={resume}>▶ 이어서</button>
            ) : null}
            <button type="button" onClick={splitHere} disabled={state === 'saving'}>
              ✂️ 새 기록으로 나누기
            </button>
            <button className="primary" type="button" onClick={finish} disabled={state === 'saving'}>
              {state === 'saving' ? '저장하는 중…' : '✅ 멈추고 저장하기'}
            </button>
          </div>
          {segments.length ? (
            <p className="muted" style={{ marginTop: 10 }}>
              지금까지 {segments.length + 1}개의 기록으로 나누어 두었습니다.
            </p>
          ) : null}
        </div>
      )}

      {state !== 'idle' ? (
        <section>
          <label htmlFor="live">지금 옮겨지는 글</label>
          <textarea
            id="live"
            value={live}
            onChange={(e) => {
              setCurrent(e.target.value);
              setInterim('');
            }}
            placeholder="말씀하시면 여기에 옮겨집니다. 직접 고쳐 쓰셔도 됩니다."
          />
          <p className="muted">
            받아쓴 글이 틀려도 괜찮습니다. <strong>목소리는 그대로 남습니다.</strong>
          </p>
        </section>
      ) : null}

      {notice ? <p className="card warn">{notice}</p> : null}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="muted">여는 중입니다…</p>}>
      <AuthGate>{(userId) => <RecordScreen userId={userId} />}</AuthGate>
    </Suspense>
  );
}
