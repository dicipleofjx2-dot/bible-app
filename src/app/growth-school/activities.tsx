import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { createActivity, listActivities, type GrowthActivity } from '@/db/growth';
import { Field, GrowthCard, PrimaryButton, SectionTitle } from '@/features/growth/ui';
import { useSchool } from '@/features/growth/useSchool';
import { useTheme } from '@/hooks/use-theme';
import { formatKoreanDate, kstToday } from '@/lib/growth';

/**
 * 체험활동 목록 (기획서 §4.5).
 *
 * 만들 때는 제목과 날짜만 받는다. 목표·안전사항·참여 학생은 활동 화면에서
 * 채운다 — 출발 전에 열 칸을 채우게 하면 현장에서 못 쓴다.
 */
export default function GrowthActivitiesScreen() {
  const theme = useTheme();
  const { loading, userId, schoolId, isStaff } = useSchool();

  const [rows, setRows] = useState<GrowthActivity[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(kstToday());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!schoolId) return;
    try {
      setRows(await listActivities(schoolId));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    }
  }, [schoolId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function create() {
    if (!schoolId || !userId || !title.trim()) return;
    setBusy(true);
    try {
      const id = await createActivity(schoolId, title.trim(), date, userId);
      setTitle('');
      router.push(`/growth-school/activity/${id}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '만들지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isStaff ? (
          <GrowthCard>
            <SectionTitle hint="나머지는 활동 화면에서 채웁니다.">체험활동 만들기</SectionTitle>
            <Field label="활동 이름" value={title} onChangeText={setTitle} placeholder="가을 들꽃 탐사" />
            <Field label="날짜" value={date} onChangeText={setDate} placeholder="2026-09-18" />
            <PrimaryButton label="만들기" onPress={create} disabled={busy || !title.trim()} />
          </GrowthCard>
        ) : null}

        {rows.map((a) => (
          <Pressable key={a.id} onPress={() => router.push(`/growth-school/activity/${a.id}`)}>
            <GrowthCard>
              <View style={styles.head}>
                <ThemedText style={Type.itemTitle}>{a.title}</ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  {formatKoreanDate(a.on_date)}
                </ThemedText>
              </View>
              {a.place ? (
                <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                  {a.place}
                </ThemedText>
              ) : null}
              <ThemedText themeColor={a.shared_with_guardians ? 'accent' : 'textSecondary'} style={Type.caption}>
                {a.shared_with_guardians ? '보호자에게 공개됨' : '아직 공개하지 않음'}
              </ThemedText>
            </GrowthCard>
          </Pressable>
        ))}

        {!rows.length ? (
          <ThemedText themeColor="textSecondary" style={Type.body}>
            아직 활동이 없습니다.
          </ThemedText>
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
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
});
