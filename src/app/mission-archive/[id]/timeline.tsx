import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  addTimelineRow,
  deleteTimelineRow,
  listTimeline,
  type MissionTimelineRow,
} from '@/db/missionArchive';
import { ChipRow, Field, MissionCard, PrimaryButton } from '@/features/mission/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { FACT_STATUS, factShort, type FactStatus } from '@/lib/missionArchive';

/** 웹에는 Alert.alert 확인 대화상자가 없다(중보기도 나무에서 겪은 것과 같다). */
function confirmDelete(message: string): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.confirm(message);
  return true;
}

const EMPTY = {
  year: '',
  month: '',
  place: '',
  org: '',
  role: '',
  event: '',
  people: '',
  evidence: '',
  fact: 'self' as FactStatus,
};

/**
 * 사역 연표 (기획서 §8).
 *
 * 연도가 없는 줄은 받지 않는다 — 연표는 순서가 전부인 표라, 짐작한 연도를 넣는
 * 순간 그 짐작이 그대로 교회사가 된다. 달은 비워 둘 수 있다(모르는 일이 훨씬
 * 많다).
 */
export default function MissionTimelineScreen() {
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ownerId = session?.user.id ?? null;

  const [rows, setRows] = useState<MissionTimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    if (!ownerId || !id) {
      setLoading(false);
      return;
    }
    try {
      setRows(await listTimeline(id));
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

  async function submit() {
    if (!ownerId || !id) return;
    const year = Number(form.year);
    if (!year) {
      setMessage('연도를 적어 주세요.');
      return;
    }
    setBusy(true);
    try {
      await addTimelineRow(ownerId, id, {
        year,
        month: form.month ? Number(form.month) : null,
        place: form.place,
        org: form.org,
        role: form.role,
        event: form.event,
        people: form.people,
        evidence: form.evidence,
        fact_status: form.fact,
      });
      setForm(EMPTY);
      setFormOpen(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '넣지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(rowId: string) {
    if (!confirmDelete('이 줄을 지울까요?')) return;
    setBusy(true);
    try {
      await deleteTimelineRow(rowId);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '지우지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!session) return <Redirect href="/profile" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>사역 연표</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            파송·개척·이동·위기·열매·이양을 연도로 남깁니다. 원고를 내보낼 때 부록으로 함께 들어갑니다.
          </ThemedText>

          {loading ? (
            <ActivityIndicator style={styles.loading} color={theme.accent} />
          ) : (
            <View style={styles.list}>
              {rows.map((row) => (
                <MissionCard key={row.id}>
                  <ThemedText style={Type.itemTitle}>
                    {row.year}
                    {row.month ? `.${String(row.month).padStart(2, '0')}` : ''} · {row.event || '(사건 없음)'}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                    {[row.place, row.org, row.role, row.people].filter(Boolean).join(' · ') || '—'}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    [{factShort(row.fact_status)}]{row.evidence ? ` 근거: ${row.evidence}` : ''}
                  </ThemedText>
                  <Pressable onPress={() => remove(row.id)} disabled={busy}>
                    <ThemedText style={[Type.caption, { color: theme.accent }]}>지우기</ThemedText>
                  </Pressable>
                </MissionCard>
              ))}
              {rows.length === 0 ? (
                <ThemedText themeColor="textSecondary" style={Type.body}>
                  아직 연표가 비어 있습니다. 인터뷰 화면에서 「이 답을 연표에 넣기」를 눌러도 한 줄씩 쌓입니다.
                </ThemedText>
              ) : null}
            </View>
          )}

          {formOpen ? (
            <MissionCard>
              <ThemedText style={Type.itemTitle}>연표 한 줄 더하기</ThemedText>
              <Field
                label="연도"
                value={form.year}
                onChangeText={(v) => setForm({ ...form, year: v.replace(/[^0-9]/g, '').slice(0, 4) })}
                keyboardType="number-pad"
                placeholder="예) 2001"
              />
              <Field
                label="월 (모르면 비워 두세요)"
                value={form.month}
                onChangeText={(v) => setForm({ ...form, month: v.replace(/[^0-9]/g, '').slice(0, 2) })}
                keyboardType="number-pad"
              />
              <Field label="장소" value={form.place} onChangeText={(v) => setForm({ ...form, place: v })} />
              <Field label="교회 · 기관" value={form.org} onChangeText={(v) => setForm({ ...form, org: v })} />
              <Field label="역할" value={form.role} onChangeText={(v) => setForm({ ...form, role: v })} />
              <Field label="주요 사건" value={form.event} onChangeText={(v) => setForm({ ...form, event: v })} />
              <Field label="관련 인물" value={form.people} onChangeText={(v) => setForm({ ...form, people: v })} />
              <Field label="근거 자료" value={form.evidence} onChangeText={(v) => setForm({ ...form, evidence: v })} />
              <ChipRow
                label="확인 상태"
                options={FACT_STATUS.map((f) => ({ id: f.id, label: f.short }))}
                value={form.fact}
                onChange={(v) => setForm({ ...form, fact: v })}
              />
              <PrimaryButton label={busy ? '넣는 중…' : '넣기'} onPress={submit} disabled={busy} />
              <PrimaryButton label="취소" tone="quiet" onPress={() => setFormOpen(false)} />
            </MissionCard>
          ) : (
            <PrimaryButton label="+ 연표 한 줄" onPress={() => setFormOpen(true)} />
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
