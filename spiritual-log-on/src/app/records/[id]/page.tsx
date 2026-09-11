'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import {
  addNote, audioUrl, deleteRecord, getRecord, getRecording, listNotes,
  listPublications, listRecords, updateRecord,
} from '@/lib/db';
import {
  NOTE_KINDS, STATUSES, VISIBILITIES, kindLabel, noteKindLabel, statusLabel, visibilityLabel,
  type NoteKind, type StatusKey, type VisibilityKey,
} from '@/lib/kinds';
import { overlap } from '@/lib/korean';
import type { Publication, SpiritNote, SpiritRecord } from '@/lib/types';

/**
 * 기록 상세 (기획서 §9·§7).
 *
 * ── 덮어쓰지 않는다 ─────────────────────────────────────────────────
 * 해석과 관련 사건은 본문을 고치는 것이 아니라 **아래에 쌓인다.** 3년 뒤에 이해한
 * 것이 그때 적어 둔 것을 지워 버리면, 무엇을 먼저 알았고 무엇을 나중에 알았는지
 * 알 수 없게 된다 — 그 순서가 이 기록의 값어치다.
 */
function Detail({ userId }: { userId: string }) {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [record, setRecord] = useState<SpiritRecord | null>(null);
  const [notes, setNotes] = useState<SpiritNote[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [related, setRelated] = useState<SpiritRecord[]>([]);
  const [sound, setSound] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const [noteKind, setNoteKind] = useState<NoteKind>('later');
  const [noteBody, setNoteBody] = useState('');
  const [happenedOn, setHappenedOn] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const row = await getRecord(id);
      if (!alive) return;
      setRecord(row);
      setLoading(false);
      if (!row) return;
      const [noteRows, pubs, all] = await Promise.all([listNotes(id), listPublications(id), listRecords()]);
      if (!alive) return;
      setNotes(noteRows);
      setPublications(pubs);
      // 「연결된 기록」 — 같은 낱말을 많이 쓴 기록. 뜻을 판단하지 않고 겹침만 센다.
      setRelated(
        all
          .filter((r) => r.id !== row.id)
          .map((r) => ({ r, score: overlap(row.clean_text || row.raw_text, r.clean_text || r.raw_text) }))
          .filter((x) => x.score >= 0.3)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((x) => x.r),
      );
      if (row.recording_id) {
        const recording = await getRecording(row.recording_id);
        if (alive && recording?.audio_path) setSound(await audioUrl(recording.audio_path));
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) return <p className="muted">여는 중입니다…</p>;
  if (!record) return <p className="card warn">기록을 찾을 수 없습니다.</p>;

  const setStatus = async (status: StatusKey) => {
    setRecord({ ...record, status });
    await updateRecord(id, { status }).catch(() => setNotice('상태를 바꾸지 못했습니다.'));
  };

  const setVisibility = async (visibility: VisibilityKey) => {
    setRecord({ ...record, visibility });
    await updateRecord(id, { visibility }).catch(() => setNotice('공개 범위를 바꾸지 못했습니다.'));
  };

  const submitNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!noteBody.trim()) return;
    try {
      const note = await addNote({
        userId, recordId: id, noteKind, body: noteBody.trim(),
        happenedOn: noteKind === 'event' ? happenedOn || null : null,
      });
      setNotes((prev) => [...prev, note]);
      setNoteBody('');
      setHappenedOn('');
      // 관련 사건을 적으면 상태도 따라 올린다 — 적어 놓고 상태가 그대로면 찾을 때 안 걸린다.
      if (noteKind === 'event' && record.status === 'recorded') void setStatus('related');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '적지 못했습니다.');
    }
  };

  const remove = async () => {
    if (!window.confirm('이 기록을 지웁니다. 해석과 관련 사건도 함께 사라집니다. 계속할까요?')) return;
    await deleteRecord(id);
    router.push('/archive');
  };

  return (
    <div className="stack">
      <h1>{record.title || '제목 없음'}</h1>
      <p className="muted">
        {record.record_date} · {kindLabel(record.kind)} · {visibilityLabel(record.visibility)}
      </p>

      {record.situation ? <p className="muted">당시 상황: {record.situation}</p> : null}

      <section className="card">
        <h2 style={{ marginTop: 0 }}>받은 내용</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{record.clean_text || record.raw_text}</p>
        {record.raw_text && record.raw_text !== record.clean_text ? (
          <details>
            <summary className="muted">말씀하신 원문</summary>
            <p style={{ whiteSpace: 'pre-wrap' }}>{record.raw_text}</p>
          </details>
        ) : null}
        {sound ? (
          <>
            <p className="muted">녹음한 목소리</p>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={sound} style={{ width: '100%' }} />
          </>
        ) : null}
      </section>

      <Chips label="인물" list={record.people} />
      <Chips label="장소" list={record.places} />
      <Chips label="주제" list={record.tags} />
      <Chips label="말씀" list={record.verses} />
      <Chips label="반복해서 나온 말" list={record.symbols} />

      <section>
        <h2>분별 상태</h2>
        <div className="row">
          {STATUSES.map((s) => (
            <button key={s.key} type="button" className={`chip ${record.status === s.key ? 'on' : ''}`} onClick={() => setStatus(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>해석과 관련 사건</h2>
        <p className="muted">
          이미 적은 것은 <strong>지워지지 않습니다.</strong> 새로 이해한 것은 아래에 날짜순으로 쌓입니다.
        </p>
        {notes.length ? (
          notes.map((note) => (
            <div key={note.id} className="card">
              <div className="spread">
                <span className="pill">{noteKindLabel(note.note_kind)}</span>
                <span className="muted">
                  {note.happened_on ? `일어난 날 ${note.happened_on} · ` : ''}
                  {note.created_at.slice(0, 10)}
                </span>
              </div>
              <p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{note.body}</p>
            </div>
          ))
        ) : (
          <p className="muted">아직 적은 것이 없습니다.</p>
        )}

        <form className="card stack" onSubmit={submitNote}>
          <div className="row">
            {NOTE_KINDS.map((n) => (
              <button key={n.key} type="button" className={`chip ${noteKind === n.key ? 'on' : ''}`} onClick={() => setNoteKind(n.key)}>
                {n.label}
              </button>
            ))}
          </div>
          <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="적을 내용" />
          {noteKind === 'event' ? (
            <>
              <label htmlFor="happened">그 일이 일어난 날</label>
              <input id="happened" type="date" value={happenedOn} onChange={(e) => setHappenedOn(e.target.value)} />
            </>
          ) : null}
          <button className="primary" type="submit">덧붙이기</button>
        </form>
      </section>

      {related.length ? (
        <section>
          <h2>연결된 기록</h2>
          <p className="muted">같은 말이 자주 나오는 기록입니다. 뜻이 이어지는지는 직접 보셔야 합니다.</p>
          {related.map((r) => (
            <Link key={r.id} className="card spread" href={`/records/${r.id}`} style={{ display: 'flex' }}>
              <span>{r.title || '제목 없음'}</span>
              <span className="pill">{r.record_date}</span>
            </Link>
          ))}
        </section>
      ) : null}

      <section>
        <h2>공개 범위</h2>
        <div className="row">
          {VISIBILITIES.map((v) => (
            <button key={v.key} type="button" className={`chip ${record.visibility === v.key ? 'on' : ''}`} onClick={() => setVisibility(v.key)}>
              {v.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>블로그</h2>
        {publications.length ? (
          publications.map((p) => (
            <div key={p.id} className="card spread">
              <span>{p.title}</span>
              <span className="row">
                <span className="pill">{p.remote_status === 'draft' ? '초안' : p.remote_status}</span>
                {p.remote_url ? <a href={p.remote_url} target="_blank" rel="noreferrer">열기</a> : null}
              </span>
            </div>
          ))
        ) : (
          <p className="muted">아직 보내지 않았습니다.</p>
        )}
        <Link className="btn primary" href={`/publish/${record.id}`}>블로그 글 만들기</Link>
      </section>

      {notice ? <p className="card warn">{notice}</p> : null}
      <button type="button" onClick={remove} style={{ color: 'var(--danger)' }}>이 기록 지우기</button>
    </div>
  );
}

function Chips({ label, list }: { label: string; list: string[] }) {
  if (!list?.length) return null;
  return (
    <p className="row">
      <span className="muted" style={{ minWidth: 110 }}>{label}</span>
      {list.map((item) => <span key={item} className="chip">{item}</span>)}
    </p>
  );
}

export default function Page() {
  return <AuthGate>{(userId) => <Detail userId={userId} />}</AuthGate>;
}
