import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithKakao: () => Promise<{ error: string | null }>;
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
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  /**
   * 카카오로 들어오기.
   *
   * 스마트주보와 **같은 계정**이 되어야 한다. 그래서 scopes 에 account_email 을
   * 넣는다 — Supabase 는 이메일이 같을 때만 기존 계정에 이어 붙인다. 이걸
   * 빠뜨리면 카카오가 이메일을 안 주고, 같은 사람이 계정을 하나 더 갖게 된다.
   *
   * 웹과 앱이 돌아오는 길이 다르다.
   *   · 웹: 브라우저가 그대로 카카오로 갔다가 주소창에 토큰을 달고 돌아온다.
   *     supabase-js 가 detectSessionInUrl 로 주워 간다.
   *   · 앱: 주소창이 없다. 안에서 창을 하나 띄우고(openAuthSessionAsync),
   *     bibleapp:// 로 돌아온 주소에서 토큰을 직접 꺼내 세션을 연다.
   */
  async function signInWithKakao() {
    const isWeb = Platform.OS === 'web';
    const redirectTo = isWeb
      ? `${window.location.origin}/`
      : Linking.createURL('/');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo,
        scopes: 'profile_nickname account_email',
        skipBrowserRedirect: !isWeb,
      },
    });
    if (error) return { error: error.message };

    // 웹은 여기서 이미 카카오로 넘어가는 중이다. 더 할 일이 없다.
    if (isWeb) return { error: null };
    if (!data?.url) return { error: '카카오 로그인 주소를 받지 못했습니다.' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    // 사용자가 창을 닫은 것은 오류가 아니다. 빨간 글씨를 띄우지 않는다.
    if (result.type !== 'success') return { error: null };

    // 토큰은 # 뒤에 온다. URL 클래스가 그 조각은 안 풀어 주므로 직접 자른다.
    //
    // ⚠️ supabase-js 의 flowType 기본값이 'implicit' 이라서 이렇게 온다.
    //    lib/supabase.ts 에서 flowType: 'pkce' 로 바꾸면 #access_token 대신
    //    ?code= 가 오고, 여기는 조용히 "로그인을 마치지 못했습니다"만 낸다.
    //    그때는 exchangeCodeForSession 으로 갈아타야 한다.
    const fragment = result.url.split('#')[1] ?? '';
    const params = new URLSearchParams(fragment);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) {
      return { error: params.get('error_description') ?? '로그인을 마치지 못했습니다.' };
    }

    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
    return { error: sessionError?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signInWithKakao, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
