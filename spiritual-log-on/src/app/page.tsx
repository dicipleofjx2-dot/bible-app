'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import RecordRow from '@/components/RecordRow';
import { listAwaitingPublish, listRecords, listUnprocessed } from '@/lib/db';
import { todaySeoul } from '@/lib/types';
import type { Recording, SpiritRecord } from '@/lib/types';

/**
 * 홈 (기획서 §9).
 *
 * 맨 위가 큰 녹음 단추다. **10초 안에 녹음을 시작한다**(§16)는 성공 기준이
 * 화면 배치를 정했다 — 목록·통계·설정은 전부 그 아래로 내렸다.
 */
function Home({ userId }: { userId: string }) {
  const [today, setToday] = useState<SpiritRecord[]>([]);
  const [recent, setRecent] = useState<SpiritRecord[]>([]);
  const [pending, setPending] = useState<Recording[]>([]);
  const [awaiting, setAwaiting] = useState<SpiritRecord[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [records, unprocessed, toPublish] = await Promise.all([
        listRecords(),
        listUnprocessed(),
        listAwaitingPublish(),
      ]);
      const day = todaySeoul();
      setToday(records.filter((r) => r.record_date === day));
      setRecent(records.filter((r) => r.record_date !== day).slice(0, 5));
      setPending(unprocessed);
      setAwaiting(toPublish);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오지 못했습니다.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, userId]);

  return (
    <div className="stack">
      <Link className="record-big" href="/record" style={{ textAlign: 'center' }}>
        🎙️ 녹음하기
      </Link>
      <Link className="btn" href="/record?memo=1" style={{ width: '100%', textAlign: 'center' }}>
        ✏️ 짧게 메모하기
      </Link>

      {error ? <p className="card warn">{error}</p> : null}

      {pending.length ? (
        <section>
          <h2>아직 정리하지 않은 녹음</h2>
          {pending.map((r) => (
            <Link key={r.id} className="card spread" href={`/review/${r.id}`} style={{ display: 'flex' }}>
              <span>
                {r.recorded_on} · {r.seconds ? `${Math.round(r.seconds)}초` : '길이 모름'}
              </span>
              <span className="pill">정리하기</span>
            </Link>
          ))}
        </section>
      ) : null}

      <section>
        <h2>오늘의 기록</h2>
        {today.length ? (
          today.map((r) => <RecordRow key={r.id} record={r} />)
        ) : (
          <p className="muted">아직 오늘 기록이 없습니다.</p>
        )}
      </section>

      {recent.length ? (
        <section>
          <h2>최근 기록</h2>
          {recent.map((r) => <RecordRow key={r.id} record={r} />)}
        </section>
      ) : null}

      {awaiting.length ? (
        <section>
          <h2>블로그 발행 대기</h2>
          {awaiting.map((r) => (
            <Link key={r.id} className="card spread" href={`/publish/${r.id}`} style={{ display: 'flex' }}>
              <span>{r.title || '제목 없음'}</span>
              <span className="pill">발행하기</span>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}

export default function Page() {
  return <AuthGate>{(userId) => <Home userId={userId} />}</AuthGate>;
}
