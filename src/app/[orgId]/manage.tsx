import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  canAdmin,
  canWrite,
  getOrg,
  listItems,
  listMembers,
  listSpaces,
  myRole,
  purgeItem,
  restoreItem,
  setMemberRole,
  removeMember,
  type InvItem,
  type InvMember,
  type InvOrg,
  type InvRole,
  type InvSpace,
} from '@/db/inventory';
import {
  Badge,
  EmptyNote,
  Field,
  InvCard,
  PrimaryButton,
  SectionTitle,
} from '@/features/inventory/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  formatQty,
  pathLabel,
  relativeDay,
  STATUS_META,
  stockState,
  summarize,
  trashDaysLeft,
} from '@/lib/inventory';

/**
 * 관리(§5.1 의 「관리」 탭) — 부족한 물품, 휴지통, 함께 관리하는 사람.
 *
 * ── 휴지통이 왜 따로 있나 ───────────────────────────────────────────
 * 다 쓴 소모품과 버린 물건을 목록에서 지워 버리면, 다음에 얼마를 사야 하는지
 * 아무도 모른다(§4.6). 여기서는 목록에서 내려간 것들을 모아 두고 30일 안에
 * 되돌릴 수 있게 한다. 영구 삭제는 관리자만 — 이력까지 같이 사라진다.
 *
 * ── 초대를 어떻게 하나 ──────────────────────────────────────────────
 * 이메일로 초대장을 보내는 길은 아직 없다. 지금은 **상대의 사용자 id 를 받아
 * 등급을 준다**. 계정 없이 들어오게 하는 길은 열지 않았다 — 여기엔 남의 집
 * 안방 사진이 있다.
 */
export default function InventoryManageScreen() {
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();

  const [org, setOrg] = useState<InvOrg | null>(null);
  const [items, setItems] = useState<InvItem[]>([]);
  const [spaces, setSpaces] = useState<InvSpace[]>([]);
  const [members, setMembers] = useState<InvMember[]>([]);
  const [role, setRole] = useState<InvRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [inviteId, setInviteId] = useState('');
  const [inviteName, setInviteName] = useState('');

  const load = useCallback(async () => {
    if (!orgId || !session) {
      setLoading(false);
      return;
    }
    try {
      const [nextOrg, nextItems, nextSpaces, nextRole] = await Promise.all([
        getOrg(orgId),
        listItems(orgId, { includeTrash: true }),
        listSpaces(orgId),
        myRole(orgId),
      ]);
      setOrg(nextOrg);
      setItems(nextItems);
      setSpaces(nextSpaces);
      setRole(nextRole);
      setMembers(await listMembers(orgId).catch(() => []));
      setMessage('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [orgId, session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const live = useMemo(() => items.filter((i) => !i.deleted_at), [items]);
  const trash = useMemo(() => items.filter((i) => i.deleted_at), [items]);
  const low = useMemo(
    () => live.filter((i) => i.min_qty > 0 && stockState(i.qty, i.min_qty) !== 'ok'),
    [live],
  );
  const summary = useMemo(() => summarize(live), [live]);
  const writable = canWrite(role);
  const admin = canAdmin(role);

  async function restore(itemId: string) {
    setBusy(true);
    try {
      await restoreItem(itemId);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '되돌리지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function purge(itemId: string) {
    setBusy(true);
    try {
      await purgeItem(itemId);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '영구 삭제하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function invite() {
    if (!orgId || !inviteId.trim()) return;
    setBusy(true);
    try {
      await setMemberRole(orgId, inviteId.trim(), 'keeper', inviteName.trim());
      setInviteId('');
      setInviteName('');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '추가하지 못했어요. 사용자 id를 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator style={{ marginTop: Spacing.four }} />
          ) : (
            <>
              <InvCard>
                <SectionTitle title={org?.name ?? '관리'} />
                <View style={styles.statRow}>
                  <Stat label="물품" value={`${summary.kinds}종`} />
                  <Stat label="총수량" value={`${Math.round(summary.total)}`} />
                  <Stat label="부족" value={`${summary.low + summary.out}`} />
                  <Stat label="휴지통" value={`${trash.length}`} />
                </View>
              </InvCard>

              <SectionTitle title={`부족한 물품 ${low.length}종`} />
              {low.length === 0 ? (
                <InvCard>
                  <EmptyNote emoji="✅" text="지금 부족한 물품은 없습니다." />
                </InvCard>
              ) : (
                <InvCard style={styles.listCard}>
                  {low.map((item, index) => (
                    <Pressable
                      key={item.id}
                      onPress={() => router.push(`/${orgId}/item/${item.id}`)}
                      style={({ pressed }) => [
                        styles.row,
                        index > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
                        { opacity: pressed ? 0.7 : 1 },
                      ]}>
                      <View style={styles.flex}>
                        <ThemedText style={Type.itemTitle} numberOfLines={1}>
                          {item.name}
                        </ThemedText>
                        <ThemedText themeColor="textSecondary" style={Type.caption} numberOfLines={1}>
                          {formatQty(item.qty, item.unit)} / 최소 {formatQty(item.min_qty, item.unit)} ·{' '}
                          {pathLabel(spaces, item.space_id)}
                        </ThemedText>
                      </View>
                      <Badge
                        label={stockState(item.qty, item.min_qty) === 'out' ? '품절' : '부족'}
                        tone={stockState(item.qty, item.min_qty) === 'out' ? 'alert' : 'warn'}
                      />
                    </Pressable>
                  ))}
                </InvCard>
              )}

              <SectionTitle title={`휴지통 ${trash.length}`} />
              {trash.length === 0 ? (
                <InvCard>
                  <EmptyNote emoji="🗑️" text="휴지통이 비어 있습니다." />
                </InvCard>
              ) : (
                <InvCard style={styles.listCard}>
                  {trash.map((item, index) => (
                    <View
                      key={item.id}
                      style={[
                        styles.row,
                        index > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
                      ]}>
                      <View style={styles.flex}>
                        <ThemedText style={Type.itemTitle} numberOfLines={1}>
                          {item.name}
                        </ThemedText>
                        <ThemedText themeColor="textSecondary" style={Type.caption}>
                          {STATUS_META[item.status].label}
                          {item.deleted_reason ? ` · ${item.deleted_reason}` : ''} ·{' '}
                          {relativeDay(item.deleted_at ?? '')} · {trashDaysLeft(item.deleted_at ?? '')}일 남음
                        </ThemedText>
                      </View>
                      {writable ? (
                        <Pressable onPress={() => restore(item.id)} disabled={busy}>
                          <ThemedText style={[Type.caption, { color: theme.accent }]}>되돌리기</ThemedText>
                        </Pressable>
                      ) : null}
                      {admin ? (
                        <Pressable onPress={() => purge(item.id)} disabled={busy}>
                          <ThemedText themeColor="textSecondary" style={Type.caption}>
                            영구 삭제
                          </ThemedText>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </InvCard>
              )}

              {admin ? (
                <>
                  <SectionTitle title="함께 관리하는 사람" />
                  <InvCard>
                    {members.length === 0 ? (
                      <ThemedText themeColor="textSecondary" style={Type.caption}>
                        아직 함께 관리하는 사람이 없습니다.
                      </ThemedText>
                    ) : (
                      members.map((member) => (
                        <View key={member.user_id} style={styles.memberRow}>
                          <View style={styles.flex}>
                            <ThemedText style={Type.itemDescription} numberOfLines={1}>
                              {member.display_name || member.user_id.slice(0, 8)}
                            </ThemedText>
                            <ThemedText themeColor="textSecondary" style={Type.caption}>
                              {ROLE_LABEL[member.role] ?? member.role}
                            </ThemedText>
                          </View>
                          <Pressable
                            onPress={async () => {
                              setBusy(true);
                              await removeMember(orgId!, member.user_id).catch(() => {});
                              await load();
                              setBusy(false);
                            }}
                            disabled={busy}>
                            <ThemedText themeColor="textSecondary" style={Type.caption}>
                              내보내기
                            </ThemedText>
                          </Pressable>
                        </View>
                      ))
                    )}
                    <Field
                      label="사용자 id"
                      value={inviteId}
                      onChangeText={setInviteId}
                      placeholder="마이페이지에서 확인한 id"
                      hint="계정이 있는 사람만 더할 수 있습니다. 여기엔 집 안 사진이 들어 있어, 링크만으로 여는 길은 두지 않았습니다."
                    />
                    <Field label="표시할 이름" value={inviteName} onChangeText={setInviteName} />
                    <PrimaryButton
                      label={busy ? '추가하는 중…' : '담당자로 더하기'}
                      onPress={invite}
                      disabled={busy || !inviteId.trim()}
                    />
                  </InvCard>
                </>
              ) : null}
            </>
          )}

          {message ? (
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              {message}
            </ThemedText>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const ROLE_LABEL: Record<string, string> = {
  owner: '대표 관리자',
  manager: '공간 관리자',
  keeper: '담당자',
  member: '일반 사용자',
  viewer: '열람 전용',
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText style={Type.itemTitle}>{value}</ThemedText>
      <ThemedText themeColor="textSecondary" style={Type.caption}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  statRow: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  listCard: { padding: 0, gap: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  flex: { flex: 1 },
});
