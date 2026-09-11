'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import { audioUrl, createRecords, getRecording, markProcessed, saveTranscript, type RecordDraft } from '@/lib/db';
import { KINDS, VISIBILITIES, type KindKey, type VisibilityKey } from '@/lib/kinds';
import { sentences } from '@/lib/korean';
import { organize, organizeTranscript, type Organized } from '@/lib/organize';
import { todaySeoul } from '@/lib/types';
import type { Recording } from '@/lib/types';

type Draft = Organized & {
  kind: KindKey;
  visibility: VisibilityKey;
  situation: string;
};

function toDraft(o: Organized, fallbackKind: KindKey): Draft {
  return {
    ...o,
    kind: (o.kindGuesses[0]?.kind ?? fallbackKind) as KindKey,
    visibility: 'private',
    situation: '',
  };
}

/**
 * AI 정리 확인 (기획서 §9).
 *
 * ── 이 화면이 보여 주는 것 ──────────────────────────────────────────
 * 정리문 옆에 **언제나 원문이 있다**(§16 「원문과 정리문을 언제든 비교한다」).
 * 정리는 덜어내기만 하므로 둘을 견주면 무엇이 빠졌는지 한눈에 보인다.
 *
 * 그리고 나누기·종류·태그는 전부 **추천이고 이유가 붙어 있다**(§8). 「왜 이렇게
 * 나누었는지」가 카드마다 적혀 있어서 사용자가 뒤집을 수 있다. 뒤집을 수 없는
 * 추천은 추천이 아니라 결정이다.
 */
function Review({ userId }: { userId: string }) {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const chosenKind = (params.get('kind') as KindKey | null) ?? 'etc';

  const [recording, setRecording] = useState<Recording | null>(null);
  const [transcript, setTranscript] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [sound, setSound] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const rebuild = useCallback((text: string) => {
    setDrafts(organizeTranscript(text, todaySeoul()).map((o) => toDraft(o, chosenKind)));
  }, [chosenKind]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const row = await getRecording(id);
      if (!alive) return;
      if (!row) {
        setNotice('녹음을 찾을 수 없습니다.');
        setLoading(false);
        return;
      }
      setRecording(row);
      setTranscript(row.transcript);
      rebuild(row.transcript);
      if (row.audio_path) setSound(await audioUrl(row.audio_path));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id, rebuild]);

  const patch = (index: number, next: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...next } : d)));

  const move = (index: number, by: number) =>
    setDrafts((prev) => {
      const target = index + by;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });

  const mergeDown = (index: number) =>
    setDrafts((prev) => {
      if (index >= prev.length - 1) return prev;
      const merged = organize(
        { text: `${prev[index].raw} ${prev[index + 1].raw}`.trim(), confidence: 1, why: '사용자가 합쳤습니다' },
        { date: todaySeoul() },
      );
      const copy = [...prev];
      copy.splice(index, 2, { ...toDraft(merged, prev[index].kind), visibility: prev[index].visibility, situation: prev[index].situation });
      return copy;
    });

  const splitAt = (index: number, sentenceIndex: number) =>
    setDrafts((prev) => {
      const all = sentences(prev[index].raw);
      if (sentenceIndex <= 0 || sentenceIndex >= all.length) return prev;
      const head = organize({ text: all.slice(0, sentenceIndex).join(' '), confidence: 1, why: '사용자가 나눴습니다' }, { date: todaySeoul() });
      const tail = organize({ text: all.slice(sentenceIndex).join(' '), confidence: 1, why: '사용자가 나눴습니다' }, { date: todaySeoul() });
      const copy = [...prev];
      copy.splice(index, 1, toDraft(head, prev[index].kind), toDraft(tail, prev[index].kind));
      return copy;
    });

  const save = async () => {
    setBusy(true);
    setNotice('');
    try {
      if (transcript !== recording?.transcript) await saveTranscript(id, transcript);
      const rows: RecordDraft[] = drafts.map((d, index) => ({
        recordingId: id,
        recordDate: recording?.recorded_on ?? todaySeoul(),
        kind: d.kind,
        title: d.title,
        rawText: d.raw,
        cleanText: d.clean,
        summary: d.summary.join(' '),
        situation: d.situation,
        tags: [...d.tags.topics, ...d.tags.emotions],
        people: d.tags.people,
        places: d.tags.places,
        verses: d.tags.verses,
        emotions: d.tags.emotions,
        symbols: d.tags.symbols,
        visibility: d.visibility,
        orderIndex: index,
      }));
      const saved = await createRecords(userId, rows);
      await markProcessed(id);
      router.push(saved.length === 1 ? `/records/${saved[0].id}` : '/archive');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '저장하지 못했습니다.');
      setBusy(false);
    }
  };

  if (loading) return <p className="muted">여는 중입니다…</p>;
  if (!recording) return <p className="card warn">{notice || '녹음을 찾을 수 없습니다.'}</p>;

  return (
    <div className="stack">
      <h1>정리한 내용을 확인해 주세요</h1>
      <p className="muted">
        아래 글은 <strong>말씀하신 것에서 군더더기만 덜어낸 것</strong>입니다. 없던 내용은 더하지
        않았습니다. 고치고 싶은 곳은 그대로 고쳐 쓰시면 됩니다.
      </p>

      {sound ? (
        <div className="card">
          <p className="muted" style={{ marginTop: 0 }}>녹음한 목소리 (글로 옮겨도 지우지 않습니다)</p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={sound} style={{ width: '100%' }} />
        </div>
      ) : null}

      <details className="card">
        <summary>받아쓴 원문 전체 보기·고치기</summary>
        <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} style={{ marginTop: 10 }} />
        <button type="button" onClick={() => rebuild(transcript)} style={{ marginTop: 8 }}>
          고친 원문으로 다시 정리하기
        </button>
        <p className="muted">빈 줄 하나가 「여기서부터 다른 기록」입니다.</p>
      </details>

      {drafts.map((draft, index) => (
        <DraftCard
          key={index}
          draft={draft}
          index={index}
          total={drafts.length}
          onPatch={(next) => patch(index, next)}
          onMove={(by) => move(index, by)}
          onMerge={() => mergeDown(index)}
          onSplit={(at) => splitAt(index, at)}
        />
      ))}

      {notice ? <p className="card warn">{notice}</p> : null}

      <button className="primary" type="button" onClick={save} disabled={busy || !drafts.length}>
        {busy ? '저장하는 중…' : `${drafts.length}개 기록으로 저장하기`}
      </button>
      <Link className="btn" href="/">나중에 하기</Link>
    </div>
  );
}

function DraftCard({
  draft, index, total, onPatch, onMove, onMerge, onSplit,
}: {
  draft: Draft;
  index: number;
  total: number;
  onPatch: (next: Partial<Draft>) => void;
  onMove: (by: number) => void;
  onMerge: () => void;
  onSplit: (at: number) => void;
}) {
  const parts = useMemo(() => sentences(draft.raw), [draft.raw]);
  const [splitAt, setSplitAt] = useState(1);

  return (
    <section className="card stack">
      <div className="spread">
        <strong>기록 {index + 1}</strong>
        <span className="row">
          {index > 0 ? <button type="button" onClick={() => onMove(-1)}>↑</button> : null}
          {index < total - 1 ? <button type="button" onClick={() => onMove(1)}>↓</button> : null}
        </span>
      </div>

      {draft.confidence < 0.9 ? (
        <p className="warn muted">
          여기서 나누는 것이 맞을까요? — {draft.why} (확신이 높지 않습니다)
        </p>
      ) : (
        <p className="muted">나눈 까닭: {draft.why}</p>
      )}

      <label htmlFor={`title-${index}`}>제목</label>
      <input id={`title-${index}`} value={draft.title} onChange={(e) => onPatch({ title: e.target.value })} />

      <label>종류 {draft.kindGuesses.length ? <span className="muted">— 추천: {draft.kindGuesses[0].label} ({draft.kindGuesses[0].why.join(', ')})</span> : null}</label>
      <div className="row">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            className={`chip ${draft.kind === k.key ? 'on' : ''}`}
            onClick={() => onPatch({ kind: k.key })}
          >
            {k.label}
          </button>
        ))}
      </div>

      <label htmlFor={`clean-${index}`}>정리된 기록</label>
      <textarea id={`clean-${index}`} value={draft.clean} onChange={(e) => onPatch({ clean: e.target.value })} />

      <details>
        <summary className="muted">말씀하신 원문</summary>
        <p style={{ whiteSpace: 'pre-wrap' }}>{draft.raw}</p>
      </details>

      {draft.summary.length ? (
        <details>
          <summary className="muted">핵심 요약 (원문에서 고른 문장입니다)</summary>
          <ul>{draft.summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </details>
      ) : null}

      <label htmlFor={`situation-${index}`}>당시 상황 (적고 싶으실 때만)</label>
      <input
        id={`situation-${index}`}
        value={draft.situation}
        onChange={(e) => onPatch({ situation: e.target.value })}
        placeholder="예: 새벽 기도 중"
      />

      <TagList tags={draft.tags} />

      <label>공개 범위</label>
      <div className="row">
        {VISIBILITIES.map((v) => (
          <button
            key={v.key}
            type="button"
            className={`chip ${draft.visibility === v.key ? 'on' : ''}`}
            onClick={() => onPatch({ visibility: v.key })}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="row">
        {index < total - 1 ? <button type="button" onClick={onMerge}>아래 기록과 합치기</button> : null}
        {parts.length > 1 ? (
          <>
            <select value={splitAt} onChange={(e) => setSplitAt(Number(e.target.value))} style={{ width: 'auto', flex: 1 }}>
              {parts.slice(1).map((s, i) => (
                <option key={i} value={i + 1}>{`${i + 2}번째 문장부터: ${s.slice(0, 18)}…`}</option>
              ))}
            </select>
            <button type="button" onClick={() => onSplit(splitAt)}>여기서 나누기</button>
          </>
        ) : null}
      </div>
    </section>
  );
}

function TagList({ tags }: { tags: Organized['tags'] }) {
  const groups: [string, string[]][] = [
    ['인물', tags.people],
    ['장소', tags.places],
    ['주제', tags.topics],
    ['감정', tags.emotions],
    ['말씀', tags.verses],
    ['반복해서 나온 말', tags.symbols],
  ];
  const shown = groups.filter(([, list]) => list.length);
  if (!shown.length) return null;
  return (
    <details>
      <summary className="muted">찾은 것 (추천입니다 — 확정은 직접 하십니다)</summary>
      {shown.map(([label, list]) => (
        <p key={label} className="row" style={{ marginTop: 6 }}>
          <span className="muted" style={{ minWidth: 110 }}>{label}</span>
          {list.map((item) => <span key={item} className="chip">{item}</span>)}
        </p>
      ))}
    </details>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="muted">여는 중입니다…</p>}>
      <AuthGate>{(userId) => <Review userId={userId} />}</AuthGate>
    </Suspense>
  );
}
