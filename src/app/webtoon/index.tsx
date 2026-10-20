import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Raised } from '@/components/Raised';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { allWebtoons, READING_WEBTOON_LIST, type ReadingWebtoon } from '@/lib/readingHelper/webtoon';
import { APP_WINDOW, openAppWindow } from '@/lib/openExternal';

/**
 * 말씀웹툰 책장.
 *
 * 전에는 바깥 사이트로 내보냈다. 거기서는 글꼴도 머리말도 그 사이트 것이고,
 * 돌아오는 길을 사용자가 찾아야 했다. 그래서 **앱 안에서 전자책처럼** 본다 —
 * 책장에서 한 화를 고르고, 세로로 넘겨 읽고, 다음 화로 이어 간다.
 *
 * 화 목록은 말씀광산이 연재하는 워드프레스에서 받아 온다. 그림은 이 교회의
 * Supabase 저장소에 있어서 앱이 그대로 띄운다.
 */
export default function WebtoonShelfScreen() {
  const theme = useTheme();
  const [list, setList] = useState<ReadingWebtoon[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      allWebtoons()
        .then((rows) => {
          if (!cancelled) setList(rows);
        })
        .catch(() => setList([]));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            성경통독 한 분량을 한 화씩 그립니다. 눌러서 읽으세요.
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
              onPress={() => router.push(`/webtoon/${w.id}` as Href)}
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
                      {w.episode}화
                    </ThemedText>
                  </View>
                </View>
              </Raised>
            </Pressable>
          ))}

          {/* 원래 올라오는 자리. 앱이 못 받아 왔을 때 돌아갈 길을 남긴다. */}
          <Pressable
            onPress={() => openAppWindow(READING_WEBTOON_LIST, APP_WINDOW.webtoon)}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  thumb: { width: 92, height: 62, borderRadius: 10 },
  rowText: { flex: 1, gap: 2 },
  siteLink: { alignItems: 'center', paddingVertical: Spacing.three },
  pressed: { opacity: 0.7 },
});
