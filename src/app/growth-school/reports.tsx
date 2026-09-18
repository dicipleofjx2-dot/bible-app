import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { listRecords, listReports, listStudents, type GrowthStudent } from '@/db/growth';
import { GrowthCard, PrimaryButton, SectionTitle } from '@/features/growth/ui';
import { useSchool } from '@/features/growth/useSchool';
import { useTheme } from '@/hooks/use-theme';
import {
  areaLabel,
  closingChecklist,
  formatKoreanMonth,
  kstMonth,
  monthRange,
  previousMonth,
  sufficiencyLabel,
  type ClosingRow,
} from '@/lib/growth';

/**
 * 월말 마감센터 (기획서 §5.5).
 *
 * 학생마다 「이 달 기록이 얼마나 쌓였는지」와 「빠진 영역」을 보여 준다.
 * **막지는 않는다** — 아이가 한 달 아팠으면 기록이 적은 것이 사실이고, 그
 * 사실대로 보고서가 나가야 한다. 빠진 것을 알려 줄 뿐이다.
 */
export default function GrowthReportsScreen() {
  const theme = useTheme();
  const { loading, schoolId, isStaff } = useSchool();

  const [period, setPeriod] = useState(kstMonth());
  const [rows, setRows] = useState<ClosingRow[]>([]);
  const [students, setStudents] = useState<GrowthStudent[]>([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      const ss = await listStudents(schoolId);
      setStudents(ss);
      const ids = ss.map((s) => s.id);
      const { from, to } = monthRange(period);
      const [records, reports] = await Promise.all([listRecords(ids, from, to), listReports(ids, period)]);
      setRows(closingChecklist(ss, records, reports, period));
      setMessage('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    } finally {
      setBusy(false);
    }
  }, [schoolId, period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }

  if (!isStaff) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={Type.body}>교사만 볼 수 있는 화면입니다.</ThemedText>
      </ThemedView>
    );
  }

  const sent = rows.filter((r) => r.reportStatus === 'sent').length;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <ThemedText style={Type.screenTitle}>{formatKoreanMonth(period)} 마감</ThemedText>
          <View style={styles.monthRow}>
            <Pressable onPress={() => setPeriod(previousMonth(period))}>
              <ThemedText style={[Type.itemTitle, { color: theme.accent }]}>◀ 지난달</ThemedText>
            </Pressable>
            {period !== kstMonth() ? (
              <Pressable onPress={() => setPeriod(kstMonth())}>
                <ThemedText style={[Type.itemTitle, { color: theme.accent }]}>이번 달 ▶</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>

        <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
          보호자에게 보낸 보고서 {sent}/{rows.length}건
        </ThemedText>

        {busy ? <ActivityIndicator color={theme.accent} /> : null}

        {rows.map((r) => {
          const suff = sufficiencyLabel(r);
          return (
            <Pressable
              key={r.studentId}
              onPress={() => router.push(`/growth-school/report/${r.studentId}?period=${period}`)}>
              <GrowthCard>
                <View style={styles.rowBetween}>
                  <ThemedText style={Type.itemTitle}>{r.name}</ThemedText>
                  <ThemedText
                    themeColor={r.reportStatus === 'sent' ? 'accent' : 'textSecondary'}
                    style={Type.caption}>
                    {r.reportStatus === 'sent'
                      ? '보냈습니다'
                      : r.reportStatus === 'approved'
                        ? '승인됨'
                        : r.reportStatus === 'draft'
                          ? '작성 중'
                          : '아직 없음'}
                  </ThemedText>
                </View>
                <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                  기록 {r.recordDays}일 · {r.recordCount}건 · {suff.label}
                </ThemedText>
                {r.missingAreas.length ? (
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    빠진 영역: {r.missingAreas.map(areaLabel).join(' · ')}
                  </ThemedText>
                ) : null}
              </GrowthCard>
            </Pressable>
          );
        })}

        {!rows.length && !busy ? (
          <GrowthCard>
            <SectionTitle>학생이 없습니다</SectionTitle>
            <PrimaryButton label="학교 설정으로" onPress={() => router.push('/growth-school/setup')} />
          </GrowthCard>
        ) : null}

        {message ? (
          <ThemedText themeColor="textSecondary" style={Type.caption}>
            {message}
          </ThemedText>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  head: { gap: Spacing.one },
  monthRow: { flexDirection: 'row', gap: Spacing.three },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
});
