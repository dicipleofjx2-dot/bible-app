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
  changeQty,
  disposeItem,
  getItem,
  listItemLogs,
  listSpaces,
  moveItem,
  myRole,
  updateItem,
  uploadPhoto,
  type InvItem,
  type InvLog,
  type InvRole,
  type InvSpace,
} from '@/db/inventory';
import { usePhotoUrls } from '@/features/inventory/photos';
import { pickPhoto } from '@/features/inventory/pick';
import {
  Badge,
  EmptyNote,
  Field,
  InvCard,
  PhotoFrame,
  PrimaryButton,
  QtyStepper,
  SectionTitle,
} from '@/features/inventory/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  categoryEmoji,
  DISPOSE_REASONS,
  formatQty,
  LOG_LABEL,
  pathLabel,
  relativeDay,
  STATUS_META,
  stockState,
  type ItemStatus,
} from '@/lib/inventory';

/**
 * 물품 상세(§5.4).
 *
 * 맨 위는 큰 사진과 **수량 단추**다. 이 화면에 오는 대부분의 이유는 「하나 썼다」
 * 한 가지이므로, 그 한 동작이 스크롤 없이 손에 닿는 자리에 있어야 한다.
 *
 * 수량을 바꾸면 서버 함수가 이력까지 한 걸음으로 남긴다 — 화면에서 둘을 따로
 * 부르면 사이에서 끊길 때 수량만 바뀌고 과거를 되짚을 수 없게 된다(0084).
 */
export default function InventoryItemScreen() {
  const { orgId, itemId } = useLocalSearchParams<{ orgId: string; itemId: string }>();
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();

  const [item, setItem] = useState<InvItem | null>(null);
  const [spaces, setSpaces] = useState<InvSpace[]>([]);
  const [logs, setLogs] = useState<InvLog[]>([]);
  const [role, setRole] = useState<InvRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [movingOpen, setMovingOpen] = useState(false);
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [minQty, setMinQty] = useState('');
  const [memo, setMemo] = useState('');
  const [manager, setManager] = useState('');

  const load = useCallback(async () => {
    if (!orgId || !itemId || !session) {
      setLoading(false);
      return;
    }
    try {
      const [nextItem, nextSpaces, nextLogs, nextRole] = await Promise.all([
        getItem(itemId),
        listSpaces(orgId),
        listItemLogs(itemId),
        myRole(orgId),
      ]);
      setItem(nextItem);
      setSpaces(nextSpaces);
      setLogs(nextLogs);
      setRole(nextRole);
      if (nextItem) {
        setMinQty(String(nextItem.min_qty ?? 0));
        setMemo(nextItem.memo);
        setManager(nextItem.manager);
      }
      setMessage('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [itemId, orgId, session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const photos = usePhotoUrls([item?.photo_path]);
  const writable = canWrite(role);
  const state = item ? stockState(item.qty, item.min_qty) : 'ok';
  const status = item ? STATUS_META[item.status] : null;

  const otherSpaces = useMemo(
    () => spaces.filter((s) => s.id !== item?.space_id),
    [item?.space_id, spaces],
  );

  async function step(delta: number) {
    if (!item) return;
    setBusy(true);
    try {
      await changeQty(item.id, delta, delta > 0 ? '채움' : '사용');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '수량을 바꾸지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function move(toSpace: string) {
    if (!item) return;
    setBusy(true);
    try {
      await moveItem(item.id, toSpace);
      setMovingOpen(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '옮기지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function dispose(status: ItemStatus, reason: string) {
    if (!item) return;
    setBusy(true);
    try {
      await disposeItem(item.id, status, reason);
      // 처분한 물품은 목록에서 빠진다. 기록은 휴지통에 30일 남는다(§4.9).
      router.replace(`/${orgId}/manage`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '처분하지 못했어요.');
      setBusy(false);
    }
  }

  async function changePhoto() {
    if (!orgId || !item) return;
    const picked = await pickPhoto('library', [1, 1]);
    if (!picked) return;
    setBusy(true);
    const { path, error } = await uploadPhoto(orgId, picked.uri);
    if (path) {
      await updateItem(item.id, { photo_path: path });
      await load();
    } else setMessage(error ?? '사진을 올리지 못했어요.');
    setBusy(false);
  }

  async function saveDetails() {
    if (!item) return;
    setBusy(true);
    try {
      await updateItem(item.id, {
        min_qty: Number(minQty.replace(/[^0-9.]/g, '')) || 0,
        memo: memo.trim(),
        manager: manager.trim(),
      });
      setEditOpen(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장하지 못했어요.');
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
          ) : !item ? (
            <InvCard>
              <EmptyNote emoji="🔒" text="열 수 없는 물품입니다." />
            </InvCard>
          ) : (
            <>
              <InvCard style={styles.headCard}>
                <PhotoFrame
                  url={item.photo_path ? photos[item.photo_path] : undefined}
                  emoji={categoryEmoji(item.category)}
                  ratio={1}
                  style={styles.photo}
                />
                <ThemedText style={Type.screenTitle}>{item.name}</ThemedText>
                <View style={styles.badges}>
                  {status ? <Badge label={status.label} tone={status.tone} emoji={status.emoji} /> : null}
                  {state !== 'ok' ? (
                    <Badge
                      label={state === 'out' ? '품절' : '부족'}
                      tone={state === 'out' ? 'alert' : 'warn'}
                      emoji="⚠️"
                    />
                  ) : null}
                  {item.category ? <Badge label={item.category} tone="calm" /> : null}
                </View>

                <QtyStepper
                  qty={item.qty}
                  unit={item.unit}
                  onChange={step}
                  disabled={busy || !writable}
                />
                {item.min_qty > 0 ? (
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    최소 필요 수량 {formatQty(item.min_qty, item.unit)}
                  </ThemedText>
                ) : null}
              </InvCard>

              <InvCard>
                <SectionTitle title="위치" />
                <ThemedText style={Type.body}>{pathLabel(spaces, item.space_id)}</ThemedText>
                {writable ? (
                  <Pressable onPress={() => setMovingOpen((v) => !v)}>
                    <ThemedText style={[Type.caption, { color: theme.accent }]}>
                      {movingOpen ? '닫기' : '📍 다른 자리로 옮기기'}
                    </ThemedText>
                  </Pressable>
                ) : null}
                {movingOpen ? (
                  <View style={styles.spaceList}>
                    {otherSpaces.length === 0 ? (
                      <ThemedText themeColor="textSecondary" style={Type.caption}>
                        옮길 자리가 없습니다. 공간을 먼저 만들어 주세요.
                      </ThemedText>
                    ) : (
                      otherSpaces.map((space) => (
                        <Pressable
                          key={space.id}
                          onPress={() => move(space.id)}
                          disabled={busy}
                          style={({ pressed }) => [
                            styles.spaceRow,
                            { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                          ]}>
                          <ThemedText style={Type.itemDescription} numberOfLines={1}>
                            {pathLabel(spaces, space.id)}
                          </ThemedText>
                        </Pressable>
                      ))
                    )}
                  </View>
                ) : null}
              </InvCard>

              {item.purchased_on || item.price || item.vendor || item.model || item.serial ? (
                <InvCard>
                  <SectionTitle title="구입·제품" />
                  {item.purchased_on ? <Row label="구입일" value={item.purchased_on} /> : null}
                  {item.price ? <Row label="가격" value={`${item.price.toLocaleString()}원`} /> : null}
                  {item.vendor ? <Row label="구입처" value={item.vendor} /> : null}
                  {item.model ? <Row label="모델명" value={item.model} /> : null}
                  {item.serial ? <Row label="일련번호" value={item.serial} /> : null}
                  {item.warranty_until ? <Row label="보증 만료" value={item.warranty_until} /> : null}
                </InvCard>
              ) : null}

              {item.memo ? (
                <InvCard>
                  <SectionTitle title="메모" />
                  <ThemedText style={Type.body}>{item.memo}</ThemedText>
                </InvCard>
              ) : null}

              {writable ? (
                <>
                  <Pressable onPress={() => setEditOpen((v) => !v)}>
                    <ThemedText style={[Type.caption, { color: theme.accent }]}>
                      {editOpen ? '수정 접기' : '✏️ 정보 고치기'}
                    </ThemedText>
                  </Pressable>
                  {editOpen ? (
                    <InvCard>
                      <Field
                        label="최소 필요 수량"
                        value={minQty}
                        onChangeText={setMinQty}
                        keyboardType="decimal-pad"
                        hint="0이면 부족 알림을 하지 않습니다."
                      />
                      <Field label="담당자" value={manager} onChangeText={setManager} />
                      <Field label="메모" value={memo} onChangeText={setMemo} multiline />
                      <View style={styles.row}>
                        <PrimaryButton
                          label="사진 바꾸기"
                          tone="quiet"
                          onPress={changePhoto}
                          disabled={busy}
                          style={styles.flex}
                        />
                        <PrimaryButton
                          label={busy ? '저장 중…' : '저장'}
                          onPress={saveDetails}
                          disabled={busy}
                          style={styles.flex}
                        />
                      </View>
                    </InvCard>
                  ) : null}
                </>
              ) : null}

              <SectionTitle title="이력" />
              {logs.length === 0 ? (
                <InvCard>
                  <EmptyNote emoji="🧾" text="아직 기록이 없습니다." />
                </InvCard>
              ) : (
                <InvCard style={styles.listCard}>
                  {logs.map((log, index) => (
                    <View
                      key={log.id}
                      style={[
                        styles.logRow,
                        index > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
                      ]}>
                      <View style={styles.flex}>
                        <ThemedText style={Type.itemDescription}>
                          {LOG_LABEL[log.kind]}
                          {log.delta ? ` ${log.delta > 0 ? '+' : ''}${log.delta}` : ''}
                          {log.qty_after != null ? ` → ${formatQty(log.qty_after, item.unit)}` : ''}
                        </ThemedText>
                        {log.reason ? (
                          <ThemedText themeColor="textSecondary" style={Type.caption}>
                            {log.reason}
                          </ThemedText>
                        ) : null}
                      </View>
                      <ThemedText themeColor="textSecondary" style={Type.caption}>
                        {relativeDay(log.created_at)}
                      </ThemedText>
                    </View>
                  ))}
                </InvCard>
              )}

              {writable ? (
                <>
                  <Pressable onPress={() => setDisposeOpen((v) => !v)}>
                    <ThemedText style={[Type.caption, { color: theme.textSecondary }]}>
                      {disposeOpen ? '닫기' : '🗑️ 처분하기 (사용 완료·폐기·분실·기증·매각)'}
                    </ThemedText>
                  </Pressable>
                  {disposeOpen ? (
                    <InvCard>
                      <ThemedText themeColor="textSecondary" style={Type.caption}>
                        처분해도 구입·사용 기록은 남습니다. 목록에서만 내려가고, 30일 안에는
                        되돌릴 수 있습니다.
                      </ThemedText>
                      {DISPOSE_REASONS.map((reason) => (
                        <Pressable
                          key={reason.id}
                          onPress={() => dispose(reason.id, reason.label)}
                          disabled={busy}
                          style={({ pressed }) => [
                            styles.spaceRow,
                            { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                          ]}>
                          <ThemedText style={Type.itemTitle}>{reason.label}</ThemedText>
                          <ThemedText themeColor="textSecondary" style={Type.caption}>
                            {reason.hint}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </InvCard>
                  ) : null}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <ThemedText themeColor="textSecondary" style={Type.caption}>
        {label}
      </ThemedText>
      <ThemedText style={Type.itemDescription}>{value}</ThemedText>
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
  headCard: { gap: Spacing.two },
  photo: { width: 200, alignSelf: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  spaceList: { gap: Spacing.one },
  spaceRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 2,
  },
  listCard: { padding: 0, gap: 0, overflow: 'hidden' },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
