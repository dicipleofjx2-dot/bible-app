import { supabase } from '@/lib/supabase';

// 계좌이체 + 관리자 수동확인 결제 (0033_manual_payment_approval.sql).
// 사용자는 pending 신청만 만들 수 있고, paid/active로 바꾸는 건 RLS가 관리자
// (profiles.is_admin)에게만 허용한다 — 클라이언트가 스스로 결제를 승인할 수 없다.

// 정기후원 월 구독료. 후원 화면 문구와 신청 금액이 어긋나지 않도록 한 곳에서 관리한다.
export const SUBSCRIPTION_PRICE = 5000;

export type PaymentKind = 'book' | 'subscription';

// 관리자 입금확인 목록의 한 줄. 책 구매와 정기후원을 한 화면에서 처리하려고
// 두 테이블의 행을 같은 모양으로 맞춰둔다.
export type PaymentRequest = {
  id: string;
  kind: PaymentKind;
  userId: string;
  userName: string;
  title: string;
  // 실제로 통장에 들어와 있어야 하는 금액.
  amount: number;
  depositorName: string;
  requestedAt: string;
};

export type MyPaymentStatus = {
  // 입금 확인을 기다리는 중인 책 id들.
  pendingBookIds: string[];
  // 정기후원 신청을 넣고 승인을 기다리는 중인지.
  hasPendingSubscription: boolean;
};

// ============================================================
// 사용자 — 입금 신청
// ============================================================

// 이미 거절된 신청이 남아 있을 수 있으므로(입금자명 오타 등) upsert로 되살린다.
// unique(user_id, book_id) 제약이 있어 한 사람이 같은 책에 신청을 중복으로
// 쌓지는 않는다.
export async function requestBookPurchase(
  userId: string,
  bookId: string,
  price: number,
  depositorName: string,
): Promise<{ error?: string }> {
  const trimmed = depositorName.trim();
  if (!trimmed) return { error: '입금하신 분의 이름을 입력해주세요.' };

  const { error } = await supabase.from('purchases').upsert(
    {
      user_id: userId,
      book_id: bookId,
      amount: price,
      depositor_name: trimmed,
      status: 'pending',
      purchased_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,book_id' },
  );
  return { error: error?.message };
}

// 대기중/활성 구독은 사람당 하나로 제한되어 있다(subscriptions_one_open_per_user
// 부분 유니크 인덱스). 이미 신청이 걸려 있으면 중복 insert가 실패하므로,
// 사용자에게 상황을 그대로 설명해준다.
export async function requestSubscription(
  userId: string,
  depositorName: string,
): Promise<{ error?: string }> {
  const trimmed = depositorName.trim();
  if (!trimmed) return { error: '입금하신 분의 이름을 입력해주세요.' };

  const { error } = await supabase.from('subscriptions').insert({
    user_id: userId,
    status: 'pending',
    amount: SUBSCRIPTION_PRICE,
    depositor_name: trimmed,
    requested_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === '23505') {
      return { error: '이미 신청하신 정기후원이 있어요. 입금확인이 끝나면 자동으로 열립니다.' };
    }
    return { error: error.message };
  }
  return {};
}

// 사용자가 직접 할 수 있는 유일한 상태 변경. pending(신청 철회)과 active(해지)
// 양쪽 모두 canceled로 간다 — RLS의 "cancel own subscription" 정책이 이 방향만 연다.
export async function cancelMySubscription(userId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('status', ['pending', 'active']);
  return { error: error?.message };
}

export async function getMyPaymentStatus(userId: string): Promise<MyPaymentStatus> {
  const [{ data: purchases }, { data: subscriptions }] = await Promise.all([
    supabase.from('purchases').select('book_id').eq('user_id', userId).eq('status', 'pending'),
    supabase.from('subscriptions').select('id').eq('user_id', userId).eq('status', 'pending').limit(1),
  ]);
  return {
    pendingBookIds: (purchases ?? []).map((row: any) => row.book_id as string),
    hasPendingSubscription: (subscriptions ?? []).length > 0,
  };
}

// ============================================================
// 관리자 — 입금확인 및 승인
// ============================================================

// 신청자 이름을 붙이기 위한 별도 조회. purchases/subscriptions.user_id는
// auth.users를 참조해서 PostgREST가 profiles로 자동 조인을 걸지 못한다.
async function getUserNames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data } = await supabase.from('profiles').select('id, username').in('id', userIds);
  const names: Record<string, string> = {};
  for (const row of data ?? []) {
    names[(row as any).id] = (row as any).username ?? '';
  }
  return names;
}

export async function getPendingPayments(): Promise<PaymentRequest[]> {
  const [{ data: purchaseRows, error: purchaseError }, { data: subscriptionRows, error: subscriptionError }] =
    await Promise.all([
      supabase
        .from('purchases')
        .select('id, user_id, book_id, depositor_name, purchased_at, books(title, price)')
        .eq('status', 'pending')
        .order('purchased_at', { ascending: true }),
      supabase
        .from('subscriptions')
        .select('id, user_id, amount, depositor_name, requested_at')
        .eq('status', 'pending')
        .order('requested_at', { ascending: true }),
    ]);

  if (purchaseError) throw purchaseError;
  if (subscriptionError) throw subscriptionError;

  const userIds = Array.from(
    new Set([
      ...(purchaseRows ?? []).map((row: any) => row.user_id as string),
      ...(subscriptionRows ?? []).map((row: any) => row.user_id as string),
    ]),
  );
  const names = await getUserNames(userIds);

  const purchases: PaymentRequest[] = (purchaseRows ?? []).map((row: any) => {
    // PostgREST는 관계를 배열로 돌려줄 수 있어 양쪽 모양을 모두 받아준다.
    const book = Array.isArray(row.books) ? row.books[0] : row.books;
    return {
      id: row.id,
      kind: 'book' as const,
      userId: row.user_id,
      userName: names[row.user_id] ?? '',
      title: book?.title ?? '(삭제된 책)',
      // 받아야 할 금액은 반드시 books.price에서 읽는다. purchases.amount는
      // 사용자가 자기 pending 행을 수정할 수 있어(RLS) 신뢰할 수 없다.
      amount: book?.price ?? 0,
      depositorName: row.depositor_name ?? '',
      requestedAt: row.purchased_at,
    };
  });

  const subscriptions: PaymentRequest[] = (subscriptionRows ?? []).map((row: any) => ({
    id: row.id,
    kind: 'subscription' as const,
    userId: row.user_id,
    userName: names[row.user_id] ?? '',
    title: '정기후원 (월 구독)',
    // 구독료는 앱이 정하는 고정값이라 행에 적힌 값을 믿지 않는다.
    amount: SUBSCRIPTION_PRICE,
    depositorName: row.depositor_name ?? '',
    requestedAt: row.requested_at,
  }));

  return [...purchases, ...subscriptions].sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
}

// 승인은 pending인 행에만 적용한다(.eq('status','pending')) — 관리자 두 명이
// 동시에 눌러도 두 번 승인되지 않는다.
export async function approvePayment(
  request: PaymentRequest,
  adminId: string,
): Promise<{ error?: string }> {
  const now = new Date();

  if (request.kind === 'book') {
    const { error } = await supabase
      .from('purchases')
      .update({ status: 'paid', approved_at: now.toISOString(), approved_by: adminId })
      .eq('id', request.id)
      .eq('status', 'pending');
    return { error: error?.message };
  }

  // 한 달치 이용기간을 부여한다. 만료일이 지나면 getMyAccess가 더 이상 활성으로
  // 보지 않으므로, 다음 달에 다시 입금·승인이 필요하다.
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      approved_at: now.toISOString(),
      approved_by: adminId,
      current_period_end: periodEnd.toISOString(),
      next_billing_at: periodEnd.toISOString(),
    })
    .eq('id', request.id)
    .eq('status', 'pending');
  return { error: error?.message };
}

export async function rejectPayment(request: PaymentRequest): Promise<{ error?: string }> {
  if (request.kind === 'book') {
    const { error } = await supabase
      .from('purchases')
      .update({ status: 'rejected' })
      .eq('id', request.id)
      .eq('status', 'pending');
    return { error: error?.message };
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('id', request.id)
    .eq('status', 'pending');
  return { error: error?.message };
}

// 관리자 화면 상단에 보여줄 승인 누계 — "이번 달에 얼마가 들어왔나"를 바로 볼 수 있게.
export type ApprovedTotals = { thisMonth: number; allTime: number; paidBookCount: number; activeSubscribers: number };

export async function getApprovedTotals(): Promise<ApprovedTotals> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: paidPurchases }, { data: activeSubscriptions }] = await Promise.all([
    supabase.from('purchases').select('approved_at, books(price)').eq('status', 'paid'),
    supabase.from('subscriptions').select('approved_at').eq('status', 'active'),
  ]);

  let thisMonth = 0;
  let allTime = 0;

  for (const row of paidPurchases ?? []) {
    const book = Array.isArray((row as any).books) ? (row as any).books[0] : (row as any).books;
    const price = book?.price ?? 0;
    allTime += price;
    if ((row as any).approved_at && new Date((row as any).approved_at) >= monthStart) thisMonth += price;
  }

  for (const row of activeSubscriptions ?? []) {
    allTime += SUBSCRIPTION_PRICE;
    if ((row as any).approved_at && new Date((row as any).approved_at) >= monthStart) {
      thisMonth += SUBSCRIPTION_PRICE;
    }
  }

  return {
    thisMonth,
    allTime,
    paidBookCount: (paidPurchases ?? []).length,
    activeSubscribers: (activeSubscriptions ?? []).length,
  };
}
