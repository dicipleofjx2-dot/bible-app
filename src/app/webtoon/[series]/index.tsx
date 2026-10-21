import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Raised } from '@/components/Raised';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { APP_WINDOW, openAppWindow } from '@/lib/openExternal';
import { episodesOf, seriesOf, type WebtoonEpisode, type WebtoonSeriesKey } from '@/lib/webtoon';

/**
 * 한 연재의 화 목록.
 *
 * 앞 화부터 선다 — 이야기는 처음부터 읽는 것이고, 새 화만 찾는 분은 끝까지
 * 내리면 된다. 표지는 그 화의 **첫 그림**이라, 무엇을 그린 화인지 제목보다
 * 먼저 알아본다.
 */
export default function WebtoonSeriesScreen() {
  const { series } = useLocalSearchParams<{ series: string }>();
  const theme = useTheme();
  const [list, setList] = useState<WebtoonEpisode[] | null>(null);

  const info = seriesOf(series);
  const key = (info?.key ?? 'reading') as WebtoonSeriesKey;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setList(null);
      episodesOf(key)
        .then((rows) => {
          if (!cancelled) setList(rows);
        })
        .catch(() => setList([]));
      return () => {
        cancelled = true;
      };
    }, [key]),
  );

  if (!info) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            없는 연재예요. 책장에서 다시 골라 주세요.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            {info.description}
          </ThemedText>

          {list === null && <ActivityIndicator style={styles.loading} />}

          {list?.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              아직 올라온 화가 없거나, 지금은 받아 오지 못했어요.
            </ThemedText>
          )}

          {list?.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => router.push(`/webtoon/${info.key}/${w.id}` as Href)}
              style={({ pressed }) => [pressed && styles.pressed]}>
              <Raised>
                <View style={styles.row}>
                  {w.thumb ? (
                    <Image source={{ uri: w.thumb }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.thumb, { backgroundColor: theme.backgroundElement }]} />
                  )}
                  <View style={styles.rowText}>
                    <ThemedText type="smallBold" numberOfLines={2}>
                      {w.title}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {[w.episode ? `${w.episode}화` : null, w.date].filter(Boolean).join(' · ')}
                    </ThemedText>
                  </View>
                </View>
              </Raised>
            </Pressable>
          ))}

          {/* 원래 올라오는 자리. 앱이 못 받아 왔을 때 돌아갈 길을 남긴다. */}
          <Pressable
            onPress={() => openAppWindow(info.site, APP_WINDOW.webtoon)}
            style={({ pressed }) => [styles.siteLink, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              연재 사이트에서 보기 ↗
            </ThemedText>
          </Pressable>
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
  loading: { marginTop: Spacing.five },
  empty: { padding: Spacing.five, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  thumb: { width: 92, height: 62, borderRadius: 10 },
  rowText: { flex: 1, gap: 2 },
  siteLink: { alignItems: 'center', paddingVertical: Spacing.three },
  pressed: { opacity: 0.7 },
});
