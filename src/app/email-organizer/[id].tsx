import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { CategoryBadge, Chips, ImportanceBadge, MailCard, PrimaryButton } from '@/features/email/ui';
import { useMailbox } from '@/features/email/useMailbox';
import { useTheme } from '@/hooks/use-theme';
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  REPLY_TONES,
  draftReply,
  formatReceivedAt,
  summarizeMail,
  summarizeThread,
  type MailCategory,
  type ReplyTone,
} from '@/lib/emailOrganizer';
import { DEMO_ACCOUNTS } from '@/lib/emailOrganizerSample';

/**
 * 메일 상세(기획서 §8.2).
 *
 * 원문을 맨 위에 두지 않고 **요약과 할 일을 먼저** 보여 준다. 긴 메일에서
 * 사용자가 찾는 것은 대개 「나는 무엇을 해야 하는가」다. 그래도 원문은 항상
 * 그 아래 통째로 있다 — 요약은 문장을 고른 것이지 새로 쓴 것이 아니라서,
 * 틀렸을 때 사람이 바로 대조할 수 있어야 한다.
 *
 * 답장은 **초안까지만** 만든다. 발송 단추가 없는 것이 실수가 아니다(§7.5).
 */
export default function EmailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { loading, mails, act, now, canExecute } = useMailbox();

  const mail = useMemo(() => mails.find((m) => m.id === id), [mails, id]);
  const thread = useMemo(
    () => (mail ? mails.filter((m) => m.threadId === mail.threadId) : []),
    [mails, mail],
  );

  const [tone, setTone] = useState<ReplyTone>('polite');
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');

  if (loading) return <ActivityIndicator color={theme.accent} style={styles.loading} />;
  if (!mail) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.loading}>메일을 찾지 못했습니다.</ThemedText>
      </ThemedView>
    );
  }

  const summary = summarizeMail(mail);
  const account = DEMO_ACCOUNTS.find((a) => a.id === mail.accountId);
  const cls = mail.classification;

  async function change(category: MailCategory) {
    if (!mail) return;
    await act('recategorize', [mail.id], { category }, `분류 수정 → ${CATEGORY_META[category].label}`);
    setNote(`분류를 ${CATEGORY_META[category].label}(으)로 고쳤습니다. 이 수정이 규칙으로 쌓입니다.`);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {cls.category === 'suspicious' ? (
            <MailCard style={{ borderColor: theme.accent }}>
              <ThemedText style={[Type.itemTitle, { color: theme.accent }]}>
                ⚠️ 의심 메일입니다
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                링크를 누르거나 비밀번호를 입력하지 마세요. 발신 주소를 한 글자씩 확인하시고,
                은행·기관은 직접 대표번호로 확인하시는 것이 안전합니다.
              </ThemedText>
            </MailCard>
          ) : null}

          <ThemedText style={Type.screenTitle}>{mail.subject}</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            {mail.fromName} · {mail.fromAddress}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.caption}>
            {account?.label} · {formatReceivedAt(mail.receivedAt, now)}
          </ThemedText>
          <View style={styles.badges}>
            <CategoryBadge category={cls.category} />
            <ImportanceBadge importance={cls.importance} />
          </View>

          <MailCard>
            <ThemedText style={Type.itemTitle}>3줄 요약</ThemedText>
            {summary.lines.map((line, i) => (
              <ThemedText key={i} style={Type.itemDescription}>
                · {line}
              </ThemedText>
            ))}
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              본문에 있는 문장을 고른 것입니다. 앱이 새 문장을 지어내지 않습니다.
            </ThemedText>
          </MailCard>

          <MailCard>
            <ThemedText style={Type.itemTitle}>핵심 정보</ThemedText>
            <Fact label="날짜·시간" values={summary.facts.dates} />
            <Fact label="금액" values={summary.facts.amounts} />
            <Fact label="장소" values={summary.facts.places} />
            <Fact label="사람" values={summary.facts.people} />
            {summary.facts.tasks.length > 0 ? (
              <>
                <ThemedText style={Type.sectionTitle}>해야 할 일</ThemedText>
                {summary.facts.tasks.map((t, i) => (
                  <ThemedText key={i} style={Type.itemDescription}>
                    ☐ {t}
                  </ThemedText>
                ))}
              </>
            ) : null}
          </MailCard>

          <MailCard>
            <ThemedText style={Type.itemTitle}>이렇게 분류한 이유</ThemedText>
            {cls.reasons.map((r, i) => (
              <ThemedText key={i} themeColor="textSecondary" style={Type.itemDescription}>
                · {r}
              </ThemedText>
            ))}
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              확신도 {Math.round(cls.confidence * 100)}% · 기본 처리: {CATEGORY_META[cls.category].handling}
              {cls.guardReason ? ` · ${cls.guardReason}` : ''}
            </ThemedText>
          </MailCard>

          <MailCard>
            <ThemedText style={Type.itemTitle}>분류 수정</ThemedText>
            <Chips
              options={CATEGORY_ORDER.map((c) => ({
                id: c,
                label: `${CATEGORY_META[c].emoji} ${CATEGORY_META[c].label}`,
              }))}
              value={cls.category}
              onChange={change}
            />
            {note ? (
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                {note}
              </ThemedText>
            ) : null}
          </MailCard>

          <View style={styles.actions}>
            <PrimaryButton
              label={mail.flags.pinned ? '★ 중요 해제' : '☆ 중요 표시'}
              tone="quiet"
              onPress={() => act('pin', [mail.id], { pinned: !mail.flags.pinned })}
            />
            <PrimaryButton
              label={mail.flags.archived ? '보관 해제' : '🗄️ 보관'}
              tone="quiet"
              onPress={() => act('archive', [mail.id], { archived: !mail.flags.archived })}
            />
            <PrimaryButton
              label={mail.flags.trashed ? '되돌리기' : '🗑️ 휴지통으로'}
              disabled={!canExecute && !mail.flags.trashed}
              onPress={() =>
                mail.flags.trashed
                  ? act('restore', [mail.id], { trashed: false })
                  : act('trash', [mail.id], { trashed: true })
              }
            />
          </View>

          <MailCard>
            <ThemedText style={Type.itemTitle}>답장 도우미</ThemedText>
            <Chips options={REPLY_TONES} value={tone} onChange={(t) => { setTone(t); setDraft(draftReply(mail, t)); }} />
            <PrimaryButton label="초안 만들기" tone="quiet" onPress={() => setDraft(draftReply(mail, tone))} />
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              placeholder="초안을 만든 뒤 여기서 고치세요."
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.replyInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
              ]}
            />
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              AI는 사용자 확인 없이 메일을 보내지 않습니다. 체험판에는 발송 기능이 없습니다 —
              실제 발송은 Gmail·IMAP 연동 뒤에 붙습니다.
            </ThemedText>
          </MailCard>

          {thread.length > 1 ? (
            <MailCard>
              <ThemedText style={Type.itemTitle}>대화 전체 흐름 ({thread.length}통)</ThemedText>
              {summarizeThread(thread).map((line, i) => (
                <ThemedText key={i} themeColor="textSecondary" style={Type.itemDescription}>
                  {i + 1}. {line}
                </ThemedText>
              ))}
            </MailCard>
          ) : null}

          <MailCard>
            <ThemedText style={Type.itemTitle}>원문</ThemedText>
            <ThemedText style={Type.body} selectable>
              {mail.body}
            </ThemedText>
            {mail.attachments.length > 0 ? (
              <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                📎 {mail.attachments.join(', ')}
              </ThemedText>
            ) : null}
          </MailCard>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Fact({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <ThemedText style={Type.itemDescription}>
      <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
        {label}:{' '}
      </ThemedText>
      {values.join(' · ')}
    </ThemedText>
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
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  replyInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: Spacing.two,
    minHeight: 120,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  loading: { marginTop: Spacing.four, alignSelf: 'center' },
});
