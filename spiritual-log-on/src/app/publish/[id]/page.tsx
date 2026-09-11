'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import { getRecord, listNotes, recordPublication, updateRecord } from '@/lib/db';
import { blogHtml, blogMarkdown, buildSections, remainingNames, titleCandidates, type BlogInput } from '@/lib/blog';
import { kindLabel } from '@/lib/kinds';
import { supabase } from '@/lib/supabase';
import type { SpiritNote, SpiritRecord } from '@/lib/types';

const ALL_SECTIONS = [
  '당시 상황', '받은 내용', '당시의 느낌과 생각',
  '현재의 해석 또는 분별 상태', '관련 말씀', '이후 확인된 내용 또는 관련 사건',
];

/**
 * 블로그 발행 (기획서 §9·§10).
 *
 * ── 기본은 초안이다 ─────────────────────────────────────────────────
 * 꿈과 예언을 실수로 곧장 공개하는 쪽보다 초안함에 쌓이는 쪽이 낫다(§10 6번).
 * 「공개 발행」은 따로 눌러야 하고, 누를 때 무엇이 나가는지 한 번 더 묻는다.
 *
 * ── 이름은 사람이 확인한다 ──────────────────────────────────────────
 * 짝지어 준 이름만 바꾼다. 본문 속 이름을 기계가 모두 찾아 지우려 들면 반드시
 * 놓치는 것이 생기고, 놓친 하나가 사람을 다치게 한다. 그래서 바꾸지 않은 채 남은
 * 이름을 **발행 직전에 세어 보여 준다** — 지우는 것은 사람의 몫이다.
 */
function Publish({ userId }: { userId: string }) {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [record, setRecord] = useState<SpiritRecord | null>(null);
  const [notes, setNotes] = useState<SpiritNote[]>([]);
  const [title, setTitle] = useState('');
  const [omit, setOmit] = useState<string[]>([]);
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [imageNote, setImageNote] = useState('');
  const [categories, setCategories] = useState('');
  const [wpTags, setWpTags] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const row = await getRecord(id);
      if (!alive) return;
      setRecord(row);
      setTitle(row?.title ?? '');
      setAliases(Object.fromEntries((row?.people ?? []).map((p) => [p, ''])));
      if (row) setNotes(await listNotes(id));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  const input: BlogInput | null = useMemo(() => {
    if (!record) return null;
    const pick = (kind: string) => notes.filter((n) => n.note_kind === kind).map((n) => n.body).join('\n\n');
    const later = pick('later');
    const now = [pick('interpretation'), later].filter(Boolean).join('\n\n');
    return {
      title,
      kind: record.kind,
      recordDate: record.record_date,
      situation: record.situation,
      received: record.clean_text || record.raw_text,
      feeling: pick('feeling'),
      interpretation: now,
      status: record.status,
      verses: record.verses,
      events: notes
        .filter((n) => n.note_kind === 'event' || n.note_kind === 'confirm')
        .map((n) => ({ happenedOn: n.happened_on ?? undefined, body: n.body })),
      omit,
      aliases: Object.fromEntries(Object.entries(aliases).filter(([, v]) => v.trim())),
    };
  }, [record, notes, title, omit, aliases]);

  if (loading) return <p className="muted">여는 중입니다…</p>;
  if (!record || !input) return <p className="card warn">기록을 찾을 수 없습니다.</p>;

  const sections = buildSections(input);
  const preview = sections.map((s) => `${s.heading}\n${s.body}`).join('\n\n');
  const leftover = remainingNames(preview, input.aliases);
  const personal = record.kind === 'prophecy' && record.people.length > 0;

  const send = async (status: 'draft' | 'publish' | 'future') => {
    if (status !== 'draft') {
      const ok = window.confirm(
        status === 'publish'
          ? '지금 블로그에 공개합니다. 아래 미리보기에 있는 내용이 그대로 독자에게 보입니다. 계속할까요?'
          : '예약 발행으로 보냅니다. 정한 때가 되면 자동으로 공개됩니다. 계속할까요?',
      );
      if (!ok) return;
    }
    setBusy(true);
    setNotice('');
    try {
      const { data } = await supabase().auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({
          recordId: record.id,
          title: title || `${record.record_date} ${kindLabel(record.kind)} 기록`,
          html: blogHtml(input),
          status,
          date: status === 'future' ? scheduleAt : undefined,
          excerpt: imageNote || undefined,
          categories: categories.split(',').map((n) => Number(n.trim())).filter(Boolean),
          tags: wpTags.split(',').map((n) => Number(n.trim())).filter(Boolean),
        }),
      });
      const body = (await response.json()) as { id?: number; url?: string; status?: string; error?: string };
      if (!response.ok) {
        setNotice(body.error ?? '보내지 못했습니다.');
        setBusy(false);
        return;
      }
      await recordPublication({
        userId,
        recordId: record.id,
        remoteId: body.id ? String(body.id) : null,
        remoteUrl: body.url ?? null,
        remoteStatus: body.status ?? status,
        title,
      });
      if (record.visibility !== 'blog') await updateRecord(record.id, { visibility: 'blog' });
      router.push(`/records/${record.id}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '보내지 못했습니다.');
      setBusy(false);
    }
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(blogMarkdown(input));
      setNotice('마크다운을 복사했습니다. Blog ON 편집기에 붙여 넣으시면 됩니다.');
    } catch {
      setNotice('복사하지 못했습니다. 아래 미리보기를 직접 긁어 복사해 주세요.');
    }
  };

  return (
    <div className="stack">
      <h1>블로그 글 만들기</h1>

      {personal ? (
        <p className="card warn">
          개인을 향해 받았다고 기록하신 내용입니다. 공개 전에 그 사람에게 확인하셨는지,
          이름이 드러나지 않는지 한 번 더 살펴 주세요.
        </p>
      ) : null}

      <section>
        <h2>제목</h2>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="row" style={{ marginTop: 8 }}>
          {titleCandidates({ title: record.title, recordDate: record.record_date, kind: record.kind, received: input.received })
            .map((candidate) => (
              <button key={candidate} type="button" className="chip" onClick={() => setTitle(candidate)}>
                {candidate}
              </button>
            ))}
        </div>
        <p className="muted">후보는 기록에 있는 말에서 골랐습니다. 새로 지어내지 않았습니다.</p>
      </section>

      <section>
        <h2>공개하지 않을 부분</h2>
        {ALL_SECTIONS.map((heading) => (
          <label key={heading} className="row">
            <input
              type="checkbox"
              style={{ width: 20 }}
              checked={omit.includes(heading)}
              onChange={(e) => setOmit((prev) => (e.target.checked ? [...prev, heading] : prev.filter((h) => h !== heading)))}
            />
            <span>{heading} 빼기</span>
          </label>
        ))}
      </section>

      <section>
        <h2>실명 가리기</h2>
        {record.people.length ? (
          record.people.map((person) => (
            <div key={person} className="row" style={{ marginTop: 8 }}>
              <span className="chip" style={{ minWidth: 96 }}>{person}</span>
              <input
                style={{ flex: 1 }}
                value={aliases[person] ?? ''}
                onChange={(e) => setAliases((prev) => ({ ...prev, [person]: e.target.value }))}
                placeholder="예: 남편, 첫째 아이, 교회 지인"
              />
            </div>
          ))
        ) : (
          <p className="muted">기록에서 찾은 이름이 없습니다.</p>
        )}
        {leftover.length ? (
          <p className="card warn">
            아직 이름으로 보이는 말이 본문에 남아 있습니다: {leftover.join(', ')} — 바꿀 이름을 위에 적어 주세요.
          </p>
        ) : null}
      </section>

      <section>
        <h2>미리보기</h2>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{title || '제목 없음'}</h3>
          <p className="muted">{record.record_date} · {kindLabel(record.kind)}</p>
          {sections.map((s) => (
            <div key={s.heading}>
              <h4>{s.heading}</h4>
              <p style={{ whiteSpace: 'pre-wrap' }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <details className="card">
        <summary>워드프레스 설정 (선택)</summary>
        <label htmlFor="image">대표 이미지 문구 / 요약</label>
        <input id="image" value={imageNote} onChange={(e) => setImageNote(e.target.value)} placeholder="대표 이미지에 넣을 문구나 글 요약" />
        <label htmlFor="cats">카테고리 번호 (쉼표로)</label>
        <input id="cats" value={categories} onChange={(e) => setCategories(e.target.value)} placeholder="예: 5, 12" />
        <label htmlFor="wptags">태그 번호 (쉼표로)</label>
        <input id="wptags" value={wpTags} onChange={(e) => setWpTags(e.target.value)} placeholder="예: 30, 31" />
        <label htmlFor="when">예약 발행할 때</label>
        <input id="when" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
        <p className="muted">워드프레스는 카테고리·태그를 번호로 받습니다. 관리자 화면의 주소에서 확인하실 수 있습니다.</p>
      </details>

      {notice ? <p className="card warn">{notice}</p> : null}

      <div className="row">
        <button className="primary" type="button" onClick={() => send('draft')} disabled={busy}>
          {busy ? '보내는 중…' : '초안으로 보내기'}
        </button>
        <button type="button" onClick={() => send('future')} disabled={busy || !scheduleAt}>예약 발행</button>
        <button type="button" onClick={() => send('publish')} disabled={busy}>공개 발행</button>
      </div>
      <button type="button" onClick={copyMarkdown}>Blog ON 용 마크다운 복사</button>
      <Link className="btn" href={`/records/${record.id}`}>돌아가기</Link>
    </div>
  );
}

export default function Page() {
  return <AuthGate>{(userId) => <Publish userId={userId} />}</AuthGate>;
}
