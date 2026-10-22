import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Raised } from '@/components/Raised';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openAppWindow } from '@/lib/openExternal';
import { WEBTOON_SERIES } from '@/lib/webtoon';

/**
 * 말씀웹툰 책장 — 어느 연재를 볼지 고르는 자리.
 *
 * 고르면 **연재가 올라오는 워드프레스로 나간다.** 그림을 앱으로 받아 오지
 * 않는다 — 한 화가 4MB 가까이 되고 저장소가 담아 두지 말라고 내주어서, 다시
 * 열 때마다 그만큼을 또 받았다(→ `@/lib/webtoon`).
 *
 * 연재가 더 늘어도 이 화면은 고치지 않는다 — `WEBTOON_SERIES` 에 한 줄 더하면
 * 여기 한 칸이 저절로 생긴다.
 */
export default function WebtoonShelfScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            보고 싶은 연재를 고르세요. 연재 사이트가 열립니다.
          </ThemedText>

          {WEBTOON_SERIES.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => openAppWindow(s.site, s.window)}
              style={({ pressed }) => [pressed && styles.pressed]}>
              <Raised>
                <View style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
                    <ThemedText style={styles.emoji}>{s.emoji}</ThemedText>
                  </View>
                  <View style={styles.rowText}>
                    <ThemedText type="smallBold">{s.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {s.description}
                    </ThemedText>
                  </View>
                  {/* ↗ 는 앱 밖으로 나간다는 뜻. 마이페이지의 바깥 링크와 같은 표시다. */}
                  <ThemedText themeColor="textSecondary" style={styles.chevron}>
                    ↗
                  </ThemedText>
                </View>
              </Raised>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26, lineHeight: 32 },
  rowText: { flex: 1, gap: 2 },
  chevron: { fontSize: 22, opacity: 0.45, paddingRight: Spacing.one },
  pressed: { opacity: 0.7 },
});
