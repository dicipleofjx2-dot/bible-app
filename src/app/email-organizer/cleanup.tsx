import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { MailCard, PrimaryButton, TrialBanner } from '@/features/email/ui';
import { useMailbox } from '@/features/email/useMailbox';
import { useTheme } from '@/hooks/use-theme';
import {
  formatReceivedAt,
  groupDeleteCandidates,
  subscriptionReport,
} from '@/lib/emailOrganizer';

/**
 * 삭제 후보 검토(기획서 §8.3)와 구독 정리(§7.7).
 *
 * 이 화면의 규칙 하나: **영구 삭제는 없다.** 가장 센 단추가 「휴지통으로
 * 이동」이고, 그마저 체험 기간에는 잠긴다. 되돌릴 수 없는 일을 한 번의 실수로
 * 할 수 있게 두지 않는다(§3.1).
 *
 * 발신자별로 묶어 보여 주는 이유: 광고는 대개 한 곳에서 여러 통 온다. 스무
 * 줄을 하나씩 판단하게 하면 사람이 지쳐서 「전체 선택」을 누르게 되고, 그때
 * 섞여 있던 중요한 메일이 함께 간다.
 */
export default function EmailCleanupScreen() {
  const theme = useTheme();
  const { loading, inbox, act, now, trialDaysLeft, canExecute } = useMailbox();
  const [excluded, setExcluded] = useState<string[]>([]);

  const groups = useMemo(() => groupDeleteCandidates(inbox), [inbox]);
  const subscriptions = useMemo(() => subscriptionReport(inbox), [inbox]);
  const guarded = useMemo(() => inbox.filter((m) => m.classification.guardReason), [inbox]);

  function toggle(id: string) {
    setExcluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function moveGroup(ids: string[], kind: 'archive' | 'trash') {
    const target = ids.filter((id) => !excluded.includes(id));
    if (target.length === 0) return;
    if (kind === 'archive') await act('archive', target, { archived: true, read: true });
    else await act('trash', target, { trashed: true });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>삭제 후보 검토</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            휴지통으로 옮기기만 합니다. 영구 삭제 기능은 이 앱에 없습니다. 옮긴 뒤에도 설정의
            활동 기록에서 되돌릴 수 있습니다.
          </ThemedText>
          <TrialBanner daysLeft={trialDaysLeft} />

          {guarded.length > 0 ? (
            <MailCard style={{ borderColor: theme.accentSoft }}>
              <ThemedText style={Type.itemTitle}>🔒 보호되어 후보에서 빠진 메일 {guarded.length}통</ThemedText>
              {guarded.slice(0, 5).map((m) => (
                <ThemedText key={m.id} themeColor="textSecondary" style={Type.caption}>
                  {m.fromName} · {m.classification.guardReason}
                </ThemedText>
              ))}
            </MailCard>
          ) : null}

          {loading ? (
            <ActivityIndicator color={theme.accent} style={styles.loading} />
          ) : groups.length === 0 ? (
            <MailCard>
              <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                삭제 후보가 없습니다. 받은편지함이 이미 정리되어 있습니다.
              </ThemedText>
            </MailCard>
          ) : (
            groups.map((group) => {
              const ids = group.mails.map((m) => m.id);
              const keeping = ids.filter((id) => !excluded.includes(id)).length;
              return (
                <MailCard key={group.fromAddress}>
                  <ThemedText style={Type.itemTitle}>{group.fromName}</ThemedText>
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    {group.fromAddress} · {group.count}통 · 최근 {formatReceivedAt(group.latestAt, now)}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                    후보로 본 이유: {group.reasons.slice(0, 2).join(' / ')}
                  </ThemedText>

                  {group.mails.map((m) => {
                    const off = excluded.includes(m.id);
                    return (
                      <Pressable key={m.id} onPress={() => toggle(m.id)} style={styles.mailLine}>
                        <View
                          style={[
                            styles.check,
                            {
                              borderColor: off ? theme.border : theme.accent,
                              backgroundColor: off ? 'transparent' : theme.accent,
                            },
                          ]}
                        />
                        <ThemedText
                          style={[Type.itemDescription, styles.flex, off && { textDecorationLine: 'line-through' }]}
                          numberOfLines={1}>
                          {m.subject}
                        </ThemedText>
                        <ThemedText themeColor="textSecondary" style={Type.caption}>
                          {formatReceivedAt(m.receivedAt, now)}
                        </ThemedText>
                      </Pressable>
                    );
                  })}

                  <View style={styles.actions}>
                    <PrimaryButton
                      label="이 발신자 메일 열어 보기"
                      tone="quiet"
                      onPress={() => router.push(`/email-organizer/${ids[0]}`)}
                    />
                    <PrimaryButton label={`보관 ${keeping}통`} tone="quiet" onPress={() => moveGroup(ids, 'archive')} />
                    <PrimaryButton
                      label={`휴지통으로 ${keeping}통`}
                      disabled={!canExecute || keeping === 0}
                      onPress={() => moveGroup(ids, 'trash')}
                    />
                  </View>
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    줄을 누르면 그 메일만 빼고 진행합니다.
                  </ThemedText>
                </MailCard>
              );
            })
          )}

          <ThemedText style={Type.itemTitle}>📮 구독 정리</ThemedText>
          {subscriptions.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
              구독 메일이 없습니다.
            </ThemedText>
          ) : (
            subscriptions.map((row) => (
              <MailCard key={row.fromAddress}>
                <ThemedText style={Type.sectionTitle}>{row.fromName}</ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  최근 {row.count}통 수신 · 열어 본 횟수 {row.openedCount}회
                  {row.unsubscribeUrl ? ' · 수신 거부 링크 있음' : ''}
                </ThemedText>
                {row.suggestUnsubscribe ? (
                  <ThemedText style={[Type.itemDescription, { color: theme.accent }]}>
                    다섯 통 넘게 왔지만 한 번도 열지 않으셨습니다. 구독을 끊는 것이 어떨까요?
                  </ThemedText>
                ) : null}
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  해지는 사용자가 확인한 뒤에만 실행합니다. 체험판에서는 표시만 남기고, 실제 해지는
                  계정 연결 뒤에 붙습니다.
                </ThemedText>
              </MailCard>
            ))
          )}
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
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  mailLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 4 },
  check: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  loading: { marginTop: Spacing.four },
});
