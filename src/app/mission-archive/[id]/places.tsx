import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  getSubject,
  listAnswers,
  listAssets,
  listTimeline,
  type MissionAnswer,
  type MissionAsset,
  type MissionSubject,
  type MissionTimelineRow,
} from '@/db/missionArchive';
import { MissionCard } from '@/features/mission/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { groupPlaces, placeMapUrl } from '@/lib/missionArchive';

/**
 * 발자취 (기획서 §8 선교 지도).
 *
 * 지도를 앱 안에 그리지 않는다 — 성경지도 화면에서 이미 같은 판단을 했다
 * (네이티브 지도 의존성을 들이지 않고 밖에서 연다). 여기서는 연표·인터뷰·자료에
 * 적힌 장소를 한데 모아 「어디에서 언제 무슨 일이 있었는지」를 보여 주고,
 * 지도는 눌러서 밖에서 연다.
 *
 * 보안 모드일 때는 지도 단추를 감춘다. 보안 지역의 지명을 지도 검색에 넘기는
 * 것만으로도 그 지역이 어디인지 밖에 남는다.
 */
export default function MissionPlacesScreen() {
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ownerId = session?.user.id ?? null;

  const [subject, setSubject] = useState<MissionSubject | null>(null);
  const [timeline, setTimeline] = useState<MissionTimelineRow[]>([]);
  const [answers, setAnswers] = useState<MissionAnswer[]>([]);
  const [assets, setAssets] = useState<MissionAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!ownerId || !id) {
      setLoading(false);
      return;
    }
    try {
      const [one, rows, answerList, assetList] = await Promise.all([
        getSubject(id),
        listTimeline(id),
        listAnswers(id),
        listAssets(id),
      ]);
      setSubject(one);
      setTimeline(rows);
      setAnswers(answerList);
      setAssets(assetList);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [ownerId, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const groups = useMemo(() => groupPlaces(timeline, answers, assets), [timeline, answers, assets]);

  if (authLoading) return null;
  if (!session) return <Redirect href="/profile" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>사역의 발자취</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            연표·인터뷰·자료에 적힌 장소를 모았습니다. 장소를 적어 두실수록 촘촘해집니다.
          </ThemedText>

          {loading ? (
            <ActivityIndicator style={styles.loading} color={theme.accent} />
          ) : (
            <View style={styles.list}>
              {groups.map((group) => (
                <MissionCard key={group.place}>
                  <ThemedText style={Type.itemTitle}>{group.place}</ThemedText>
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    {group.firstYear
                      ? group.firstYear === group.lastYear
                        ? `${group.firstYear}년`
                        : `${group.firstYear}–${group.lastYear}년`
                      : '연도 미상'}
                    {group.assets > 0 ? ` · 자료 ${group.assets}건` : ''}
                  </ThemedText>
                  {group.events.slice(0, 6).map((event, i) => (
                    <ThemedText key={`${event}-${i}`} style={Type.body}>
                      · {event}
                    </ThemedText>
                  ))}
                  {subject?.security_mode ? (
                    <ThemedText themeColor="textSecondary" style={Type.caption}>
                      보안 모드라 지도를 열지 않습니다.
                    </ThemedText>
                  ) : (
                    <Pressable onPress={() => Linking.openURL(placeMapUrl(group.place))}>
                      <ThemedText style={[Type.caption, { color: theme.accent }]}>지도에서 보기</ThemedText>
                    </Pressable>
                  )}
                </MissionCard>
              ))}
              {groups.length === 0 ? (
                <ThemedText themeColor="textSecondary" style={Type.body}>
                  아직 장소가 적힌 기록이 없습니다. 인터뷰의 「장소」 칸이나 연표를 채우면 여기 모입니다.
                </ThemedText>
              ) : null}
            </View>
          )}

          {message ? <ThemedText style={[Type.caption, { color: theme.accent }]}>{message}</ThemedText> : null}
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
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  loading: { marginVertical: Spacing.four },
  list: { gap: Spacing.two },
});
