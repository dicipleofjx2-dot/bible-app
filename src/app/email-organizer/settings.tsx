import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { ACTION_LABEL, resetDemo } from '@/db/emailOrganizer';
import { Field, MailCard, PrimaryButton, TrialBanner } from '@/features/email/ui';
import { useMailbox } from '@/features/email/useMailbox';
import { useTheme } from '@/hooks/use-theme';
import { formatReceivedAt } from '@/lib/emailOrganizer';
import { DEMO_ACCOUNTS } from '@/lib/emailOrganizerSample';

/**
 * 설정(기획서 §8.4)과 활동 기록·되돌리기(§7.8).
 *
 * 보호 발신자·보호 단어를 여기 둔 이유: 이 둘이 「AI가 내 중요한 메일을 지울까」에
 * 대한 사용자의 **직접적인 대답**이다. 설정 안쪽 깊이 숨기면 아무도 못 쓰고,
 * 못 쓰면 결국 기능 전체를 못 믿게 된다.
 *
 * 쉼표로 나눠 적게 한 것은 화면을 아끼려는 것이 아니다 — 「@church.org」처럼
 * 도메인 한 줄로 교회 메일 전체를 지키는 것이 항목을 하나씩 넣는 것보다 빠르다.
 */
export default function EmailSettingsScreen() {
  const theme = useTheme();
  const { settings, state, undo, updateSettings, trialDaysLeft, reload } = useMailbox();

  const [senders, setSenders] = useState('');
  const [words, setWords] = useState('');
  const [routineDays, setRoutineDays] = useState('30');
  const [adsDays, setAdsDays] = useState('0');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setSenders(settings.protectedSenders.join(', '));
    setWords(settings.protectedWords.join(', '));
    setRoutineDays(String(settings.routineDeleteDays));
    setAdsDays(String(settings.adsDeleteDays));
  }, [settings]);

  function save() {
    const toList = (v: string) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    // 숫자가 비거나 글자가 섞이면 예전 값을 그대로 둔다. 0으로 떨어뜨리면
    // 「받는 즉시 삭제 후보」가 되어 버려서, 오타 하나가 정리 기준을 바꾼다.
    const n = (v: string, fallback: number) => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : fallback);
    updateSettings({
      protectedSenders: toList(senders),
      protectedWords: toList(words),
      routineDeleteDays: n(routineDays, settings.routineDeleteDays),
      adsDeleteDays: n(adsDays, settings.adsDeleteDays),
    });
    setMessage('저장했습니다. 분류는 다음 목록부터 새 기준으로 다시 계산됩니다.');
  }

  const undoable = state.log.find((e) => !e.undone);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>설정</ThemedText>
          <TrialBanner daysLeft={trialDaysLeft} />

          <MailCard>
            <ThemedText style={Type.itemTitle}>연결된 계정</ThemedText>
            {DEMO_ACCOUNTS.map((a) => (
              <ThemedText key={a.id} themeColor="textSecondary" style={Type.itemDescription}>
                {a.label} · {a.address} · 체험 연결(실제 연동 아님)
              </ThemedText>
            ))}
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              Gmail은 OAuth, 한메일은 IMAP으로 붙습니다. 읽기 권한과 정리 권한을 나누어 요청하고,
              비밀번호는 어떤 경우에도 평문으로 저장하지 않습니다.
            </ThemedText>
          </MailCard>

          <MailCard>
            <ThemedText style={Type.itemTitle}>보호 규칙</ThemedText>
            <Field
              label="보호 발신자"
              value={senders}
              onChangeText={setSenders}
              placeholder="nts.go.kr, @church.org, 김요한"
              hint="여기 걸린 메일은 어떤 경우에도 삭제 후보가 되지 않습니다. 도메인만 적어도 됩니다."
            />
            <Field
              label="보호 단어"
              value={words}
              onChangeText={setWords}
              placeholder="계약, 세금, 보험, 병원"
              hint="제목이나 본문에 이 낱말이 있으면 삭제 후보에서 뺍니다."
            />
            <Field
              label="반복 알림을 삭제 후보로 옮기기까지(일)"
              value={routineDays}
              onChangeText={setRoutineDays}
              keyboardType="number-pad"
            />
            <Field
              label="광고를 삭제 후보로 옮기기까지(일)"
              value={adsDays}
              onChangeText={setAdsDays}
              keyboardType="number-pad"
              hint="0이면 받는 즉시 후보로 봅니다."
            />
            <PrimaryButton label="저장" onPress={save} />
            {message ? (
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                {message}
              </ThemedText>
            ) : null}
          </MailCard>

          <MailCard>
            <ThemedText style={Type.itemTitle}>체험 모드</ThemedText>
            <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
              {trialDaysLeft > 0
                ? `${trialDaysLeft}일 남았습니다. 그동안 AI는 제안만 하고, 휴지통 이동은 잠겨 있습니다.`
                : '체험 기간이 끝나 정리를 실행할 수 있습니다.'}
            </ThemedText>
            {trialDaysLeft > 0 ? (
              <PrimaryButton
                label="지금 체험 끝내고 정리 실행 켜기"
                tone="quiet"
                onPress={() => {
                  updateSettings({ trialEnded: true });
                  setMessage('체험을 끝냈습니다. 이제 휴지통 이동을 실행할 수 있습니다.');
                }}
              />
            ) : null}
          </MailCard>

          <MailCard>
            <ThemedText style={Type.itemTitle}>활동 기록</ThemedText>
            {state.log.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                아직 기록이 없습니다.
              </ThemedText>
            ) : (
              <View style={styles.log}>
                {state.log.slice(0, 20).map((entry) => (
                  <ThemedText
                    key={entry.id}
                    themeColor="textSecondary"
                    style={[Type.itemDescription, entry.undone && { textDecorationLine: 'line-through' }]}>
                    {formatReceivedAt(entry.at)} · {ACTION_LABEL[entry.kind]} · {entry.note}
                    {entry.undone ? ' (취소됨)' : ''}
                  </ThemedText>
                ))}
              </View>
            )}
            <PrimaryButton
              label={undoable ? `최근 작업 취소 (${ACTION_LABEL[undoable.kind]})` : '취소할 작업 없음'}
              tone="quiet"
              disabled={!undoable}
              onPress={() => undo()}
            />
          </MailCard>

          <MailCard style={{ borderColor: theme.border }}>
            <ThemedText style={Type.itemTitle}>개인정보</ThemedText>
            <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
              체험 기록(분류 수정·보관·휴지통 표시·설정)은 이 기기에만 저장되며 서버로 보내지
              않습니다. 메일 본문을 외부 AI 서비스로 보내지도 않습니다 — 분류와 요약은 앱 안의
              규칙으로 계산합니다.
            </ThemedText>
            <PrimaryButton
              label="체험 기록 모두 지우기"
              tone="quiet"
              onPress={async () => {
                await resetDemo();
                await reload();
                setMessage('체험 기록을 모두 지웠습니다.');
              }}
            />
          </MailCard>
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
  log: { gap: 4 },
});
