import { supabase } from '@/lib/supabase';

/**
 * 포인트 교환소.
 *
 * 파는 것은 **앱 안에서만 쓰이는 것**뿐이다 — 이름 앞에 붙는 칭호와 뒤에 붙는
 * 배지. 돈이 한 푼도 안 들고, 순위표에 그대로 드러나므로 오히려 잘 보인다.
 *
 * 포인트를 현금이나 실물로 바꿔 주는 길은 일부러 열지 않았다. 제휴 수수료를
 * 구매자에게 되돌려주는 캐시백은 제휴 약관에서 대체로 막고, 교회가 포인트를
 * 현금성으로 지급하면 사실상 상품권 발행이 되어 세무·회계가 애매해진다.
 */

export type ShopItem = {
  id: string;
  kind: 'title' | 'badge';
  label: string;
  emoji: string;
  description: string;
  cost: number;
  owned: boolean;
  equipped: boolean;
};

export type Balance = { earned: number; spent: number; balance: number };

/**
 * 잔액.
 *
 * 번 점수는 기록에서 계산하고 쓴 점수만 따로 적는다(0050). 그래서 **물건을
 * 샀다고 순위가 떨어지지 않는다** — 순위는 번 점수로 서기 때문이다. 아껴 쓰는
 * 사람이 유리해지면 아무도 안 쓰게 되고, 그러면 교환소를 만든 뜻이 없어진다.
 */
export async function getBalance(): Promise<Balance> {
  const { data, error } = await supabase.rpc('shop_balance');
  if (error || !data) return { earned: 0, spent: 0, balance: 0 };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    earned: row?.earned ?? 0,
    spent: row?.spent ?? 0,
    balance: row?.balance ?? 0,
  };
}

/** 파는 것 전부 + 내가 가진 것·달고 있는 것을 한 번에. */
export async function getShop(userId: string | undefined): Promise<ShopItem[]> {
  const [{ data: items }, mine, equipped] = await Promise.all([
    supabase.from('shop_items').select('*').eq('is_active', true).order('sort_order'),
    userId
      ? supabase.from('shop_purchases').select('item_id').eq('user_id', userId)
      : Promise.resolve({ data: [] as { item_id: string }[] }),
    userId
      ? supabase.from('profiles').select('equipped_title_id, equipped_badge_id').eq('id', userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const owned = new Set(((mine as { data: { item_id: string }[] | null }).data ?? []).map((r) => r.item_id));
  const eq = (equipped as { data: { equipped_title_id: string | null; equipped_badge_id: string | null } | null })
    .data;

  return (items ?? []).map((r) => ({
    id: String(r.id),
    kind: r.kind as 'title' | 'badge',
    label: String(r.label),
    emoji: String(r.emoji ?? ''),
    description: String(r.description ?? ''),
    cost: Number(r.cost ?? 0),
    owned: owned.has(String(r.id)),
    equipped: eq ? eq.equipped_title_id === r.id || eq.equipped_badge_id === r.id : false,
  }));
}

/** 산다. 점수가 모자라면 서버가 이유를 담아 거절한다. */
export async function buyItem(itemId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('shop_buy', { target_item_id: itemId });
  return { error: error?.message ?? null };
}

/** 단다. 산 것 중에서만 고를 수 있다(서버에서 확인). */
export async function equipItem(itemId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('shop_equip', { target_item_id: itemId });
  return { error: error?.message ?? null };
}

/** 벗는다. 칭호와 배지를 따로 벗을 수 있어야 한다. */
export async function unequip(kind: 'title' | 'badge'): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('shop_unequip', { target_kind: kind });
  return { error: error?.message ?? null };
}
