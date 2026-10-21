import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Raised } from '@/components/Raised';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WEBTOON_SERIES } from '@/lib/webtoon';

/**
 * 말씀웹툰 책장 — 어느 연재를 볼지 고르는 자리.
 *
 * 전에는 이 화면이 곧 성경통독 웹툰의 화 목록이었다. 연재가 둘이 되면서
 * 「말씀웹툰」을 눌렀는데 통독 웹툰만 나오는 어긋남이 생겼다. 한 칸을 둘로
 * 가르고, 고른 뒤에 화 목록으로 들어간다.
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
            보고 싶은 연재를 고르세요. 앱 안에서 전자책처럼 넘겨 읽습니다.
          </ThemedText>

          {WEBTOON_SERIES.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => router.push(`/webtoon/${s.key}` as Href)}
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
                  <ThemedText themeColor="textSecondary" style={styles.chevron}>
                    ›
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
