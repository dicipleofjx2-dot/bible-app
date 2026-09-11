'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * 로그인한 사람에게만 화면을 준다.
 *
 * 이 앱의 모든 화면이 본인 기록을 다루므로 문은 하나뿐이다. 표에도 정책이
 * 걸려 있으니(0001) 이 문을 우회해도 남의 기록은 열리지 않는다 — 화면은 편의고
 * 자물쇠는 표에 있다.
 */
export function useUserId(): { userId: string | null; loading: boolean } {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase()
      .auth.getSession()
      .then(({ data }) => {
        if (!alive) return;
        setUserId(data.session?.user.id ?? null);
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    const { data: sub } = supabase().auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { userId, loading };
}

export default function AuthGate({ children }: { children: (userId: string) => React.ReactNode }) {
  const { userId, loading } = useUserId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <p className="muted">여는 중입니다…</p>;
  if (userId) return <>{children(userId)}</>;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const auth = supabase().auth;
    const { error } =
      mode === 'in'
        ? await auth.signInWithPassword({ email, password })
        : await auth.signUp({ email, password });
    setBusy(false);
    if (error) setMessage(error.message);
    else if (mode === 'up') setMessage('가입 확인 메일을 보냈습니다. 메일을 열어 확인해 주세요.');
  };

  return (
    <form className="card stack" onSubmit={submit}>
      <h1>영적기록ON</h1>
      <p className="muted">
        꿈·환상·예언·감동을 말로 남기면 글로 정리해 보관합니다. 모든 기록은 기본 비공개입니다.
      </p>
      <label htmlFor="email">이메일</label>
      <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <label htmlFor="password">비밀번호</label>
      <input
        id="password"
        type="password"
        autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button className="primary" type="submit" disabled={busy}>
        {busy ? '기다려 주세요…' : mode === 'in' ? '로그인' : '가입하기'}
      </button>
      <button type="button" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
        {mode === 'in' ? '처음이신가요? 가입하기' : '이미 계정이 있습니다'}
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  );
}
