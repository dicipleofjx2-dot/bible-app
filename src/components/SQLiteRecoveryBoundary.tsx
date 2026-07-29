import { Component, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = { children: ReactNode };
type State = { error: Error | null };

const OPFS_LOCK_MESSAGE_FRAGMENT = 'Access Handle';

/**
 * expo-sqlite's web (OPFS) backend leaks a Worker on every Fast Refresh that
 * touches its module graph in dev mode: `SQLiteProviderSuspense`'s
 * `databaseInstance` cache (expo-sqlite/src/hooks.tsx) and `SQLiteModule`'s
 * `worker` singleton (expo-sqlite/web/SQLiteModule.ts) are both plain
 * module-level `let` variables with no HMR-teardown hook. A hot-reloaded
 * module gets a fresh `worker`/`databaseInstance`, but the *previous* Worker
 * — and the OPFS sync access handles it opened and never released — keeps
 * running in the background forever, permanently locking `bible-v5.db`'s
 * pooled files for every future open attempt (`NoModificationAllowedError:
 * ...createSyncAccessHandle...Access Handles cannot be created if there is
 * another open Access Handle`) until the browser tab is fully closed. Only
 * hits web dev mode (Fast Refresh) — production web builds and every native
 * platform never re-trigger this module graph after the first load, so
 * there's no leaked Worker to collide with.
 *
 * The app has no way to reach across into that orphaned Worker to close it,
 * so "try again" can't work — the only fix is to clear the OPFS storage
 * (freeing the files even though the stale Worker still thinks it owns
 * them, since the *files themselves* aren't what's locked, the live
 * `FileSystemSyncAccessHandle` objects are) and do a real full reload,
 * which finally does tear down every Worker this tab ever spawned.
 */
export class SQLiteRecoveryBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  async recover() {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
      try {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry('expo-sqlite', { recursive: true });
      } catch {
        // Best-effort: if some other context still holds a handle this
        // fails the same way the original open did, but it's harmless to
        // try, and it succeeds once the orphaned Worker is actually gone.
      }
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isKnownOpfsLock = Platform.OS === 'web' && error.message?.includes(OPFS_LOCK_MESSAGE_FRAGMENT);

    return (
      <ThemedView style={styles.container}>
        <View style={styles.card}>
          <ThemedText type="smallBold" style={styles.title}>
            {isKnownOpfsLock ? '일시적인 저장소 오류가 발생했습니다' : '문제가 발생했습니다'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
            {isKnownOpfsLock
              ? '개발 모드에서 가끔 발생하는 문제예요. 아래 버튼을 누르면 저장소를 정리하고 새로고침합니다.'
              : '아래 버튼을 눌러 새로고침해주세요.'}
          </ThemedText>
          <Pressable onPress={() => this.recover()} style={styles.button}>
            <ThemedText type="smallBold" style={styles.buttonText}>
              {isKnownOpfsLock ? '정리하고 새로고침' : '새로고침'}
            </ThemedText>
          </Pressable>
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
    backgroundColor: '#3c87f7',
  },
  buttonText: { color: '#fff' },
});
