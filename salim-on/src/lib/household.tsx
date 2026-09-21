import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as db from '@/db/household';
import { useAuth } from '@/lib/auth';

/**
 * 지금 보고 있는 집.
 *
 * 식구·분류·집안일은 거의 모든 화면이 같이 쓴다. 화면마다 따로 불러오면
 * 한 화면에서 고친 것이 옆 화면에 안 비치고, 같은 질문이 대여섯 번 나간다.
 *
 * 한 사람이 여러 집(본가·처가)에 속할 수 있어서 **고른 집을 기기에 적어
 * 둔다** — 열 때마다 다시 고르게 하지 않는다.
 */

const PICKED_KEY = 'salimon.household';

type HouseholdContextValue = {
  loading: boolean;
  households: db.Household[];
  current: db.Household | null;
  members: db.Member[];
  categories: db.Category[];
  chores: db.ChoreRow[];
  /** 내가 이 집에서 누구인지. 내 일감을 앞세우는 데 쓴다. */
  me: db.Member | null;
  isManager: boolean;
  pick: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  reloadHouseholds: () => Promise<void>;
  error: string | null;
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [households, setHouseholds] = useState<db.Household[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [members, setMembers] = useState<db.Member[]>([]);
  const [categories, setCategories] = useState<db.Category[]>([]);
  const [chores, setChores] = useState<db.ChoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadHouseholds = useCallback(async () => {
    if (!session) {
      setHouseholds([]);
      setCurrentId(null);
      setLoading(false);
      return;
    }
    try {
      const list = await db.myHouseholds();
      setHouseholds(list);
      const saved = await AsyncStorage.getItem(PICKED_KEY);
      // 적어 둔 집에서 빠졌을 수 있다. 없으면 첫 집으로 조용히 내려간다.
      const next = list.find((h) => h.id === saved)?.id ?? list[0]?.id ?? null;
      setCurrentId(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void reloadHouseholds();
  }, [authLoading, reloadHouseholds]);

  const refresh = useCallback(async () => {
    if (!currentId) {
      setMembers([]);
      setCategories([]);
      setChores([]);
      return;
    }
    try {
      const [m, c, ch] = await Promise.all([
        db.listMembers(currentId),
        db.listCategories(currentId),
        db.listChores(currentId),
      ]);
      setMembers(m);
      setCategories(c);
      setChores(ch);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [currentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pick = useCallback(async (id: string) => {
    setCurrentId(id);
    await AsyncStorage.setItem(PICKED_KEY, id);
  }, []);

  const value = useMemo<HouseholdContextValue>(() => {
    const current = households.find((h) => h.id === currentId) ?? null;
    const me = current ? members.find((m) => m.id === current.my_member_id) ?? null : null;
    return {
      loading,
      households,
      current,
      members,
      categories,
      chores,
      me,
      isManager: current?.my_role === 'manager',
      pick,
      refresh,
      reloadHouseholds,
      error,
    };
  }, [loading, households, currentId, members, categories, chores, pick, refresh, reloadHouseholds, error]);

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold(): HouseholdContextValue {
  const value = useContext(HouseholdContext);
  if (!value) throw new Error('useHousehold 는 HouseholdProvider 안에서만 쓸 수 있습니다.');
  return value;
}
