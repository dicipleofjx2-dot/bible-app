import { Component, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { claimDb, hasOtherTab, onDbLockReleased } from '@/lib/tabPresence';

type Props = { children: ReactNode };
type State = { error: Error | null; otherTabOpen: boolean };

const OPFS_LOCK_MESSAGE_FRAGMENT = 'Access Handle';

/**
 * 웹에서 이 앱은 브라우저 저장소(OPFS)를 한 탭만 잡을 수 있다. 잠금을 못 얻으면
 * DB 열기가 `NoModificationAllowedError: ...Access Handles cannot be created if
 * there is another open Access Handle`로 실패한다. 원인은 두 가지다.
 *
 *  1. **다른 탭에서 앱이 이미 열려 있다** — 운영에서 실제로 가장 흔하다.
 *     홈페이지(newwineskin.co.kr)에서 데이빗바이블 링크를 누를 때, 앱을 띄운
 *     탭이 이미 있으면 매번 여기로 떨어진다. 답은 그 탭을 닫는 것이고,
 *     저장소를 지우는 건 멀쩡한 데이터를 날리는 잘못된 처방이다.
 *  2. **개발 중 Fast Refresh가 Worker를 흘린 경우** — expo-sqlite 웹 백엔드의
 *     `databaseInstance`/`worker`가 모듈 수준 변수라 HMR 시 정리되지 않는다.
 *     버려진 Worker가 열어 둔 sync access handle을 계속 쥐고 있어서, 이때는
 *     탭을 완전히 닫기 전까지 손쓸 방법이 없고 저장소 정리가 유일한 길이다.
 *
 * 예전에는 둘을 구분하지 않고 늘 "개발 모드 문제니 저장소를 정리하라"고 안내했다.
 * 운영에서 이 화면을 본 사용자에게는 사실도 아니고 해로운 안내였다.
 *
 * 그다음에는 "먼저 연 탭을 닫으세요"라고 안내했다. 맞는 말이었지만 여전히
 * 사용자에게 일을 시켰다 — 뒤에 숨은 탭을 찾아 닫으라는 것이다. 사용자가
 * 하려던 일은 **지금 보고 있는 탭에서 앱을 쓰는 것**이다.
 *
 * 이제는 자리를 달라고 하고 넘겨받는다. 잠금을 쥔 탭이 스스로 물러나고,
 * 이 탭은 잠금이 풀리는 순간 다시 열린다. 사용자는 아무것도 안 눌러도 된다.
 */
export class SQLiteRecoveryBoundary extends Component<Props, State> {
  state: State = { error: null, otherTabOpen: false };
  private stopListening: (() => void) | null = null;

  static getDerivedStateFromError(error: Error): State {
    return { error, otherTabOpen: false };
  }

  async componentDidCatch(error: Error) {
    if (!this.isOpfsLock(error)) return;

    if (await hasOtherTab()) {
      this.setState({ otherTabOpen: true });
      // 잠금이 풀리는 순간 깨어난다. 먼저 걸어 두는 이유는, 자리를 달라고 한
      // 뒤에 걸면 그 사이에 풀리는 것을 놓칠 수 있어서다.
      this.stopListening = onDbLockReleased(() => this.reload());
      // 앞선 탭에게 자리를 달라고 한다. 그 탭은 스스로 물러난다(AppDbLock).
      claimDb();
    }
  }

  componentWillUnmount() {
    this.stopListening?.();
  }

  private isOpfsLock(error: Error) {
    return Platform.OS === 'web' && !!error.message?.includes(OPFS_LOCK_MESSAGE_FRAGMENT);
  }

  private reload() {
    if (typeof window !== 'undefined') window.location.reload();
  }

  /** 저장소를 비우고 새로고침. 다른 탭 문제일 때는 쓰면 안 된다. */
  async clearAndReload() {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
      try {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry('expo-sqlite', { recursive: true });
      } catch {
        // 다른 컨텍스트가 아직 핸들을 쥐고 있으면 여기서도 같은 이유로 실패한다.
        // 시도 자체는 해롭지 않고, 그 Worker가 사라지면 성공한다.
      }
    }
    this.reload();
  }

  render() {
    const { error, otherTabOpen } = this.state;
    if (!error) return this.props.children;

    const opfsLock = this.isOpfsLock(error);

    if (otherTabOpen) {
      return (
        <ThemedView style={styles.container}>
          <View style={styles.card}>
            <ThemedText type="smallBold" style={styles.title}>
              잠시만요, 넘겨받는 중입니다
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
              먼저 열어 둔 탭에서 자리를 넘겨받고 있어요. 곧 이 탭에서 이어집니다.
            </ThemedText>
            <Pressable onPress={() => this.reload()} style={styles.button}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                다시 시도
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      );
    }

    return (
      <ThemedView style={styles.container}>
        <View style={styles.card}>
          <ThemedText type="smallBold" style={styles.title}>
            {opfsLock ? '저장소를 열지 못했습니다' : '문제가 발생했습니다'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
            {opfsLock
              ? '다른 창이나 탭에서 데이빗바이블을 열어 두었다면 먼저 닫아 주세요. 그래도 안 되면 저장소를 정리하고 다시 받습니다.'
              : '아래 버튼을 눌러 새로고침해주세요.'}
          </ThemedText>
          <Pressable onPress={() => this.reload()} style={styles.button}>
            <ThemedText type="smallBold" style={styles.buttonText}>
              다시 시도
            </ThemedText>
          </Pressable>
          {opfsLock ? (
            <Pressable onPress={() => this.clearAndReload()} style={styles.secondary}>
              <ThemedText type="small" themeColor="textSecondary">
                저장소 정리하고 새로고침
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </ThemedView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  card: { gap: Spacing.three, maxWidth: 360, alignItems: 'center' },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', lineHeight: 20 },
  button: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#1F6FA8',
  },
  buttonText: { color: '#fff' },
  secondary: { paddingVertical: Spacing.two },
});
