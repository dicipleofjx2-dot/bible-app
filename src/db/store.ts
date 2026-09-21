/**
 * 거래 보관소.
 *
 * **이 앱은 카드 내역을 서버로 보내지 않는다.** 결제 이력은 언제 어디서 무엇을
 * 했는지가 통째로 드러나는 기록이라, 남의 컴퓨터에 두지 않는 쪽을 택했다.
 * 로그인도 없다. 기기를 바꾸면 내보내기(CSV)로 옮긴다.
 *
 * 달마다 한 칸씩 나눠 담는다. 한 칸에 다 담으면 3년쯤 지나 열 때마다 몇천 건을
 * 통째로 읽게 된다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { type CardTxn } from '@/lib/cardMessage';
import { guessCategory, type Category } from '@/lib/category';
import { monthOf, thisMonth } from '@/lib/money';

export type TxnSource = 'paste' | 'share' | 'notification';

export type StoredTxn = CardTxn & {
  category: Category;
  memo: string | null;
  /** 가계부 셈에서 뺄 것(내 돈이 아닌 결제, 나중에 돌려받을 것). 지우지 않고 빼 둔다. */
  excluded: boolean;
  source: TxnSource;
  savedAt: number;
};

export type Settings = {
  /** 한 달 예산. 안 정했으면 null — 0 과 「안 정함」은 다르다. */
  monthlyBudget: number | null;
  /** 안드로이드 알림 자동수집을 켰는가(권한 자체는 안드로이드 설정에 있다). */
  autoCapture: boolean;
};

const KEY_MONTHS = 'fin:months';
const KEY_OVERRIDES = 'fin:overrides';
const KEY_SETTINGS = 'fin:settings';
const monthKey = (month: string) => `fin:txns:${month}`;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function listMonths(): Promise<string[]> {
  const months = await readJson<string[]>(KEY_MONTHS, []);
  return [...months].sort().reverse();
}

async function rememberMonth(month: string): Promise<void> {
  const months = await readJson<string[]>(KEY_MONTHS, []);
  if (months.includes(month)) return;
  await writeJson(KEY_MONTHS, [...months, month]);
}

export async function loadMonth(month: string): Promise<StoredTxn[]> {
  const txns = await readJson<StoredTxn[]>(monthKey(month), []);
  return txns.sort((a, b) => `${b.date} ${b.time ?? ''}`.localeCompare(`${a.date} ${a.time ?? ''}`));
}

async function saveMonth(month: string, txns: StoredTxn[]): Promise<void> {
  if (txns.length === 0) {
    await AsyncStorage.removeItem(monthKey(month));
    const months = await readJson<string[]>(KEY_MONTHS, []);
    await writeJson(KEY_MONTHS, months.filter((m) => m !== month));
    return;
  }
  await writeJson(monthKey(month), txns);
  await rememberMonth(month);
}

export async function getOverrides(): Promise<Record<string, Category>> {
  return readJson<Record<string, Category>>(KEY_OVERRIDES, {});
}

export async function setOverride(normalizedMerchant: string, category: Category): Promise<void> {
  const overrides = await getOverrides();
  overrides[normalizedMerchant] = category;
  await writeJson(KEY_OVERRIDES, overrides);
}

export async function getSettings(): Promise<Settings> {
  return readJson<Settings>(KEY_SETTINGS, { monthlyBudget: null, autoCapture: false });
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await writeJson(KEY_SETTINGS, next);
  return next;
}

export type SaveReport = { added: number; duplicates: number };

/**
 * 읽어 낸 거래를 담는다. **이미 있는 것은 담지 않는다** — 같은 대화를 두 번
 * 붙여넣는 일은 반드시 일어나고, 그때 한 달 치가 두 배로 불어나면 이 앱은
 * 쓸모가 없다.
 */
export async function saveTxns(txns: CardTxn[], source: TxnSource): Promise<SaveReport> {
  const overrides = await getOverrides();
  const byMonth = new Map<string, CardTxn[]>();
  for (const txn of txns) {
    const month = monthOf(txn.date);
    const list = byMonth.get(month) ?? [];
    list.push(txn);
    byMonth.set(month, list);
  }

  let added = 0;
  let duplicates = 0;
  for (const [month, incoming] of byMonth) {
    const existing = await loadMonth(month);
    const keys = new Set(existing.map((t) => t.key));
    const fresh: StoredTxn[] = [];
    for (const txn of incoming) {
      if (keys.has(txn.key)) {
        duplicates += 1;
        continue;
      }
      keys.add(txn.key);
      fresh.push({
        ...txn,
        category: guessCategory(txn.merchant, overrides),
        memo: null,
        excluded: false,
        source,
        savedAt: Date.now(),
      });
      added += 1;
    }
    if (fresh.length > 0) await saveMonth(month, [...existing, ...fresh]);
  }
  return { added, duplicates };
}

/** 이미 담긴 것인지 미리 보기에서 알려 주려고 — 저장 전에 묻는다. */
export async function findExistingKeys(txns: CardTxn[]): Promise<Set<string>> {
  const months = new Set(txns.map((t) => monthOf(t.date)));
  const keys = new Set<string>();
  for (const month of months) {
    for (const txn of await loadMonth(month)) keys.add(txn.key);
  }
  return keys;
}

export async function updateTxn(key: string, month: string, patch: Partial<StoredTxn>): Promise<void> {
  const txns = await loadMonth(month);
  await saveMonth(
    month,
    txns.map((t) => (t.key === key ? { ...t, ...patch } : t))
  );
}

export async function deleteTxn(key: string, month: string): Promise<void> {
  const txns = await loadMonth(month);
  await saveMonth(
    month,
    txns.filter((t) => t.key !== key)
  );
}

export async function clearAll(): Promise<void> {
  const months = await listMonths();
  await AsyncStorage.multiRemove([...months.map(monthKey), KEY_MONTHS, KEY_OVERRIDES]);
}

export type MonthSummary = {
  month: string;
  /** 승인에서 취소를 뺀 실제 쓴 돈. */
  spent: number;
  approved: number;
  cancelled: number;
  count: number;
  byCategory: { category: Category; amount: number; count: number }[];
  /** 금액을 아직 못 적은 해외 승인 — 합계에 안 들어간다고 알려 줘야 한다. */
  missingAmount: number;
};

/**
 * 한 달 셈.
 *
 * **취소는 빼기다.** 승인만 더하면 결제 취소한 53,000원이 쓴 돈으로 남는다.
 * 취소 건은 대개 짝이 되는 승인 건이 같이 들어오므로, 갈래별 합계에서도
 * 같은 갈래에서 빼 준다.
 */
export function summarize(month: string, txns: StoredTxn[]): MonthSummary {
  const live = txns.filter((t) => !t.excluded);
  const totals = new Map<Category, { amount: number; count: number }>();
  let approved = 0;
  let cancelled = 0;
  let missingAmount = 0;

  for (const txn of live) {
    if (txn.amount === 0) {
      missingAmount += 1;
      continue;
    }
    const sign = txn.kind === 'cancel' ? -1 : 1;
    if (sign === 1) approved += txn.amount;
    else cancelled += txn.amount;
    const bucket = totals.get(txn.category) ?? { amount: 0, count: 0 };
    bucket.amount += sign * txn.amount;
    bucket.count += 1;
    totals.set(txn.category, bucket);
  }

  const byCategory = [...totals.entries()]
    .map(([category, v]) => ({ category, amount: v.amount, count: v.count }))
    .filter((c) => c.amount !== 0 || c.count > 0)
    .sort((a, b) => b.amount - a.amount);

  return { month, spent: approved - cancelled, approved, cancelled, count: live.length, byCategory, missingAmount };
}

export async function summarizeMonth(month: string): Promise<MonthSummary> {
  return summarize(month, await loadMonth(month));
}

/** 최근 몇 달의 합계 — 흐름을 보는 화면에서 쓴다. */
export async function recentSummaries(count: number, now: Date = new Date()): Promise<MonthSummary[]> {
  const months: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const [y, m] = thisMonth(now).split('-').map(Number);
    const d = new Date(y, m - 1 - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return Promise.all(months.reverse().map(summarizeMonth));
}

/** CSV 한 장. 기기를 바꿀 때, 엑셀로 더 볼 때. */
export function toCsv(txns: StoredTxn[]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = ['날짜', '시각', '구분', '금액', '가맹점', '갈래', '할부', '카드', '메모', '제외'];
  const rows = txns.map((t) => [
    t.date,
    t.time ?? '',
    t.kind === 'cancel' ? '취소' : '승인',
    String(t.amount),
    t.merchant,
    t.category,
    t.installment ?? '',
    t.card ?? '',
    t.memo ?? '',
    t.excluded ? 'Y' : '',
  ]);
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
}
