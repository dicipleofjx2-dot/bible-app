import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { supabase } from '@/lib/supabase';

/**
 * 교회운영ON 에서 넘어오는 문(§연동).
 *
 * 두 앱은 **같은 Supabase 프로젝트**를 쓰지만 주소(origin)가 다르다. 브라우저는
 * 저장소를 주소별로 가르므로, 저쪽에서 로그인했다고 이쪽 세션이 생기지 않는다.
 * 그래서 저쪽이 자기 세션의 토큰을 **주소의 우물정(#) 뒤에** 실어 보내면, 이
 * 화면이 그걸로 세션을 연다.
 *
 * 왜 `?`(질의) 가 아니라 `#`(조각) 인가 — 조각은 서버로 전송되지 않는다.
 * 질의에 실으면 Vercel 접근 기록과 중간 장비의 로그에 토큰이 그대로 남는다.
 *
 * 저쪽(교회운영ON)에서 만드는 주소:
 *   const { data } = await supabase.auth.getSession();
 *   location.href = `https://<이-앱-주소>/handoff#access_token=${d.session.access_token}`
 *                 + `&refresh_token=${d.session.refresh_token}&next=${encodeURIComponent('/')}`;
 *
 * 토큰을 넘기지 않고 그냥 `/handoff?next=/` 로 보내도 된다 — 그때는 이 화면이
 * 로그인 화면으로 넘긴다. 사람이 한 번 더 로그인할 뿐 길은 끊기지 않는다.
 */
export default function HandoffScreen() {
  const params = useLocalSearchParams<{ next?: string }>();
  const [message, setMessage] = useState('들어가는 중입니다…');

  useEffect(() => {
    let alive = true;

    async function run() {
      const fragment = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
      const fields = new URLSearchParams(fragment);
      const accessToken = fields.get('access_token');
      const refreshToken = fields.get('refresh_token');
      const next = fields.get('next') ?? params.next ?? '/';

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // 토큰을 주소창에서 지운다. 남겨 두면 뒤로 가기와 기록에 그대로 남는다.
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', window.location.pathname);
        }
        if (!alive) return;
        if (error) {
          setMessage('이어받지 못했습니다. 로그인 화면으로 갑니다.');
          router.replace('/sign-in');
          return;
        }
      }

      if (!alive) return;
      const { data } = await supabase.auth.getSession();
      router.replace(data.session ? (next as never) : '/sign-in');
    }

    run().catch(() => {
      if (alive) router.replace('/sign-in');
    });

    return () => {
      alive = false;
    };
  }, [params.next]);

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator />
      <ThemedText themeColor="textSecondary" style={Type.caption}>
        {message}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
});
