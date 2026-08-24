import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getIsAdmin } from '@/db/profile';
import { getAdminBoard, type AdminBoardRow } from '@/lib/readingHelper/db';

type SortKey = 'week' | 'missed' | 'name';

/**
 * 통독 현황판 — 관리자만.
 *
 * 목회자가 「누가 잘 따라오고 있고 누가 힘들어하는지」를 알아야 격려할 수 있다.
 * 지금까지는 각자 자기 것만 볼 수 있어(RLS) 교회 전체를 볼 방법이 아예 없었다.
 *
 * 순위표(성도용)와 다르다. 거기서는 이름을 가리고 위 다섯만 보여 주지만, 여기는
 * **격려하려면 누구인지 알아야 하므로 가리지 않는다.** 대신 서버 함수 첫 줄에서
 * 관리자인지 확인한다(0047).
 *
 * 기본 정렬을 「빠뜨린 날 많은 순」으로 두지 않았다. 그렇게 두면 화면을 열자마자
 * 못 하는 분들이 줄 세워져 보인다 — 이 화면의 목적은 채근이 아니라 돌봄이다.
 * 필요하면 눌러서 그 순서로 볼 수 있다.
 */
export default function ReadingHelperAdminScreen() {
  const theme = useTheme();
  const { session, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<AdminBoardRow[] | null>(null);
  const [sort, setSort] = useState<SortKey>('week');

  const load = useCallback(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    getIsAdmin(session.user.id)
      .then((ok) => {
        setIsAdmin(ok);
        if (ok) getAdminBoard().then(setRows).catch(() => setRows([]));
      })
      .catch(() => setIsAdmin(false));
  }, [session]);

  useFocusEffect(load);

  if (loading || isAdmin === null) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!isAdmin) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">관리자만 볼 수 있어요.</ThemedText>
      </ThemedView>
    );
  }

  const sorted = rows ? [...rows] : [];
  if (sort === 'missed') sorted.sort((a, b) => b.missedDays - a.missedDays);
  else if (sort === 'name') sorted.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ko'));

  const doneToday = rows?.filter((r) => r.lastDone === todayStr()).length ?? 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
            <ThemedText type="smallBold">◀ 돌아가기</ThemedText>
          </Pressable>

          <ThemedText type="subtitle">통독 현황판</ThemedText>
          {rows ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.summary}>
              통독 중 {rows.length}명 · 오늘 마친 분 {doneToday}명
            </ThemedText>
          ) : null}

          <View style={styles.sortRow}>
            {(
              [
                ['week', '이번 주 점수'],
                ['missed', '빠뜨린 날'],
                ['name', '이름'],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => setSort(key)}
                style={[
                  styles.sortChip,
                  { borderColor: theme.backgroundElement },
                  sort === key && { backgroundColor: theme.backgroundSelected },
                ]}>
                <ThemedText type="small" style={sort === key ? styles.sortChipOn : undefined}>
                  {label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {rows === null ? (
            <ActivityIndicator style={styles.loader} />
          ) : rows.length === 0 ? (
            <ThemedText themeColor="textSecondary">아직 통독을 시작한 분이 없습니다.</ThemedText>
          ) : (
            <View style={styles.table}>
              <View style={[styles.row, styles.headRow, { borderColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.colName}>
                  이름
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.colNum}>
                  일차
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.colNum}>
                  마친 날
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.colNum}>
                  빠뜨림
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.colNum}>
                  이번 주
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.colNum}>
                  누적
                </ThemedText>
              </View>

              {sorted.map((r) => (
                <View
                  key={r.userId}
                  style={[styles.row, { borderColor: theme.backgroundElement }]}>
                  <ThemedText type="small" style={styles.colName} numberOfLines={1}>
                    {r.displayName}
                  </ThemedText>
                  <ThemedText type="small" style={styles.colNum}>
                    {r.dayNumber}
                  </ThemedText>
                  <ThemedText type="small" style={styles.colNum}>
                    {r.doneDays}
                  </ThemedText>
                  <ThemedText
                    type={r.missedDays > 0 ? 'smallBold' : 'small'}
                    style={[styles.colNum, r.missedDays > 0 && styles.missed]}>
                    {r.missedDays}
                  </ThemedText>
                  <ThemedText type="smallBold" style={[styles.colNum, { color: theme.backgroundSelected }]}>
                    {r.weekPoints}
                  </ThemedText>
                  <ThemedText type="small" style={styles.colNum}>
                    {r.totalPoints}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            「일차」는 시작일로부터 며칠째인지, 「마친 날」은 통독 완료를 누른 날 수입니다. 이름이 이메일로
            보이는 분은 아직 닉네임을 안 지으신 분입니다.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  backRow: { marginBottom: Spacing.two },
  summary: { marginBottom: Spacing.one },
  sortRow: { flexDirection: 'row', gap: Spacing.one, marginBottom: Spacing.one },
  sortChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  sortChipOn: { color: '#fff' },
  loader: { marginTop: Spacing.four },
  table: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 4,
  },
  headRow: { paddingBottom: 6 },
  colName: { flex: 1, minWidth: 0 },
  colNum: { width: 46, textAlign: 'right' },
  missed: { color: '#c0392b' },
  note: { marginTop: Spacing.three, lineHeight: 19 },
});
