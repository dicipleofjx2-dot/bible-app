'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import RecordRow from '@/components/RecordRow';
import { listRecords } from '@/lib/db';
import { KINDS, kindLabel } from '@/lib/kinds';
import type { SpiritRecord } from '@/lib/types';

type Axis = 'date' | 'kind' | 'topic' | 'person' | 'place';

const AXES: { key: Axis; label: string }[] = [
  { key: 'date', label: '날짜별' },
  { key: 'kind', label: '종류별' },
  { key: 'topic', label: '주제별' },
  { key: 'person', label: '인물별' },
  { key: 'place', label: '장소별' },
];

/** 기록 보관함 (§9). 날짜·종류·주제·인물·장소로 모아 보고, 통합 검색이 있다. */
function Archive() {
  const [records, setRecords] = useState<SpiritRecord[]>([]);
  const [axis, setAxis] = useState<Axis>('date');
  const [kind, setKind] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listRecords({ kind: kind || undefined, q: q.trim() || undefined })
      .then((rows) => alive && setRecords(rows))
      .catch((e) => alive && setError(e instanceof Error ? e.message : '불러오지 못했습니다.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [kind, q]);

  const groups = useMemo(() => {
    const map = new Map<string, SpiritRecord[]>();
    const put = (key: string, record: SpiritRecord) => {
      const list = map.get(key) ?? [];
      list.push(record);
      map.set(key, list);
    };
    for (const record of records) {
      if (axis === 'date') put(record.record_date, record);
      else if (axis === 'kind') put(kindLabel(record.kind), record);
      else {
        const source = axis === 'topic' ? record.tags : axis === 'person' ? record.people : record.places;
        if (!source.length) put('표시 없음', record);
        else for (const value of source) put(value, record);
      }
    }
    return [...map.entries()].sort((a, b) =>
      axis === 'date' ? b[0].localeCompare(a[0]) : b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [records, axis]);

  return (
    <div className="stack">
      <h1>기록 보관함</h1>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="제목·본문에서 찾기"
        aria-label="통합 검색"
      />

      <div className="row">
        {AXES.map((a) => (
          <button key={a.key} type="button" className={`chip ${axis === a.key ? 'on' : ''}`} onClick={() => setAxis(a.key)}>
            {a.label}
          </button>
        ))}
      </div>

      <div className="row">
        <button type="button" className={`chip ${kind === '' ? 'on' : ''}`} onClick={() => setKind('')}>전체</button>
        {KINDS.map((k) => (
          <button key={k.key} type="button" className={`chip ${kind === k.key ? 'on' : ''}`} onClick={() => setKind(k.key)}>
            {k.label}
          </button>
        ))}
      </div>

      {error ? <p className="card warn">{error}</p> : null}
      {loading ? <p className="muted">찾는 중입니다…</p> : null}
      {!loading && !records.length ? <p className="muted">기록이 없습니다.</p> : null}

      {groups.map(([key, list]) => (
        <section key={key}>
          <h2>{key} <span className="pill">{list.length}</span></h2>
          {list.map((record) => <RecordRow key={`${key}-${record.id}`} record={record} />)}
        </section>
      ))}
    </div>
  );
}

export default function Page() {
  return <AuthGate>{() => <Archive />}</AuthGate>;
}
