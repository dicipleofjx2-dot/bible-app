import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  canWrite,
  createSpace,
  getOrg,
  listItems,
  listRecentLogs,
  listSpaces,
  myRole,
  updateOrg,
  uploadPhoto,
  type InvItem,
  type InvOrg,
  type InvRole,
  type InvSpace,
  type RecentLog,
} from '@/db/inventory';
import { usePhotoUrls } from '@/features/inventory/photos';
import { pickPhoto } from '@/features/inventory/pick';
import {
  Badge,
  ChipRow,
  EmptyNote,
  Field,
  Hero,
  InvCard,
  PhotoFrame,
  PrimaryButton,
  QuickButton,
  SearchBox,
  SectionTitle,
  StatLine,
} from '@/features/inventory/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  CHILD_KINDS,
  categoryEmoji,
  childrenOf,
  descendantIds,
  formatQty,
  LOG_LABEL,
  relativeDay,
  spaceEmoji,
  SPACE_KINDS,
  stockState,
  summarize,
  summaryLine,
  type SpaceKind,
} from '@/lib/inventory';

/**
 * 관리 공간 홈(§5.2) — 사진으로 된 수납 지도의 첫 장.
 *
 * 목록보다 **사진이 먼저** 온다. 글을 읽지 않아도 「저 방이다」가 되어야
 * 장년층도 자기 물건을 찾는다(§6.1). 부족한 물품과 최근 활동은 그 아래에 둔다 —
 * 급한 것은 눈에 걸려야 하지만, 이 화면의 주인공은 공간 사진이다.
 */
export default function InventoryOrgScreen() {
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();

  const [org, setOrg] = useState<InvOrg | null>(null);
  const [role, setRole] = useState<InvRole | null>(null);
  const [spaces, setSpaces] = useState<InvSpace[]>([]);
  const [items, setItems] = useState<InvItem[]>([]);
  const [logs, setLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [spaceKind, setSpaceKind] = useState<SpaceKind>('room');

  const load = useCallback(async () => {
    if (!orgId || !session) {
      setLoading(false);
      return;
    }
    try {
      const [nextOrg, nextRole, nextSpaces, nextItems, nextLogs] = await Promise.all([
        getOrg(orgId),
        myRole(orgId),
        listSpaces(orgId),
        listItems(orgId),
        listRecentLogs(orgId, 8),
      ]);
      setOrg(nextOrg);
      setRole(nextRole);
      setSpaces(nextSpaces);
      setItems(nextItems);
      setLogs(nextLogs);
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

  const roots = useMemo(() => childrenOf(spaces, null), [spaces]);
  const photos = usePhotoUrls([org?.cover_path, ...roots.map((s) => s.cover_path)]);

  /** 방 카드 밑에 붙는 요약. 그 방 **아래 수납장까지** 합쳐 센다. */
  const summaryFor = useCallback(
    (spaceId: string) => {
      const ids = new Set(descendantIds(spaces, spaceId));
      return summarize(items.filter((i) => i.space_id && ids.has(i.space_id)));
    },
    [items, spaces],
  );

  const lowItems = useMemo(
    () => items.filter((i) => stockState(i.qty, i.min_qty) !== 'ok' && i.min_qty > 0).slice(0, 6),
    [items],
  );
  const unplaced = useMemo(() => items.filter((i) => !i.space_id), [items]);
  const writable = canWrite(role);

  async function changeCover() {
    if (!orgId) return;
    const picked = await pickPhoto('library', [4, 3]);
    if (!picked) return;
    setBusy(true);
    const { path, error } = await uploadPhoto(orgId, picked.uri);
    if (path) {
      await updateOrg(orgId, { cover_path: path });
      await load();
    } else setMessage(error ?? '사진을 올리지 못했어요.');
    setBusy(false);
  }

  async function addSpace() {
    if (!orgId || !spaceName.trim()) return;
    setBusy(true);
    try {
      await createSpace({ org_id: orgId, parent_id: null, kind: spaceKind, name: spaceName.trim() });
      setSpaceName('');
      setFormOpen(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '만들지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!session) return <Redirect href="/profile" />;

  const total = summarize(items);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator style={{ marginTop: Spacing.four }} />
          ) : !org ? (
            <InvCard>
              <EmptyNote emoji="🔒" text="열 수 없는 관리 공간입니다." />
            </InvCard>
          ) : (
            <>
              <Hero
                emoji={org.kind === 'home' ? '🏠' : org.kind === 'church' ? '⛪' : '🏫'}
                title={org.name}
                subtitle={summaryLine(total)}
              />

              <SearchBox
                value={query}
                onChangeText={setQuery}
                onSubmit={() =>
                  router.push(`/inventory/${orgId}/search?q=${encodeURIComponent(query)}`)
                }
              />

              <View style={styles.quickRow}>
                <QuickButton
                  emoji="📷"
                  label="물품 등록"
                  onPress={() => router.push(`/inventory/${orgId}/new`)}
                />
                <QuickButton
                  emoji="🔍"
                  label="찾기"
                  onPress={() => router.push(`/inventory/${orgId}/search`)}
                />
                <QuickButton emoji="🗄️" label="공간 추가" onPress={() => setFormOpen(true)} />
                <QuickButton
                  emoji="🧾"
                  label="관리"
                  onPress={() => router.push(`/inventory/${orgId}/manage`)}
                />
              </View>

              {/* 대표 사진은 이 화면의 표지다. 없으면 걸라고 권하고, 있으면
                  눌러서 바꾼다 — 두 경우를 한 카드로 둔다. */}
              {org.cover_path ? (
                <InvCard style={styles.coverCard}>
                  <PhotoFrame
                    url={photos[org.cover_path]}
                    ratio={16 / 9}
                    emoji={org.kind === 'home' ? '🏠' : '⛪'}
                  />
                  {writable ? (
                    <Pressable onPress={changeCover} disabled={busy} style={styles.coverEdit}>
                      <ThemedText style={[Type.caption, { color: theme.accent }]}>
                        📷 대표 사진 바꾸기
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </InvCard>
              ) : writable ? (
                <Pressable onPress={changeCover} disabled={busy}>
                  <InvCard>
                    <ThemedText themeColor="textSecondary" style={Type.caption}>
                      📸 이 공간의 대표 사진을 한 장 걸어 두면, 다음부터 이름 대신 사진으로
                      찾습니다.
                    </ThemedText>
                  </InvCard>
                </Pressable>
              ) : null}

              <SectionTitle
                title="공간"
                action={
                  writable ? (
                    <Pressable onPress={() => setFormOpen((v) => !v)}>
                      <ThemedText style={[Type.caption, { color: theme.accent }]}>
                        {formOpen ? '닫기' : '＋ 추가'}
                      </ThemedText>
                    </Pressable>
                  ) : null
                }
              />

              {formOpen ? (
                <InvCard>
                  <Field
                    label="이름"
                    value={spaceName}
                    onChangeText={setSpaceName}
                    placeholder={org.kind === 'home' ? '주방' : '본관'}
                  />
                  <ChipRow
                    label="종류"
                    options={SPACE_KINDS.filter((k) => CHILD_KINDS.root.includes(k.id)).map((k) => ({
                      id: k.id,
                      label: `${k.emoji} ${k.label}`,
                    }))}
                    value={spaceKind}
                    onChange={setSpaceKind}
                  />
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    {SPACE_KINDS.find((k) => k.id === spaceKind)?.hint}
                  </ThemedText>
                  <PrimaryButton
                    label={busy ? '만드는 중…' : '공간 만들기'}
                    onPress={addSpace}
                    disabled={busy || !spaceName.trim()}
                  />
                </InvCard>
              ) : null}

              {roots.length === 0 ? (
                <InvCard>
                  <EmptyNote
                    emoji="🏢"
                    text={'아직 공간이 없습니다.\n건물이나 방을 하나 만들고 사진을 걸어 보세요.'}
                  />
                </InvCard>
              ) : (
                <View style={styles.grid}>
                  {roots.map((space) => {
                    const summary = summaryFor(space.id);
                    return (
                      <InvCard
                        key={space.id}
                        style={styles.spaceCard}
                        onPress={() => router.push(`/inventory/${orgId}/space/${space.id}`)}>
                        <PhotoFrame
                          url={space.cover_path ? photos[space.cover_path] : undefined}
                          emoji={spaceEmoji(space.kind)}
                          caption={space.name}
                        />
                        <View style={styles.spaceFoot}>
                          <StatLine text={summaryLine(summary)} />
                          {summary.out > 0 || summary.low > 0 ? (
                            <Badge
                              label={summary.out > 0 ? '품절 있음' : '부족 있음'}
                              tone={summary.out > 0 ? 'alert' : 'warn'}
                              emoji="⚠️"
                            />
                          ) : null}
                        </View>
                      </InvCard>
                    );
                  })}
                </View>
              )}

              {unplaced.length > 0 ? (
                <InvCard onPress={() => router.push(`/inventory/${orgId}/search?unplaced=1`)}>
                  <ThemedText style={Type.itemTitle}>📍 위치를 정하지 않은 물품 {unplaced.length}종</ThemedText>
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    먼저 등록해 두고 자리는 나중에 정할 수 있습니다. 눌러서 자리를 잡아 주세요.
                  </ThemedText>
                </InvCard>
              ) : null}

              {lowItems.length > 0 ? (
                <>
                  <SectionTitle title="부족한 물품" />
                  <InvCard style={styles.listCard}>
                    {lowItems.map((item, index) => {
                      const state = stockState(item.qty, item.min_qty);
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => router.push(`/inventory/${orgId}/item/${item.id}`)}
                          style={({ pressed }) => [
                            styles.listRow,
                            index > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
                            { opacity: pressed ? 0.7 : 1 },
                          ]}>
                          <ThemedText style={styles.rowEmoji}>
                            {categoryEmoji(item.category)}
                          </ThemedText>
                          <View style={styles.flex}>
                            <ThemedText style={Type.itemTitle} numberOfLines={1}>
                              {item.name}
                            </ThemedText>
                            <ThemedText themeColor="textSecondary" style={Type.caption}>
                              지금 {formatQty(item.qty, item.unit)} · 최소 {formatQty(item.min_qty, item.unit)}
                            </ThemedText>
                          </View>
                          <Badge
                            label={state === 'out' ? '품절' : '부족'}
                            tone={state === 'out' ? 'alert' : 'warn'}
                          />
                        </Pressable>
                      );
                    })}
                  </InvCard>
                </>
              ) : null}

              {logs.length > 0 ? (
                <>
                  <SectionTitle title="최근 활동" />
                  <InvCard style={styles.listCard}>
                    {logs.map((log, index) => (
                      <View
                        key={log.id}
                        style={[
                          styles.listRow,
                          index > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
                        ]}>
                        <View style={styles.flex}>
                          <ThemedText style={Type.itemDescription} numberOfLines={1}>
                            {log.item?.name ?? '물품'} · {LOG_LABEL[log.kind]}
                            {log.delta ? ` ${log.delta > 0 ? '+' : ''}${log.delta}` : ''}
                          </ThemedText>
                        </View>
                        <ThemedText themeColor="textSecondary" style={Type.caption}>
                          {relativeDay(log.created_at)}
                        </ThemedText>
                      </View>
                    ))}
                  </InvCard>
                </>
              ) : null}

              {!writable ? (
                <InvCard>
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    이 공간에서는 조회만 할 수 있습니다. 등록·수정이 필요하면 관리자에게 권한을
                    요청하세요.
                  </ThemedText>
                </InvCard>
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
  quickRow: { flexDirection: 'row', gap: Spacing.two },
  coverCard: { padding: Spacing.two, gap: Spacing.two },
  coverEdit: { paddingHorizontal: Spacing.two, paddingBottom: Spacing.one },
  grid: { gap: Spacing.three },
  spaceCard: { padding: Spacing.two, gap: Spacing.two },
  spaceFoot: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.one,
    gap: Spacing.one,
  },
  listCard: { padding: 0, gap: 0, overflow: 'hidden' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 4,
  },
  rowEmoji: { fontSize: 22 },
  flex: { flex: 1 },
});
