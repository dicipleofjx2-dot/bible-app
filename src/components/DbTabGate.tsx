import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { claimDb, hasOtherTab, waitForDbLockFree } from '@/lib/tabPresence';

/**
 * DB 를 열기 **전에** 다른 탭에게 자리를 비켜 달라고 한다.
 *
 * 웹에서 이 앱은 브라우저 저장소(OPFS)를 한 탭만 잡을 수 있다. 지금까지는
 * **부딪힌 다음에 수습**했다 — 두 번째 탭이 DB 열기에 실패해 에러 경계로
 * 떨어진 뒤에야 자리를 달라고 했다. 두 가지가 약했다.
 *
 *  1. 그 판단이 **오류 메시지 문구**에 매달려 있었다(`'Access Handle'` 포함
 *     여부). 라이브러리가 오류를 한 겹 감싸거나 브라우저가 문구를 바꾸면
 *     못 알아채고 엉뚱하게 "저장소를 정리하세요" 화면이 떴다.
 *  2. 실패를 한 번 겪고 나서 되돌리는 길이라, 그 사이에 화면이 깜빡이고
 *     새로고침이 한 번 더 필요했다.
 *
 * 그래서 순서를 뒤집었다. 열기 전에 잠금이 잡혀 있는지 물어보고, 잡혀 있으면
 * 자리를 달라고 한 뒤 풀릴 때까지 기다린다. 애초에 부딪히지 않는다.
 *
 * 앞선 탭이 옛 판이거나 먹통이면 자리를 안 내줄 수 있다. 그때는 시간 제한이
 * 지나면 그냥 열어 본다 — 실패하면 에러 경계가 받는다. 영원히 기다리는 빈
 * 화면보다는 낫다.
 */
export function DbTabGate({ children }: { children: React.ReactNode }) {
  // **프리렌더에서는 그냥 통과시킨다.**
  //
  // 정적 웹 내보내기는 Node 에서 화면을 한 번 그려 HTML 을 만드는데, 거기서는
  // useEffect 가 돌지 않는다. 여기서 막아 두면 **모든 페이지의 HTML 이 로딩
  // 표시 하나로 굳는다.** 이 앱은 폰트 로딩에서 같은 함정을 이미 한 번 밟았다.
  //
  // 브라우저인지 아닌지는 window 로 가른다 — Node 프리렌더에는 window 가 없다.
  const isBrowser = Platform.OS === 'web' && typeof window !== 'undefined';
  const [ready, setReady] = useState(!isBrowser);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!isBrowser) return;
    let cancelled = false;

    (async () => {
      if (!(await hasOtherTab())) {
        if (!cancelled) setReady(true);
        return;
      }
      // 다른 탭이 쥐고 있다. 자리를 달라고 하고 기다린다.
      if (!cancelled) setWaiting(true);
      claimDb();
      await waitForDbLockFree();
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [isBrowser]);

  if (ready) return <>{children}</>;

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator />
      {waiting ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
          다른 탭에서 열려 있어 자리를 넘겨받는 중입니다.
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.five },
  text: { textAlign: 'center', lineHeight: 20 },
});
