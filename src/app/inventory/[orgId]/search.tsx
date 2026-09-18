import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { listItems, listSpaces, type InvItem, type InvSpace } from '@/db/inventory';
import { usePhotoUrls } from '@/features/inventory/photos';
import {
  Badge,
  ChipRow,
  EmptyNote,
  InvCard,
  PhotoFrame,
  SearchBox,
  SectionTitle,
} from '@/features/inventory/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  categoryEmoji,
  formatQty,
  groupByName,
  matchItem,
  parseQuery,
  pathLabel,
  STATUS_META,
  stockState,
} from '@/lib/inventory';

type Filter = 'all' | 'low' | 'unplaced' | 'loaned';

/**
 * 찾기(§4.10).
 *
 * 「마이크 어디 있지?」처럼 물어도 되게 했다 — 묻는 말투와 조사를 떼는 규칙이
 * lib/inventory 의 parseQuery 에 있다. 언어모델을 부르지 않는다: 이 앱에 모델
 * 열쇠가 없고, 물건 이름 몇 개 찾자고 집 안 물건 목록을 밖으로 보낼 이유도 없다.
 *
 * 결과에는 **사진과 정확한 위치**를 함께 준다. 「방송실에 있다」로는 못 찾는다 —
 * 「본관 → 2층 → 방송실 → 오른쪽 철제장」까지 적어야 실제로 손이 간다.
 */
export default function InventorySearchScreen() {
  const { orgId, q, unplaced } = useLocalSearchParams<{
    orgId: string;
    q?: string;
    unplaced?: string;
  }>();
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();

  const [items, setItems] = useState<InvItem[]>([]);
  const [spaces, setSpaces] = useState<InvSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState(q ?? '');
  const [filter, setFilter] = useState<Filter>(unplaced ? 'unplaced' : 'all');
  const [category, setCategory] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId || !session) {
      setLoading(false);
      return;
    }
    try {
      const [nextItems, nextSpaces] = await Promise.all([listItems(orgId), listSpaces(orgId)]);
      setItems(nextItems);
      setSpaces(nextSpaces);
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

  const parsed = useMemo(() => parseQuery(query), [query]);

  const results = useMemo(() => {
    return items.filter((item) => {
      if (filter === 'low' && stockState(item.qty, item.min_qty) === 'ok') return false;
      if (filter === 'unplaced' && item.space_id) return false;
      if (filter === 'loaned' && item.status !== 'loaned') return false;
      if (category && item.category !== category) return false;
      // 위치 이름도 함께 찾는다 — 「주방 종이컵」이 걸리려면 자리 이름이
      // 검색감에 들어 있어야 한다.
      return matchItem(item, parsed.terms, pathLabel(spaces, item.space_id));
    });
  }, [category, filter, items, parsed.terms, spaces]);

  const photos = usePhotoUrls(results.slice(0, 40).map((i) => i.photo_path));
  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))],
    [items],
  );

  // 같은 물품이 여러 자리에 나뉘어 있으면 총수량을 먼저 알려 준다(§4.5).
  const split = useMemo(
    () => groupByName(results).filter((group) => group.rows.length > 1),
    [results],
  );

  if (authLoading) return null;
  if (!session) return <Redirect href="/profile" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SearchBox
            value={query}
            onChangeText={setQuery}
            placeholder="마이크 어디 있지? / 주방 종이컵"
          />

          <ChipRow
            options={[
              { id: 'all', label: '전체' },
              { id: 'low', label: '부족·품절' },
              { id: 'unplaced', label: '위치 없음' },
              { id: 'loaned', label: '대여 중' },
            ]}
            value={filter}
            onChange={(id) => setFilter(id as Filter)}
          />

          {categories.length > 0 ? (
            <ChipRow
              options={categories.map((c) => ({ id: c, label: c }))}
              value={category}
              onChange={(c) => setCategory(c === category ? null : c)}
            />
          ) : null}

          {loading ? (
            <ActivityIndicator style={{ marginTop: Spacing.four }} />
          ) : (
            <>
              {split.length > 0 ? (
                <InvCard>
                  <SectionTitle title="여러 자리에 나뉜 물품" />
                  {split.map((group) => (
                    <View key={group.name} style={styles.splitGroup}>
                      <ThemedText style={Type.itemTitle}>
                        {group.name} 총 {formatQty(group.total, group.unit)}
                      </ThemedText>
                      {group.rows.map((row) => (
                        <ThemedText key={row.id} themeColor="textSecondary" style={Type.caption}>
                          - {pathLabel(spaces, row.space_id)}: {formatQty(row.qty, row.unit)}
                        </ThemedText>
                      ))}
                    </View>
                  ))}
                </InvCard>
              ) : null}

              <SectionTitle title={`찾은 물품 ${results.length}종`} />

              {results.length === 0 ? (
                <InvCard>
                  <EmptyNote
                    emoji="🔍"
                    text={'찾는 물품이 없습니다.\n다른 낱말로 찾아보거나, 아직 등록되지 않았는지 확인해 주세요.'}
                  />
                </InvCard>
              ) : (
                <View style={styles.results}>
                  {results.map((item) => {
                    const state = stockState(item.qty, item.min_qty);
                    const status = STATUS_META[item.status];
                    return (
                      <InvCard
                        key={item.id}
                        style={styles.resultCard}
                        onPress={() => router.push(`/inventory/${orgId}/item/${item.id}`)}>
                        <View style={styles.resultRow}>
                          <PhotoFrame
                            url={item.photo_path ? photos[item.photo_path] : undefined}
                            emoji={categoryEmoji(item.category)}
                            ratio={1}
                            rounded={12}
                            style={styles.thumb}
                          />
                          <View style={styles.flex}>
                            <ThemedText style={Type.itemTitle} numberOfLines={1}>
                              {item.name}
                            </ThemedText>
                            <ThemedText style={Type.itemDescription}>
                              {formatQty(item.qty, item.unit)}
                            </ThemedText>
                            {/* 길찾기처럼 자리를 통째로 적는다(§4.10). */}
                            <ThemedText
                              themeColor="textSecondary"
                              style={Type.caption}
                              numberOfLines={2}>
                              📍 {pathLabel(spaces, item.space_id)}
                            </ThemedText>
                          </View>
                          <View style={styles.resultBadges}>
                            {state !== 'ok' ? (
                              <Badge
                                label={state === 'out' ? '품절' : '부족'}
                                tone={state === 'out' ? 'alert' : 'warn'}
                              />
                            ) : null}
                            {item.status !== 'stored' ? (
                              <Badge label={status.label} tone={status.tone} />
                            ) : null}
                          </View>
                        </View>
                      </InvCard>
                    );
                  })}
                </View>
              )}

              {parsed.asksCount && results.length > 0 ? (
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  {`찾은 것의 총수량은 ${Math.round(results.reduce((sum, i) => sum + i.qty, 0))}개입니다.`}
                </ThemedText>
              ) : null}
            </>
          )}

          {message ? (
            <ThemedText themeColor="textSecondary" style={[Type.caption, { color: theme.textSecondary }]}>
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
  results: { gap: Spacing.two },
  resultCard: { padding: Spacing.two },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  resultBadges: { gap: Spacing.one, alignItems: 'flex-end' },
  thumb: { width: 56 },
  splitGroup: { gap: 2, paddingVertical: Spacing.one },
  flex: { flex: 1 },
});
