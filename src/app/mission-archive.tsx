import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { createSubject, listSubjects, type MissionSubject } from '@/db/missionArchive';
import { ChipRow, Field, MissionCard, PrimaryButton } from '@/features/mission/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import type { MissionRole } from '@/lib/missionArchive';

/**
 * 사명기록관 — 기록할 사역자를 고르는 첫 화면.
 *
 * 한 계정이 여러 사람을 기록할 수 있게 목록으로 두었다. 유가족이 부모의 생애를
 * 기록하거나, 교회 기록 담당자가 여러 사역자를 맡는 경우가 기획서 §17 에 있다.
 *
 * 여기 담기는 것은 전부 본인만 볼 수 있다(0079). 선교지 보안이 걸린 기록이라
 * 공유 스위치 자체를 두지 않았다.
 */

const ROLE_OPTIONS: { id: MissionRole; label: string }[] = [
  { id: 'pastor', label: '목회자' },
  { id: 'missionary', label: '선교사' },
  { id: 'both', label: '목회자 · 선교사' },
  { id: 'other', label: '그 밖의 사역자' },
];

export function roleLabel(role: MissionRole): string {
  return ROLE_OPTIONS.find((r) => r.id === role)?.label ?? role;
}

export default function MissionArchiveScreen() {
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const ownerId = session?.user.id ?? null;

  const [subjects, setSubjects] = useState<MissionSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<MissionRole>('pastor');
  const [church, setChurch] = useState('');

  const load = useCallback(async () => {
    // 로그인 전에도 이 함수가 한 번 지난다. 그냥 돌아가면 돌림표가 영영 돈다.
    if (!ownerId) {
      setLoading(false);
      return;
    }
    try {
      setSubjects(await listSubjects(ownerId));
      setMessage('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function submit() {
    if (!ownerId || !name.trim()) return;
    setBusy(true);
    try {
      const id = await createSubject(ownerId, { name: name.trim(), role, church: church.trim() });
      setName('');
      setChurch('');
      setFormOpen(false);
      router.push(`/mission-archive/${id}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '등록하지 못했어요.');
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
          <ThemedText style={Type.screenTitle}>사명기록관</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.body}>
            한 사람의 사명을 기록하여 다음 세대의 믿음을 깨웁니다. 매일 한 가지 질문에 답하면
            소명부터 지금까지의 사역이 한 권의 기록으로 모입니다.
          </ThemedText>

          <MissionCard style={{ borderColor: theme.accentSoft }}>
            <ThemedText style={Type.caption} themeColor="textSecondary">
              여기 적는 모든 내용은 본인만 볼 수 있습니다. 선교지의 안전을 위해 다른 사람에게
              공개하는 기능은 두지 않았습니다.
            </ThemedText>
          </MissionCard>

          {loading ? (
            <ActivityIndicator style={styles.loading} color={theme.accent} />
          ) : (
            <View style={styles.list}>
              {subjects.map((subject) => (
                <Pressable
                  key={subject.id}
                  onPress={() => router.push(`/mission-archive/${subject.id}`)}
                  style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
                  <MissionCard>
                    <ThemedText style={Type.itemTitle}>
                      {subject.name}
                      {subject.is_deceased ? ' (고인)' : ''}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                      {[roleLabel(subject.role), subject.church, subject.fields]
                        .filter(Boolean)
                        .join(' · ') || '아직 정보를 적지 않았습니다'}
                    </ThemedText>
                  </MissionCard>
                </Pressable>
              ))}

              {subjects.length === 0 ? (
                <ThemedText themeColor="textSecondary" style={Type.body}>
                  아직 기록을 시작한 사역자가 없습니다. 아래에서 한 분을 등록해 주세요.
                </ThemedText>
              ) : null}
            </View>
          )}

          {formOpen ? (
            <MissionCard>
              <ThemedText style={Type.itemTitle}>기록할 사역자</ThemedText>
              <Field label="성함" value={name} onChangeText={setName} placeholder="예) 김○○ 목사" />
              <ChipRow label="사역" options={ROLE_OPTIONS} value={role} onChange={setRole} />
              <Field
                label="교회 · 선교단체"
                value={church}
                onChangeText={setChurch}
                placeholder="예) 새부대교회"
                hint="나중에 자세한 정보를 더 적을 수 있습니다."
              />
              <PrimaryButton label={busy ? '등록 중…' : '등록하고 시작하기'} onPress={submit} disabled={busy || !name.trim()} />
              <PrimaryButton label="취소" tone="quiet" onPress={() => setFormOpen(false)} />
            </MissionCard>
          ) : (
            <PrimaryButton label="+ 사역자 등록" onPress={() => setFormOpen(true)} />
          )}

          {message ? (
            <ThemedText style={[Type.caption, { color: theme.accent }]}>{message}</ThemedText>
          ) : null}
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
  list: { gap: Spacing.two },
  loading: { marginVertical: Spacing.four },
  pressed: { opacity: 0.7 },
});
