import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  CategoryBadge,
  Chips,
  ImportanceBadge,
  MailCard,
  PrimaryButton,
  SearchField,
  TrialBanner,
} from '@/features/email/ui';
import { useMailbox, type MailboxMail } from '@/features/email/useMailbox';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_META, CATEGORY_ORDER, formatReceivedAt, todayDigest } from '@/lib/emailOrganizer';
import { DEMO_ACCOUNTS } from '@/lib/emailOrganizerSample';

/**
 * 이메일 정리ON — 통합 받은편지함(기획서 §7.1·§8.1).
 *
 * 왼쪽 메뉴(받은메일·중요메일·보관함·삭제 후보)를 폰에서는 세로 메뉴로 둘 수
 * 없어 **알약 줄**로 옮겼다. 분류함도 같은 방식이다 — 목록 위에 필터를 쌓으면
 * 정작 메일이 안 보이므로, 알약 두 줄까지만 두고 나머지는 검색으로 받는다.
 *
 * 실제 Gmail·한메일은 아직 붙지 않았다(§17). 여기 보이는 것은 예시 메일이고,
 * 어떤 단추도 바깥 메일 서비스를 건드리지 않는다.
 */

type ViewId = 'inbox' | 'important' | 'archive' | 'cleanup' | 'trash';

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'inbox', label: '받은메일' },
  { id: 'important', label: '중요메일' },
  { id: 'archive', label: '보관함' },
  { id: 'cleanup', label: '삭제 후보' },
  { id: 'trash', label: '휴지통' },
];

export default function EmailOrganizerScreen() {
  const theme = useTheme();
  const { loading, mails, inbox, act, now, trialDaysLeft, canExecute } = useMailbox();

  const [view, setView] = useState<ViewId>('inbox');
  const [category, setCategory] = useState<'all' | (typeof CATEGORY_ORDER)[number]>('all');
  const [account, setAccount] = useState<'all' | string>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const digest = useMemo(() => todayDigest(inbox), [inbox]);

  const list = useMemo(() => {
    let rows: MailboxMail[];
    switch (view) {
      case 'important':
        rows = inbox.filter(
          (m) => m.flags.pinned || m.classification.importance === 'urgent' || m.classification.importance === 'important',
        );
        break;
      case 'archive':
        rows = mails.filter((m) => m.flags.archived && !m.flags.trashed);
        break;
      case 'cleanup':
        rows = inbox.filter((m) => m.classification.deleteCandidate);
        break;
      case 'trash':
        rows = mails.filter((m) => m.flags.trashed);
        break;
      default:
        rows = inbox;
    }
    if (category !== 'all') rows = rows.filter((m) => m.classification.category === category);
    if (account !== 'all') rows = rows.filter((m) => m.accountId === account);
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((m) =>
        `${m.fromName} ${m.fromAddress} ${m.subject} ${m.body}`.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [view, mails, inbox, category, account, query]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function run(kind: 'read' | 'archive' | 'trash' | 'restore') {
    const ids = selected;
    setSelected([]);
    if (kind === 'read') await act('read', ids, { read: true });
    if (kind === 'archive') await act('archive', ids, { archived: true });
    if (kind === 'trash') await act('trash', ids, { trashed: true, archived: false });
    if (kind === 'restore') await act('restore', ids, { trashed: false, archived: false });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>이메일 정리ON</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            중요한 메일은 놓치지 않고, 광고와 반복 알림은 안전하게 정리합니다. 지금은 예시 메일로
            움직여 보는 체험판입니다 — 실제 Gmail·한메일은 연결되지 않았습니다.
          </ThemedText>

          <TrialBanner daysLeft={trialDaysLeft} />

          <View style={styles.accounts}>
            {DEMO_ACCOUNTS.map((a) => (
              <View key={a.id} style={[styles.accountPill, { borderColor: theme.border }]}>
                <View style={[styles.dot, { backgroundColor: a.color }]} />
                <ThemedText style={Type.caption}>
                  {a.label} · {a.address} · 체험 연결
                </ThemedText>
              </View>
            ))}
          </View>

          {/* 상단 요약 카드(§8.1). 숫자를 누르면 그 일만 하는 화면으로 간다. */}
          <View style={styles.summaryRow}>
            <SummaryCard
              label="답장 필요"
              count={digest.reply.length}
              onPress={() => router.push('/email-organizer/today')}
            />
            <SummaryCard
              label="보관 추천"
              count={digest.keep.length}
              onPress={() => router.push('/email-organizer/today')}
            />
            <SummaryCard
              label="삭제 후보"
              count={digest.cleanup.length}
              onPress={() => router.push('/email-organizer/cleanup')}
            />
          </View>

          <View style={styles.actionsRow}>
            <PrimaryButton label="🗂️ 오늘의 정리함" onPress={() => router.push('/email-organizer/today')} />
            <PrimaryButton
              label="⚙️ 설정"
              tone="quiet"
              onPress={() => router.push('/email-organizer/settings')}
            />
          </View>

          <SearchField value={query} onChangeText={setQuery} placeholder="발신자·제목·본문 검색" />
          <Chips options={VIEWS} value={view} onChange={setView} />
          <Chips
            options={[
              { id: 'all' as const, label: '전체 분류' },
              ...CATEGORY_ORDER.map((c) => ({ id: c, label: `${CATEGORY_META[c].emoji} ${CATEGORY_META[c].label}` })),
            ]}
            value={category}
            onChange={setCategory}
          />
          <Chips
            options={[
              { id: 'all', label: '모든 계정' },
              ...DEMO_ACCOUNTS.map((a) => ({ id: a.id, label: a.label })),
            ]}
            value={account}
            onChange={setAccount}
          />

          {selected.length > 0 ? (
            <MailCard style={{ borderColor: theme.accent }}>
              <ThemedText style={Type.itemTitle}>{selected.length}통 선택됨</ThemedText>
              <View style={styles.actionsRow}>
                <PrimaryButton label="읽음" tone="quiet" onPress={() => run('read')} />
                <PrimaryButton label="보관" tone="quiet" onPress={() => run('archive')} />
                {view === 'trash' ? (
                  <PrimaryButton label="되돌리기" onPress={() => run('restore')} />
                ) : (
                  <PrimaryButton label="휴지통으로" onPress={() => run('trash')} disabled={!canExecute} />
                )}
              </View>
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                {canExecute
                  ? '휴지통으로 옮기기만 합니다. 영구 삭제는 이 앱에 없습니다.'
                  : '체험 기간에는 휴지통 이동이 잠겨 있습니다.'}
              </ThemedText>
            </MailCard>
          ) : null}

          {loading ? (
            <ActivityIndicator color={theme.accent} style={styles.loading} />
          ) : list.length === 0 ? (
            <MailCard>
              <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                조건에 맞는 메일이 없습니다.
              </ThemedText>
            </MailCard>
          ) : (
            <View style={styles.list}>
              {list.map((mail) => (
                <MailRow
                  key={mail.id}
                  mail={mail}
                  now={now}
                  selected={selected.includes(mail.id)}
                  onToggle={() => toggle(mail.id)}
                  onOpen={() => router.push(`/email-organizer/${mail.id}`)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SummaryCard({ label, count, onPress }: { label: string; count: number; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.summaryCard, { borderColor: theme.border, backgroundColor: theme.backgroundElement, opacity: pressed ? 0.75 : 1 }]}>
      <ThemedText style={[Type.screenTitle, { color: theme.accent }]}>{count}</ThemedText>
      <ThemedText themeColor="textSecondary" style={Type.caption}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function MailRow({
  mail,
  now,
  selected,
  onToggle,
  onOpen,
}: {
  mail: MailboxMail;
  now: Date;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const account = DEMO_ACCOUNTS.find((a) => a.id === mail.accountId);
  return (
    <View style={styles.row}>
      {/* 선택은 왼쪽 동그라미에서만 받는다. 줄 전체를 선택으로 두면 메일을
          열려다 고르게 되고, 그 상태에서 「휴지통으로」를 누르면 엉뚱한 메일이
          간다. */}
      <Pressable onPress={onToggle} hitSlop={8} style={styles.checkWrap}>
        <View
          style={[
            styles.check,
            { borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.accent : 'transparent' },
          ]}
        />
      </Pressable>
      <Pressable onPress={onOpen} style={({ pressed }) => [styles.rowBody, pressed && { opacity: 0.7 }]}>
        <MailCard style={mail.read ? undefined : { borderColor: theme.accentSoft }}>
          <View style={styles.rowHead}>
            <View style={[styles.dot, { backgroundColor: account?.color ?? theme.border }]} />
            <ThemedText style={[Type.sectionTitle, styles.flex]} numberOfLines={1}>
              {mail.read ? '' : '● '}
              {mail.fromName}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              {formatReceivedAt(mail.receivedAt, now)}
            </ThemedText>
          </View>
          <ThemedText style={Type.itemTitle} numberOfLines={1}>
            {mail.subject}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription} numberOfLines={1}>
            {mail.body.replace(/\n/g, ' ')}
          </ThemedText>
          <View style={styles.badges}>
            <CategoryBadge category={mail.classification.category} />
            <ImportanceBadge importance={mail.classification.importance} />
            {mail.classification.needsReply ? (
              <ThemedText style={[Type.caption, { color: theme.accent }]}>✍️ 답장 필요</ThemedText>
            ) : null}
            {mail.attachments.length > 0 ? (
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                📎 {mail.attachments.length}
              </ThemedText>
            ) : null}
            {mail.flags.archived ? (
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                🗄️ 보관됨
              </ThemedText>
            ) : null}
            {mail.flags.trashed ? (
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                🗑️ 휴지통
              </ThemedText>
            ) : null}
          </View>
        </MailCard>
      </Pressable>
    </View>
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
  accounts: { gap: Spacing.one },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  summaryRow: { flexDirection: 'row', gap: Spacing.two },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  actionsRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  list: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  checkWrap: { paddingVertical: Spacing.two },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  rowBody: { flex: 1 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  badges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
  loading: { marginTop: Spacing.four },
});
