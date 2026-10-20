import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { getMemorial, memorialPhotoUrl } from '@/db/missionArchive';
import { MissionCard } from '@/features/mission/ui';
import { useTheme } from '@/hooks/use-theme';
import type { MemorialData } from '@/lib/missionArchive';

/**
 * 디지털 기념관 — **로그인 없이 여는 공개 화면** (기획서 §4·§15).
 *
 * 무엇이 나갈지는 화면이 아니라 서버 함수가 정한다(0081) — 켜져 있는가,
 * 보안 지역이 아닌가, 「공개」로 표시했는가. 화면에서 거르면 화면을 고칠 때마다
 * 새어 나갈 자리가 생긴다. 여기서는 받은 것을 그리기만 한다.
 *
 * 증언 화면과 같이 성경 저장소 밖에서 그린다(`_layout.tsx` 의 갈림길).
 */
export default function MemorialScreen() {
  const theme = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [data, setData] = useState<MemorialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setFailed(false);
    try {
      setData(await getMemorial(slug));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator style={styles.loading} color={theme.accent} />
          ) : failed ? (
            <MissionCard>
              <ThemedText style={Type.screenTitle}>지금은 열지 못했습니다</ThemedText>
              <ThemedText style={Type.body}>인터넷 연결을 확인하고 다시 열어 주세요.</ThemedText>
            </MissionCard>
          ) : !data ? (
            <MissionCard>
              <ThemedText style={Type.screenTitle}>아직 열리지 않은 기념관입니다</ThemedText>
              <ThemedText style={Type.body}>
                주소가 다르거나, 아직 공개되지 않았습니다.
              </ThemedText>
            </MissionCard>
          ) : (
            <>
              <ThemedText style={Type.screenTitle}>{data.title || `${data.name} 사역 기념관`}</ThemedText>
              <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                {[data.denomination, data.church, data.fields].filter(Boolean).join(' · ')}
              </ThemedText>
              {data.intro || data.summary ? (
                <ThemedText style={Type.reading}>{data.intro || data.summary}</ThemedText>
              ) : null}

              {data.photos.length > 0 ? (
                <View style={styles.photos}>
                  {data.photos.map((photo) => (
                    <View key={photo.path} style={styles.photo}>
                      <Image source={{ uri: memorialPhotoUrl(photo.path) }} style={styles.image} />
                      {photo.caption ? (
                        <ThemedText themeColor="textSecondary" style={Type.caption}>
                          {photo.caption}
                        </ThemedText>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}

              {data.timeline.length > 0 ? (
                <MissionCard>
                  <ThemedText style={Type.itemTitle}>사역 연표</ThemedText>
                  {data.timeline.map((row, i) => (
                    <View key={`${row.year}-${i}`} style={styles.row}>
                      <ThemedText style={[Type.itemTitle, styles.year, { color: theme.accent }]}>
                        {row.year}
                      </ThemedText>
                      <View style={styles.rowText}>
                        <ThemedText style={Type.body}>{row.event || row.role || '—'}</ThemedText>
                        <ThemedText themeColor="textSecondary" style={Type.caption}>
                          {[row.place, row.org, row.people].filter(Boolean).join(' · ')}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </MissionCard>
              ) : null}

              {data.stories.map((story, i) => (
                <MissionCard key={`${story.question}-${i}`}>
                  <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>
                    {story.question}
                  </ThemedText>
                  <ThemedText style={Type.reading}>{story.body}</ThemedText>
                  {story.year || story.place ? (
                    <ThemedText themeColor="textSecondary" style={Type.caption}>
                      {[story.year ? `${story.year}년` : '', story.place].filter(Boolean).join(' · ')}
                    </ThemedText>
                  ) : null}
                </MissionCard>
              ))}

              {data.testimonies.length > 0 ? (
                <MissionCard>
                  <ThemedText style={Type.itemTitle}>곁에서 본 사람들</ThemedText>
                  {data.testimonies.map((item, i) => (
                    <View key={`${item.witness_name}-${i}`} style={styles.testimony}>
                      <ThemedText style={Type.itemDescription}>
                        {[item.witness_name, item.relation].filter(Boolean).join(' · ')}
                      </ThemedText>
                      <ThemedText style={Type.reading}>{item.body}</ThemedText>
                    </View>
                  ))}
                </MissionCard>
              ) : null}

              <ThemedText themeColor="textSecondary" style={Type.caption}>
                이 기념관은 데이빗바이블 사명기록관으로 만들었습니다.
              </ThemedText>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%' },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  loading: { marginVertical: Spacing.four },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  photo: { width: 160, gap: 2 },
  image: { width: 160, height: 160, borderRadius: 12 },
  row: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.one },
  year: { width: 54 },
  rowText: { flex: 1 },
  testimony: { gap: 2, marginBottom: Spacing.two },
});
