'use client';

import Link from 'next/link';
import { kindLabel, statusLabel } from '@/lib/kinds';
import type { SpiritRecord } from '@/lib/types';

/** 목록에서 기록 한 줄. 홈과 보관함이 같은 모양을 쓴다. */
export default function RecordRow({ record }: { record: SpiritRecord }) {
  return (
    <Link className="card" href={`/records/${record.id}`} style={{ display: 'block' }}>
      <div className="spread">
        <strong>{record.title || '제목 없음'}</strong>
        <span className="pill">{kindLabel(record.kind)}</span>
      </div>
      <p className="muted" style={{ margin: '4px 0 0' }}>
        {record.record_date} · {statusLabel(record.status)}
      </p>
    </Link>
  );
}
