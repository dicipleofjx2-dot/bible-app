import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  createItem,
  getOrg,
  listSpaces,
  uploadPhoto,
  type InvOrg,
  type InvSpace,
} from '@/db/inventory';
import { usePhotoUrls } from '@/features/inventory/photos';
import { pickPhoto } from '@/features/inventory/pick';
import {
  ChipRow,
  Field,
  InvCard,
  PhotoFrame,
  PrimaryButton,
  SectionTitle,
} from '@/features/inventory/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { categoriesFor, categoryEmoji, pathLabel } from '@/lib/inventory';

/**
 * 빠른 등록(§4.3) — 사진 찍고, 이름 적고, 자리 고르고, 수량 넣으면 끝.
 *
 * **필수는 이름·위치·수량 셋뿐이다.** 구입일이며 보증기간까지 다 물으면 등록을
 * 시작조차 못 한다(§15 「30초 안에 기본 등록」). 나머지는 접어 두고, 나중에
 * 물품 상세에서 천천히 채운다.
 */
export default function InventoryNewItemScreen() {
  const { orgId, space } = useLocalSearchParams<{ orgId: string; space?: string }>();
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id ?? null;

  const [org, setOrg] = useState<InvOrg | null>(null);
  const [spaces, setSpaces] = useState<InvSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [spaceId, setSpaceId] = useState<string | null>(space ?? null);
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('개');
  const [category, setCategory] = useState('');

  const [moreOpen, setMoreOpen] = useState(false);
  const [minQty, setMinQty] = useState('');
  const [purchasedOn, setPurchasedOn] = useState('');
  const [price, setPrice] = useState('');
  const [vendor, setVendor] = useState('');
  const [model, setModel] = useState('');
  const [memo, setMemo] = useState('');

  const load = useCallback(async () => {
    if (!orgId || !session) {
      setLoading(false);
      return;
    }
    try {
      const [nextOrg, nextSpaces] = await Promise.all([getOrg(orgId), listSpaces(orgId)]);
      setOrg(nextOrg);
      setSpaces(nextSpaces);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [orgId, session]);

  useEffect(() => {
    load();
  }, [load]);

  const photos = usePhotoUrls([photoPath]);
  const categories = useMemo(() => categoriesFor(org?.kind ?? 'other'), [org?.kind]);

  // 수납 위치부터 보여 준다. 물건은 대개 방이 아니라 장 안에 들어간다.
  const spaceOptions = useMemo(
    () =>
      [...spaces].sort((a, b) => {
        const rank = { storage: 0, room: 1, floor: 2, building: 3 } as const;
        return rank[a.kind] - rank[b.kind] || a.name.localeCompare(b.name);
      }),
    [spaces],
  );

  async function addPhoto(source: 'camera' | 'library') {
    if (!orgId) return;
    const picked = await pickPhoto(source, [1, 1]);
    if (!picked) return;
    setBusy(true);
    const { path, error } = await uploadPhoto(orgId, picked.uri);
    if (path) setPhotoPath(path);
    else setMessage(error ?? '사진을 올리지 못했어요.');
    setBusy(false);
  }

  async function submit() {
    if (!orgId || !userId || !name.trim()) return;
    setBusy(true);
    try {
      const id = await createItem(orgId, userId, {
        name: name.trim(),
        space_id: spaceId,
        qty: toNumber(qty, 1),
        unit: unit.trim() || '개',
        min_qty: toNumber(minQty, 0),
        category,
        photo_path: photoPath,
        memo: memo.trim(),
        model: model.trim(),
        vendor: vendor.trim(),
        price: price.trim() ? toNumber(price, 0) : null,
        // 날짜는 적힌 모양이 YYYY-MM-DD 일 때만 담는다. 「작년쯤」을 날짜로
        // 바꿔 넣으면 그 짐작이 그대로 구입 기록이 된다.
        purchased_on: /^\d{4}-\d{2}-\d{2}$/.test(purchasedOn.trim()) ? purchasedOn.trim() : null,
      });
      router.replace(`/${orgId}/item/${id}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '등록하지 못했어요.');
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
              <InvCard style={styles.photoCard}>
                <PhotoFrame
                  url={photoPath ? photos[photoPath] : undefined}
                  emoji={categoryEmoji(category)}
                  ratio={1}
                  style={styles.photo}
                />
                <View style={styles.row}>
                  <PrimaryButton
                    label="📷 촬영"
                    tone="quiet"
                    onPress={() => addPhoto('camera')}
                    disabled={busy}
                    style={styles.flex}
                  />
                  <PrimaryButton
                    label="🖼️ 앨범"
                    tone="quiet"
                    onPress={() => addPhoto('library')}
                    disabled={busy}
                    style={styles.flex}
                  />
                </View>
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  사진 한 장이면 나중에 이름을 잊어도 찾을 수 있습니다. 지금 없으면 건너뛰어도
                  됩니다.
                </ThemedText>
              </InvCard>

              <InvCard>
                <Field
                  label="물품명"
                  value={name}
                  onChangeText={setName}
                  placeholder="HDMI 케이블 / 종량제 봉투"
                />

                <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>
                  보관 위치
                </ThemedText>
                {spaceOptions.length === 0 ? (
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    아직 만든 공간이 없습니다. 위치 없이 등록하고 나중에 자리를 정해도 됩니다.
                  </ThemedText>
                ) : (
                  <View style={styles.spaceList}>
                    {spaceOptions.map((option) => {
                      const on = option.id === spaceId;
                      return (
                        <Pressable
                          key={option.id}
                          onPress={() => setSpaceId(on ? null : option.id)}
                          style={({ pressed }) => [
                            styles.spaceRow,
                            {
                              backgroundColor: on ? theme.accentSoft : 'transparent',
                              borderColor: on ? theme.accent : theme.border,
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}>
                          <ThemedText
                            style={[Type.itemDescription, on && { color: theme.accent }]}
                            numberOfLines={1}>
                            {pathLabel(spaces, option.id)}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Field label="수량" value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
                  </View>
                  <View style={styles.flex}>
                    <Field label="단위" value={unit} onChangeText={setUnit} placeholder="개 / 박스 / 롤" />
                  </View>
                </View>

                <ChipRow
                  label="분류"
                  options={categories.map((c) => ({ id: c, label: c }))}
                  value={category}
                  onChange={(c) => setCategory(c === category ? '' : c)}
                />
              </InvCard>

              <Pressable onPress={() => setMoreOpen((v) => !v)}>
                <ThemedText style={[Type.caption, { color: theme.accent }]}>
                  {moreOpen ? '자세한 정보 접기' : '＋ 자세한 정보 (구입·모델·메모)'}
                </ThemedText>
              </Pressable>

              {moreOpen ? (
                <InvCard>
                  <SectionTitle title="자세한 정보" />
                  <Field
                    label="최소 필요 수량"
                    value={minQty}
                    onChangeText={setMinQty}
                    keyboardType="decimal-pad"
                    hint="이 수량 아래로 내려가면 부족으로 표시합니다. 비워 두면 알리지 않습니다."
                  />
                  <Field
                    label="구입일"
                    value={purchasedOn}
                    onChangeText={setPurchasedOn}
                    placeholder="2026-09-18"
                    hint="기억나는 날짜만 적어 주세요. 짐작한 날짜는 비워 두는 편이 낫습니다."
                  />
                  <Field label="가격" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
                  <Field label="구입처" value={vendor} onChangeText={setVendor} />
                  <Field label="모델명" value={model} onChangeText={setModel} />
                  <Field label="메모" value={memo} onChangeText={setMemo} multiline />
                </InvCard>
              ) : null}

              <PrimaryButton
                label={busy ? '저장하는 중…' : '저장하기'}
                onPress={submit}
                disabled={busy || !name.trim()}
              />

              {message ? (
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  {message}
                </ThemedText>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function toNumber(raw: string, fallback: number): number {
  const value = Number(String(raw).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(value) ? value : fallback;
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
  photoCard: { alignItems: 'stretch', gap: Spacing.two },
  photo: { width: 180, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  spaceList: { gap: Spacing.one },
  spaceRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
