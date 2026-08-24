import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { buyItem, equipItem, getBalance, getShop, unequip, type Balance, type ShopItem } from '@/lib/readingHelper/shop';

/**
 * 포인트 교환소.
 *
 * 파는 것은 앱 안에서만 쓰이는 것뿐이다 — 이름 앞에 붙는 칭호와 뒤에 붙는 배지.
 * 산 것은 통독 순위표에 그대로 드러난다. 아무 데도 안 보이면 살 이유가 없다.
 *
 * **산 물건 값은 순위에서 빠지지 않는다.** 순위는 번 점수로 서고, 여기서는 쓴
 * 점수만 따로 센다(0050). 아껴 쓰는 사람이 유리해지면 아무도 안 쓰게 된다.
 */
export default function ReadingHelperShopScreen() {
  const theme = useTheme();
  const { session, loading } = useAuth();
  const userId = session?.user.id;

  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [balance, setBalance] = useState<Balance>({ earned: 0, spent: 0, balance: 0 });
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    getShop(userId).then(setItems).catch(() => setItems([]));
    if (userId) getBalance().then(setBalance).catch(() => {});
  }, [userId]);

  useFocusEffect(load);

  async function handleBuy(item: ShopItem) {
    if (!userId) {
      Alert.alert('로그인이 필요해요', '점수를 모으고 쓰려면 로그인해 주세요.', [
        { text: '나중에', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/profile') },
      ]);
      return;
    }
    setBusy(item.id);
    const result = await buyItem(item.id);
    setBusy(null);
    if (result.error) {
      // 점수가 모자란 이유까지 서버가 담아 준다("320점이 필요한데 240점 남았어요").
      Alert.alert('아직 살 수 없어요', result.error);
      return;
    }
    load();
  }

  async function handleEquip(item: ShopItem) {
    setBusy(item.id);
    const result = item.equipped ? await unequip(item.kind) : await equipItem(item.id);
    setBusy(null);
    if (result.error) {
      Alert.alert('바꾸지 못했어요', result.error);
      return;
    }
    load();
  }

  if (loading || items === null) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const titles = items.filter((i) => i.kind === 'title');
  const badges = items.filter((i) => i.kind === 'badge');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
            <ThemedText type="smallBold">◀ 돌아가기</ThemedText>
          </Pressable>

          <ThemedText type="subtitle">포인트 교환소</ThemedText>

          {userId ? (
            <View style={[styles.balanceCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold" style={{ color: theme.backgroundSelected }}>
                쓸 수 있는 점수 {balance.balance}점
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                지금까지 {balance.earned}점을 모아 {balance.spent}점을 썼어요.
              </ThemedText>
              {/* 이 한 줄이 없으면 "샀더니 순위가 떨어졌나?" 를 걱정하게 된다. */}
              <ThemedText type="small" themeColor="textSecondary" style={styles.balanceNote}>
                여기서 쓴 점수는 순위에서 빠지지 않아요. 마음껏 쓰셔도 됩니다.
              </ThemedText>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push('/profile')}
              style={({ pressed }) => [
                styles.balanceCard,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small">
                둘러보는 중입니다. <ThemedText type="smallBold">로그인하면</ThemedText> 모은 점수로 바꿀 수 있어요.
              </ThemedText>
            </Pressable>
          )}

          <Section title="칭호" hint="이름 앞에 붙어요">
            {titles.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                busy={busy === item.id}
                balance={balance.balance}
                onBuy={() => handleBuy(item)}
                onEquip={() => handleEquip(item)}
              />
            ))}
          </Section>

          <Section title="배지" hint="이름 뒤에 붙어요">
            {badges.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                busy={busy === item.id}
                balance={balance.balance}
                onBuy={() => handleBuy(item)}
                onEquip={() => handleEquip(item)}
              />
            ))}
          </Section>

          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            사면 바로 달립니다(이미 달고 있는 것이 없을 때). 칭호와 배지는 하나씩 달 수 있고 언제든 바꿀 수
            있어요. 달고 있는 것은 통독 홈의 내 포인트와 순위표에 함께 나옵니다.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">
        {title} <ThemedText type="small" themeColor="textSecondary">· {hint}</ThemedText>
      </ThemedText>
      {children}
    </View>
  );
}

function ItemRow({
  item,
  busy,
  balance,
  onBuy,
  onEquip,
}: {
  item: ShopItem;
  busy: boolean;
  balance: number;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const theme = useTheme();
  // 살 수 없는 것은 흐리게 둔다. 눌러도 되지만, 왜 안 되는지는 눌러야 알 수
  // 있으므로(서버가 이유를 준다) 아예 막지는 않는다.
  const affordable = item.owned || balance >= item.cost;

  return (
    <View style={[styles.itemRow, { borderColor: theme.backgroundElement }]}>
      <ThemedText style={styles.itemEmoji}>{item.emoji}</ThemedText>
      <View style={styles.itemBody}>
        <ThemedText type="smallBold">{item.label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.description}
        </ThemedText>
      </View>

      {item.owned ? (
        <Pressable
          onPress={onEquip}
          disabled={busy}
          style={({ pressed }) => [
            styles.actionButton,
            item.equipped
              ? { backgroundColor: theme.backgroundSelected }
              : { borderWidth: 1, borderColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="small" style={item.equipped ? styles.actionOn : undefined}>
            {item.equipped ? '달고 있음' : '달기'}
          </ThemedText>
        </Pressable>
      ) : (
        <Pressable
          onPress={onBuy}
          disabled={busy}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.backgroundElement, opacity: affordable ? 1 : 0.5 },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="small">{busy ? '...' : `${item.cost}점`}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  backRow: { marginBottom: Spacing.two },
  balanceCard: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  balanceNote: { marginTop: 2, lineHeight: 18 },
  section: { marginTop: Spacing.three, gap: Spacing.one },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  itemBody: { flex: 1, minWidth: 0 },
  actionButton: {
    minWidth: 64,
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionOn: { color: '#fff' },
  pressed: { opacity: 0.7 },
  note: { marginTop: Spacing.four, lineHeight: 19 },
});
