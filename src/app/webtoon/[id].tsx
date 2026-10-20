import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { allWebtoons, webtoonImages, type ReadingWebtoon } from '@/lib/readingHelper/webtoon';

/**
 * 한 화 읽기 — 전자책처럼.
 *
 * 웹툰은 **세로로 길게 이어 붙인 띠**라 페이지를 넘기지 않고 쭉 내려 읽는다.
 * 그림마다 가로를 화면에 맞추고 높이는 비율대로 잡는다 — 비율을 모르면 잘리거나
 * 여백이 생기는데, 그림이 서로 이어지는 웹툰에서는 그 틈이 곧 끊김이다.
 *
 * 맨 아래에 다음 화를 둔다. 한 화가 끝났을 때 이어서 볼 길이 그 자리에 있어야
 * 한다 — 뒤로 가서 책장을 다시 찾게 하면 거기서 멈춘다.
 */
export default function WebtoonReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [images, setImages] = useState<string[] | null>(null);
  /** 그림마다의 세로 비율(높이 ÷ 너비). 받아 오는 대로 채운다. */
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [list, setList] = useState<ReadingWebtoon[]>([]);

  const numericId = Number(id);
  const here = list.find((w) => w.id === numericId) ?? null;
  const next = here ? list.find((w) => w.from > here.from) ?? null : null;

  useEffect(() => {
    let cancelled = false;
    setImages(null);
    webtoonImages(numericId)
      .then((urls) => {
        if (cancelled) return;
        setImages(urls);
        // 비율은 그림마다 따로 묻는다. 먼저 온 것부터 제 높이로 선다.
        for (const url of urls) {
          Image.getSize(
            url,
            (w, h) => {
              if (!cancelled && w > 0) setRatios((cur) => ({ ...cur, [url]: h / w }));
            },
            () => {},
          );
        }
      })
      .catch(() => setImages([]));
    allWebtoons()
      .then((rows) => {
        if (!cancelled) setList(rows);
      })
      .catch(() => setList([]));
    return () => {
      cancelled = true;
    };
  }, [numericId]);

  const pageWidth = Math.min(width, MaxContentWidth);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {here && (
            <ThemedText type="smallBold" style={styles.title}>
              {here.title}
            </ThemedText>
          )}

          {images === null && <ActivityIndicator style={styles.loading} />}

          {images?.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              이 화의 그림을 받아 오지 못했어요. 잠시 뒤 다시 열어 보세요.
            </ThemedText>
          )}

          {images?.map((url, i) => (
            <Image
              key={`${url}-${i}`}
              source={{ uri: url }}
              style={{
                width: pageWidth,
                // 비율을 아직 모르면 너무 작지 않게 세워 둔다 — 0 으로 두면
                // 그림이 다 올 때까지 빈 화면이 된다.
                height: pageWidth * (ratios[url] ?? 1.4),
                backgroundColor: theme.backgroundElement,
              }}
              resizeMode="cover"
            />
          ))}

          {next && (
            <Pressable
              onPress={() => router.replace(`/webtoon/${next.id}` as Href)}
              style={({ pressed }) => [
                styles.nextButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.nextText}>
                다음 화 — {next.episode}화
              </ThemedText>
            </Pressable>
          )}

          <Pressable
            onPress={() => router.push('/webtoon' as Href)}
            style={({ pressed }) => [styles.shelfLink, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              목록으로
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
  content: { alignItems: 'center', paddingBottom: Spacing.five },
  title: { padding: Spacing.three, textAlign: 'center' },
  loading: { marginTop: Spacing.five },
  empty: { padding: Spacing.five, textAlign: 'center' },
  nextButton: {
    marginTop: Spacing.four,
    marginHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.four,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  nextText: { color: '#ffffff' },
  shelfLink: { paddingVertical: Spacing.three },
  pressed: { opacity: 0.7 },
});
