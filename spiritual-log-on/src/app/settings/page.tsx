'use client';

import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import { listNotes, listRecords } from '@/lib/db';
import { supabase } from '@/lib/supabase';

/** 설정 (§12 — 백업과 연결 상태). */
function Settings() {
  const [wp, setWp] = useState<{ configured: boolean; site: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch('/api/publish')
      .then((r) => r.json())
      .then(setWp)
      .catch(() => setWp({ configured: false, site: null }));
  }, []);

  /**
   * 전체 기록을 파일 하나로 내려받는다 (§12).
   *
   * 앱이 사라져도, 계정을 잃어도 기록은 남아야 한다. 음성 파일은 담지 않는다 —
   * 파일이 커서가 아니라, 서명 주소가 한 시간짜리라 파일 안에 넣어 두면 곧 죽은
   * 주소가 되기 때문이다. 목소리는 보관함에서 따로 내려받으시면 된다.
   */
  const backup = async () => {
    setBusy(true);
    setNotice('');
    try {
      const records = await listRecords();
      const notes = await Promise.all(records.map((r) => listNotes(r.id)));
      const payload = {
        exportedAt: new Date().toISOString(),
        records: records.map((record, i) => ({ ...record, notes: notes[i] })),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `영적기록ON-백업-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice(`${records.length}개 기록을 내려받았습니다.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '내려받지 못했습니다.');
    }
    setBusy(false);
  };

  return (
    <div className="stack">
      <h1>설정</h1>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>워드프레스 연결</h2>
        {wp === null ? (
          <p className="muted">확인 중입니다…</p>
        ) : wp.configured ? (
          <p>연결되어 있습니다. {wp.site}</p>
        ) : (
          <>
            <p className="muted">아직 연결되지 않았습니다.</p>
            <p className="muted">
              서버의 환경 변수에 <code>WORDPRESS_URL</code>, <code>WORDPRESS_USER</code>,
              <code> WORDPRESS_APP_PASSWORD</code> 를 넣어 주세요. 애플리케이션 비밀번호는 워드프레스
              관리자 → 사용자 → 프로필에서 발급합니다. <strong>로그인 비밀번호가 아닙니다.</strong>
            </p>
          </>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>백업</h2>
        <p className="muted">기록과 해석을 파일 하나로 내려받습니다. 음성은 포함되지 않습니다.</p>
        <button className="primary" type="button" onClick={backup} disabled={busy}>
          {busy ? '모으는 중…' : '전체 기록 내려받기'}
        </button>
      </section>

      {notice ? <p className="card warn">{notice}</p> : null}

      <button type="button" onClick={() => supabase().auth.signOut()}>로그아웃</button>
    </div>
  );
}

export default function Page() {
  return <AuthGate>{() => <Settings />}</AuthGate>;
}
