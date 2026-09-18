import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  canWrite,
  createSpace,
  listItems,
  listSpaces,
  myRole,
  updateSpace,
  uploadPhoto,
  type InvItem,
  type InvRole,
  type InvSpace,
} from '@/db/inventory';
import { usePhotoUrls } from '@/features/inventory/photos';
import { pickPhoto } from '@/features/inventory/pick';
import {
  Badge,
  ChipRow,
  EmptyNote,
  Field,
  InvCard,
  PhotoFrame,
  PhotoPin,
  PrimaryButton,
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
  pathLabel,
  pinLabel,
  spaceEmoji,
  SPACE_KINDS,
  STATUS_META,
  stockState,
  summarize,
  summaryLine,
  type SpaceKind,
} from '@/lib/inventory';

/**
 * 공간 상세(§5.3) — 사진 한 장 위에 이 방의 수납 자리를 번호로 찍는다(§4.2).
 *
 * ── 핀 자리를 어떻게 잡나 ───────────────────────────────────────────
 * 끌어다 놓기(드래그)가 아니라 **고른 뒤 한 번 누르기**다. 중보기도 나무에서
 * 같은 판단을 했다 — 끌기는 스크롤과 싸우고, 한 손으로 창고에 서서 하기에는
 * 누르기가 훨씬 정확하다.
 *
 * 자리는 0~1 비율로 담는다. 화면 크기를 담으면 폰과 웹에서 핀이 딴 데 찍힌다.
 * 사진 크기는 onLayout 을 기다리지 않고 **창 너비에서 계산**한다 — 이 리포의
 * 검증 환경에서 onLayout 이 안 오는 일이 있었다(HANDOFF 참고).
 */
export default function InventorySpaceScreen() {
  const { orgId, spaceId } = useLocalSearchParams<{ orgId: string; spaceId: string }>();
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const { width } = useWindowDimensions();

  const [spaces, setSpaces] = useState<InvSpace[]>([]);
  const [items, setItems] = useState<InvItem[]>([]);
  const [role, setRole] = useState<InvRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [view, setView] = useState<'photo' | 'list'>('photo');
  const [pinning, setPinning] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [childName, setChildName] = useState('');
  const [childKind, setChildKind] = useState<SpaceKind>('storage');
  const [deep, setDeep] = useState(true);

  const load = useCallback(async () => {
    if (!orgId || !session) {
      setLoading(false);
      return;
    }
    try {
      const [nextSpaces, nextItems, nextRole] = await Promise.all([
        listSpaces(orgId),
        listItems(orgId),
        myRole(orgId),
      ]);
      setSpaces(nextSpaces);
      setItems(nextItems);
      setRole(nextRole);
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

  const space = useMemo(() => spaces.find((s) => s.id === spaceId) ?? null, [spaces, spaceId]);
  const children = useMemo(() => childrenOf(spaces, spaceId ?? null), [spaces, spaceId]);
  const photos = usePhotoUrls([space?.cover_path, ...children.map((c) => c.cover_path)]);
  const writable = canWrite(role);

  /** 이 공간의 물품. 「아래 수납장 포함」을 끄면 바로 이 자리의 것만 본다. */
  const here = useMemo(() => {
    if (!spaceId) return [];
    const ids = new Set(deep ? descendantIds(spaces, spaceId) : [spaceId]);
    return items.filter((i) => i.space_id && ids.has(i.space_id));
  }, [deep, items, spaceId, spaces]);

  // 사진 폭은 창에서 계산한다(카드 안쪽 여백 2겹을 뺀다).
  const photoWidth = Math.min(width, MaxContentWidth) - Spacing.three * 2 - Spacing.two * 2;
  const photoHeight = (photoWidth * 3) / 4;

  async function changePhoto() {
    if (!orgId || !spaceId) return;
    const picked = await pickPhoto('library', [4, 3]);
    if (!picked) return;
    setBusy(true);
    const { path, error } = await uploadPhoto(orgId, picked.uri);
    if (path) {
      await updateSpace(spaceId, { cover_path: path });
      await load();
      // 사진을 바꾸면 예전 핀 자리는 새 사진과 맞지 않는다(§4.2).
      if (children.some((c) => c.pin_x != null)) {
        setMessage('사진을 바꿨습니다. 위치 핀은 새 사진에 다시 찍어 주세요.');
      }
    } else setMessage(error ?? '사진을 올리지 못했어요.');
    setBusy(false);
  }

  async function placePin(event: { nativeEvent: { locationX: number; locationY: number } }) {
    if (!pinning) return;
    // 누른 자리를 못 읽으면 (0,0) 으로 찍지 않는다 — 왼쪽 위 구석에 핀이
    // 찍히면 「찍혔다」고 믿고 지나가기 쉽다. 차라리 다시 누르게 한다.
    const { locationX, locationY } = event.nativeEvent;
    if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) {
      setMessage('누른 자리를 읽지 못했어요. 한 번 더 눌러 주세요.');
      return;
    }
    const x = Math.min(Math.max(event.nativeEvent.locationX / photoWidth, 0), 1);
    const y = Math.min(Math.max(event.nativeEvent.locationY / photoHeight, 0), 1);
    const target = pinning;
    setPinning(null);
    setBusy(true);
    try {
      await updateSpace(target, { pin_x: x, pin_y: y });
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '핀을 찍지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function addChild() {
    if (!orgId || !spaceId || !childName.trim()) return;
    setBusy(true);
    try {
      await createSpace({
        org_id: orgId,
        parent_id: spaceId,
        kind: childKind,
        name: childName.trim(),
      });
      setChildName('');
      setFormOpen(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '만들지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!session) return <Redirect href="/sign-in" />;

  const summary = summarize(here);
  const childKindOptions = SPACE_KINDS.filter((k) =>
    CHILD_KINDS[space?.kind ?? 'room'].includes(k.id),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator style={{ marginTop: Spacing.four }} />
          ) : !space ? (
            <InvCard>
              <EmptyNote emoji="🔒" text="열 수 없는 공간입니다." />
            </InvCard>
          ) : (
            <>
              <View style={styles.head}>
                <ThemedText style={Type.screenTitle}>
                  {spaceEmoji(space.kind)} {space.name}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  {pathLabel(spaces, space.id)}
                </ThemedText>
                <StatLine text={summaryLine(summary)} />
              </View>

              <View style={styles.toggleRow}>
                {(['photo', 'list'] as const).map((mode) => {
                  const on = view === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => setView(mode)}
                      style={({ pressed }) => [
                        styles.toggle,
                        {
                          backgroundColor: on ? theme.accentSoft : 'transparent',
                          borderColor: on ? theme.accent : theme.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}>
                      <ThemedText
                        style={[Type.caption, { color: on ? theme.accent : theme.textSecondary }]}>
                        {mode === 'photo' ? '📷 사진 보기' : '📋 목록 보기'}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {view === 'photo' ? (
                <InvCard style={styles.photoCard}>
                  <Pressable onPress={placePin} disabled={!pinning}>
                    <PhotoFrame
                      url={space.cover_path ? photos[space.cover_path] : undefined}
                      emoji={spaceEmoji(space.kind)}
                      style={{ width: photoWidth }}
                      overlay={
                        <>
                          {children.map((child, index) =>
                            child.pin_x != null && child.pin_y != null ? (
                              <PhotoPin
                                key={child.id}
                                label={pinLabel(index)}
                                x={child.pin_x}
                                y={child.pin_y}
                                active={pinning === child.id}
                                onPress={() =>
                                  pinning
                                    ? undefined
                                    : router.push(`/${orgId}/space/${child.id}`)
                                }
                              />
                            ) : null,
                          )}
                        </>
                      }
                    />
                  </Pressable>

                  {pinning ? (
                    <ThemedText style={[Type.caption, { color: theme.accent }]}>
                      사진에서 「{children.find((c) => c.id === pinning)?.name}」이 있는 자리를 한 번
                      눌러 주세요.
                    </ThemedText>
                  ) : (
                    <ThemedText themeColor="textSecondary" style={Type.caption}>
                      {space.cover_path
                        ? '번호를 누르면 그 자리의 물품이 열립니다.'
                        : '이 공간의 사진을 한 장 걸면, 수납 자리마다 번호를 찍을 수 있습니다.'}
                    </ThemedText>
                  )}

                  {writable ? (
                    <PrimaryButton
                      label={space.cover_path ? '사진 바꾸기' : '📷 공간 사진 걸기'}
                      tone="quiet"
                      onPress={changePhoto}
                      disabled={busy}
                    />
                  ) : null}
                </InvCard>
              ) : null}

              <SectionTitle
                title="수납 자리"
                action={
                  writable && childKindOptions.length > 0 ? (
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
                    value={childName}
                    onChangeText={setChildName}
                    placeholder="오른쪽 철제장 / 싱크대 하부장"
                  />
                  <ChipRow
                    label="종류"
                    options={childKindOptions.map((k) => ({
                      id: k.id,
                      label: `${k.emoji} ${k.label}`,
                    }))}
                    value={childKind}
                    onChange={setChildKind}
                  />
                  <PrimaryButton
                    label={busy ? '만드는 중…' : '만들기'}
                    onPress={addChild}
                    disabled={busy || !childName.trim()}
                  />
                </InvCard>
              ) : null}

              {children.length === 0 ? (
                <InvCard>
                  <EmptyNote emoji="🗄️" text="수납 자리가 아직 없습니다." />
                </InvCard>
              ) : (
                <View style={styles.childGrid}>
                  {children.map((child, index) => {
                    const ids = new Set(descendantIds(spaces, child.id));
                    const childSummary = summarize(
                      items.filter((i) => i.space_id && ids.has(i.space_id)),
                    );
                    return (
                      <InvCard key={child.id} style={styles.childCard}>
                        <Pressable
                          onPress={() => router.push(`/${orgId}/space/${child.id}`)}
                          style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, gap: Spacing.two })}>
                          <PhotoFrame
                            url={child.cover_path ? photos[child.cover_path] : undefined}
                            emoji={spaceEmoji(child.kind)}
                            ratio={16 / 10}
                          />
                          <View style={styles.childFoot}>
                            <ThemedText style={Type.itemTitle} numberOfLines={1}>
                              {pinLabel(index)} {child.name}
                            </ThemedText>
                            <StatLine text={summaryLine(childSummary)} />
                          </View>
                        </Pressable>
                        {writable && space.cover_path ? (
                          <Pressable onPress={() => setPinning(child.id)}>
                            <ThemedText style={[Type.caption, { color: theme.accent }]}>
                              {child.pin_x != null ? '📍 사진 속 자리 옮기기' : '📍 사진에 자리 찍기'}
                            </ThemedText>
                          </Pressable>
                        ) : null}
                      </InvCard>
                    );
                  })}
                </View>
              )}

              <SectionTitle
                title={`물품 ${here.length}종`}
                action={
                  <Pressable onPress={() => setDeep((v) => !v)}>
                    <ThemedText style={[Type.caption, { color: theme.accent }]}>
                      {deep ? '아래 자리 포함 ✓' : '이 자리만'}
                    </ThemedText>
                  </Pressable>
                }
              />

              {here.length === 0 ? (
                <InvCard>
                  <EmptyNote emoji="📦" text="이 자리에는 아직 등록된 물품이 없습니다." />
                </InvCard>
              ) : (
                <InvCard style={styles.listCard}>
                  {here.map((item, index) => {
                    const state = stockState(item.qty, item.min_qty);
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => router.push(`/${orgId}/item/${item.id}`)}
                        style={({ pressed }) => [
                          styles.listRow,
                          index > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
                          { opacity: pressed ? 0.7 : 1 },
                        ]}>
                        <ItemThumb item={item} />
                        <View style={styles.flex}>
                          <ThemedText style={Type.itemTitle} numberOfLines={1}>
                            {item.name}
                          </ThemedText>
                          <ThemedText themeColor="textSecondary" style={Type.caption} numberOfLines={1}>
                            {formatQty(item.qty, item.unit)}
                            {item.category ? ` · ${item.category}` : ''}
                          </ThemedText>
                        </View>
                        {state !== 'ok' ? (
                          <Badge
                            label={state === 'out' ? '품절' : '부족'}
                            tone={state === 'out' ? 'alert' : 'warn'}
                          />
                        ) : item.status !== 'stored' ? (
                          <Badge
                            label={STATUS_META[item.status].label}
                            tone={STATUS_META[item.status].tone}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </InvCard>
              )}

              {writable ? (
                <PrimaryButton
                  label="＋ 이 자리에 물품 등록"
                  onPress={() => router.push(`/${orgId}/new?space=${spaceId}`)}
                />
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

/** 목록 안의 작은 사진. 사진이 없으면 그 물품다운 그림글자로 자리를 채운다(§6.3). */
function ItemThumb({ item }: { item: InvItem }) {
  const photos = usePhotoUrls([item.photo_path]);
  return (
    <PhotoFrame
      url={item.photo_path ? photos[item.photo_path] : undefined}
      emoji={categoryEmoji(item.category)}
      ratio={1}
      rounded={10}
      style={styles.thumb}
    />
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
  head: { gap: Spacing.one },
  toggleRow: { flexDirection: 'row', gap: Spacing.two },
  toggle: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  photoCard: { padding: Spacing.two, gap: Spacing.two },
  childGrid: { gap: Spacing.three },
  childCard: { padding: Spacing.two, gap: Spacing.two },
  childFoot: { paddingHorizontal: Spacing.two, gap: 2 },
  listCard: { padding: 0, gap: 0, overflow: 'hidden' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  thumb: { width: 44 },
  flex: { flex: 1 },
});
