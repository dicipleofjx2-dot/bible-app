import { Component, Fragment, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { claimDb, hasOtherTab, onDbLockReleased } from '@/lib/tabPresence';

type Props = { children: ReactNode };
type State = {
  error: Error | null;
  otherTabOpen: boolean;
  /** 다시 시도한 횟수. 이 값을 children 의 key 로 써서 통째로 새로 마운트한다. */
  attempt: number;
  retrying: boolean;
};

/**
 * 다시 시도하는 횟수와 간격.
 *
 * 앞선 페이지가 완전히 정리되기까지는 시간이 조금 걸린다. 그 사이에 새 페이지가
 * 열리면 저장소 핸들이 겹쳐 실패하는데, **잠깐 뒤에는 대개 풀린다.** 실제로
 * 탭이 하나뿐인데도 실패하는 경우의 거의 전부가 이것이다(다른 탭이 없으니
 * 잠금도 안 잡혀 있어서, 예전 코드는 이걸 "저장소가 망가졌다"로 잘못 읽었다).
 *
 * 사람에게 화면을 내밀기 전에 조용히 몇 번 다시 해 본다.
 */
const RETRY_DELAYS_MS = [300, 700, 1200, 2000];

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
  state: State = { error: null, otherTabOpen: false, attempt: 0, retrying: false };
  private stopListening: (() => void) | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retries = 0;

  static getDerivedStateFromError(error: Error) {
    return { error, otherTabOpen: false };
  }

  async componentDidCatch(error: Error) {
    // **오류 문구로 가리지 않는다.** 예전에는 메시지에 'Access Handle' 이 들어
    // 있을 때만 다른 탭을 의심했는데, 라이브러리가 오류를 한 겹 감싸거나
    // 브라우저가 문구를 바꾸면 그대로 놓쳤다. 그러면 멀쩡한 상황에 "저장소를
    // 정리하세요"가 떴다 — 사실이 아니고 해로운 안내다.
    //
    // 웹에서 DB 열기가 실패했고 다른 탭이 잠금을 쥐고 있다면, 오류 문구가
    // 무엇이든 원인은 그것이다. 문구는 화면에 무슨 말을 쓸지 고를 때만 쓴다.
    if (Platform.OS !== 'web') return;

    if (await hasOtherTab()) {
      this.setState({ otherTabOpen: true });
      // 잠금이 풀리는 순간 깨어난다. 먼저 걸어 두는 이유는, 자리를 달라고 한
      // 뒤에 걸면 그 사이에 풀리는 것을 놓칠 수 있어서다.
      this.stopListening = onDbLockReleased(() => this.reload());
      // 앞선 탭에게 자리를 달라고 한다. 그 탭은 스스로 물러난다(AppDbLock).
      claimDb();
      return;
    }

    // 잠금을 쥔 탭이 없는데도 실패했다. 앞선 페이지가 아직 정리되는 중일 가능성이
    // 크다 — 잠깐 뒤에 조용히 다시 해 본다. 사람에게 오류 화면을 내미는 것은
    // 몇 번 해 보고 나서다.
    const delay = RETRY_DELAYS_MS[this.retries];
    if (delay === undefined) return;
    this.retries += 1;
    this.setState({ retrying: true });
    this.retryTimer = setTimeout(() => {
      // key 를 바꿔 SQLiteProvider 를 통째로 새로 마운트한다. 새로고침보다
      // 가볍고, 보고 있던 화면을 잃지 않는다.
      this.setState((prev) => ({ error: null, retrying: false, attempt: prev.attempt + 1 }));
    }, delay);
  }

  componentWillUnmount() {
    this.stopListening?.();
    if (this.retryTimer) clearTimeout(this.retryTimer);
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
    const { error, otherTabOpen, attempt, retrying } = this.state;
    // key 가 바뀌면 아래 나무가 통째로 새로 마운트된다 — 다시 시도하는 방법이다.
    if (!error) return <Fragment key={attempt}>{this.props.children}</Fragment>;

    // 조용히 다시 해 보는 중. 오류 화면 대신 기다리는 표시만 낸다.
    if (retrying) {
      return (
        <ThemedView style={styles.container}>
          <ActivityIndicator />
          <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
            저장소를 여는 중입니다...
          </ThemedText>
        </ThemedView>
      );
    }

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
    backgroundColor: '#BC5C35',
  },
  buttonText: { color: '#fff' },
  secondary: { paddingVertical: Spacing.two },
});
