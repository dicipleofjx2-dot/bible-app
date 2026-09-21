import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * 로그인.
 *
 * **데이빗바이블과 같은 Supabase 프로젝트를 쓴다.** 그래서 이미 쓰던
 * 이메일·비밀번호가 여기서도 그대로 통한다 — 집안일 하나 체크하려고 계정을
 * 또 만들게 하지 않는다.
 *
 * 카카오 로그인은 아직 넣지 않았다. 돌아오는 주소를 Supabase 허용목록에 새로
 * 올려야 하는데, 그건 이 앱의 주소가 정해진 다음의 일이다.
 */

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    // 메일 확인을 켜 둔 프로젝트에서는 세션 없이 돌아온다. 그때 「가입됐습니다」
    // 만 적고 넘기면, 메일함을 안 열어 본 사람이 영영 못 들어온다.
    return { error: error?.message ?? null, needsConfirm: !error && !data.session };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth 는 AuthProvider 안에서만 쓸 수 있습니다.');
  return value;
}
