import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { CategoryBadge, ImportanceBadge, MailCard, PrimaryButton, TrialBanner } from '@/features/email/ui';
import { useMailbox, type MailboxMail } from '@/features/email/useMailbox';
import { useTheme } from '@/hooks/use-theme';
import { formatReceivedAt, summarizeMail, todayDigest } from '@/lib/emailOrganizer';

/**
 * 오늘의 정리함(기획서 §7.2).
 *
 * 받은편지함을 통째로 보여 주면 「오늘 무엇을 하면 끝나는지」가 안 보인다.
 * 그래서 오늘 할 일을 네 장의 카드로만 자른다 — 답장 · 일정 · 보관 · 정리.
 * 한 메일은 한 카드에만 들어간다(`todayDigest`). 같은 메일이 네 번 나오면
 * 목록이 길어 보이기만 하고 끝나지 않는다.
 */
export default function EmailTodayScreen() {
  const theme = useTheme();
  const { loading, inbox, act, now, trialDaysLeft, canExecute } = useMailbox();
  const digest = useMemo(() => todayDigest(inbox), [inbox]);

  const total =
    digest.reply.length + digest.schedule.length + digest.keep.length + digest.cleanup.length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>오늘의 정리함</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            오늘 처리하면 끝나는 일만 모았습니다. 남은 {total}건.
          </ThemedText>
          <TrialBanner daysLeft={trialDaysLeft} />

          {loading ? (
            <ActivityIndicator color={theme.accent} style={styles.loading} />
          ) : (
            <>
              <Section title="✍️ 오늘 답장할 메일" empty="답장할 메일이 없습니다.">
                {digest.reply.map((mail) => (
                  <DigestRow key={mail.id} mail={mail} now={now}>
                    <PrimaryButton
                      label="답장 도우미 열기"
                      tone="quiet"
                      onPress={() => router.push(`/email-organizer/${mail.id}`)}
                    />
                  </DigestRow>
                ))}
              </Section>

              <Section title="📅 오늘 챙길 일정과 요청" empty="추출된 일정이 없습니다.">
                {digest.schedule.map(({ mail, when }) => (
                  <DigestRow key={mail.id} mail={mail} now={now}>
                    <ThemedText style={[Type.itemTitle, { color: theme.accent }]}>{when}</ThemedText>
                    <ThemedText themeColor="textSecondary" style={Type.caption}>
                      본문에 적힌 날짜를 그대로 옮겼습니다. 앱이 일정을 지어내지 않습니다.
                    </ThemedText>
                  </DigestRow>
                ))}
              </Section>

              <Section title="🗄️ 보관하면 좋은 자료" empty="보관을 권할 메일이 없습니다.">
                {digest.keep.map((mail) => (
                  <DigestRow key={mail.id} mail={mail} now={now}>
                    <PrimaryButton
                      label="보관하기"
                      tone="quiet"
                      onPress={() => act('archive', [mail.id], { archived: true, read: true })}
                    />
                  </DigestRow>
                ))}
              </Section>

              <Section title="🧹 정리해도 괜찮은 메일" empty="삭제 후보가 없습니다.">
                {digest.cleanup.slice(0, 5).map((mail) => (
                  <DigestRow key={mail.id} mail={mail} now={now}>
                    <ThemedText themeColor="textSecondary" style={Type.caption}>
                      {mail.classification.reasons[mail.classification.reasons.length - 1]}
                    </ThemedText>
                  </DigestRow>
                ))}
                {digest.cleanup.length > 0 ? (
                  <PrimaryButton
                    label={`삭제 후보 ${digest.cleanup.length}통 검토하기`}
                    onPress={() => router.push('/email-organizer/cleanup')}
                  />
                ) : null}
                {!canExecute ? (
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    체험 기간에는 검토만 하고 실제로 옮기지 않습니다.
                  </ThemedText>
                ) : null}
              </Section>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children.flat().filter(Boolean) : children;
  const isEmpty = Array.isArray(items) ? items.length === 0 : !items;
  return (
    <View style={styles.section}>
      <ThemedText style={Type.itemTitle}>{title}</ThemedText>
      {isEmpty ? (
        <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
          {empty}
        </ThemedText>
      ) : (
        items
      )}
    </View>
  );
}

function DigestRow({
  mail,
  now,
  children,
}: {
  mail: MailboxMail;
  now: Date;
  children?: React.ReactNode;
}) {
  const summary = summarizeMail(mail);
  return (
    <Pressable onPress={() => router.push(`/email-organizer/${mail.id}`)}>
      <MailCard>
        <View style={styles.head}>
          <ThemedText style={[Type.sectionTitle, styles.flex]} numberOfLines={1}>
            {mail.fromName}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.caption}>
            {formatReceivedAt(mail.receivedAt, now)}
          </ThemedText>
        </View>
        <ThemedText style={Type.itemTitle} numberOfLines={2}>
          {mail.subject}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={Type.itemDescription} numberOfLines={2}>
          {summary.lines[0]}
        </ThemedText>
        <View style={styles.badges}>
          <CategoryBadge category={mail.classification.category} />
          <ImportanceBadge importance={mail.classification.importance} />
        </View>
        {children}
      </MailCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  section: { gap: Spacing.two },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  loading: { marginTop: Spacing.four },
});
