import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { myMemberships, type GrowthMembership } from '@/db/growth';
import { useAuth } from '@/lib/auth';

const PICKED_KEY = 'growth.schoolId';

/**
 * 「나는 이 학교에서 누구인가」를 한 곳에서 정한다.
 *
 * 한 사람이 교사이면서 보호자일 수 있다(기획서 §3). 그래서 역할이 하나가
 * 아니라 **여럿**이고, 화면은 「교직원인가」만 물으면 된다. 이 판단을 화면마다
 * 따로 두면 한쪽만 고치게 된다(`churchScope.ts` 와 같은 줄기).
 *
 * 고른 학교는 기기에 적어 둔다 — 학교가 하나뿐인 동안에는 보이지 않지만,
 * 여러 학교를 맡은 사람이 화면을 옮길 때마다 다시 고르게 되면 못 쓴다.
 */
export function useSchool() {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id ?? null;

  const [memberships, setMemberships] = useState<GrowthMembership[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    // 로그인 전에도 이 함수가 한 번 지난다. 그냥 돌아가면 돌림표가 영영 돈다
    // (mission-archive 에서 같은 것을 고쳤다).
    if (!userId) {
      setLoading(false);
      setMemberships([]);
      return;
    }
    try {
      const rows = await myMemberships();
      setMemberships(rows);
      const saved = await AsyncStorage.getItem(PICKED_KEY);
      const pick = rows.find((r) => r.school_id === saved) ?? rows[0];
      setSchoolId(pick?.school_id ?? null);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '학교 정보를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const choose = useCallback(async (id: string) => {
    setSchoolId(id);
    await AsyncStorage.setItem(PICKED_KEY, id);
  }, []);

  const mine = memberships.filter((m) => m.school_id === schoolId);
  const roles = mine.map((m) => m.role);

  return {
    loading: loading || authLoading,
    error,
    userId,
    memberships,
    schoolId,
    school: mine[0]?.school ?? null,
    roles,
    /** 학생 전체를 보는 사람. 보호자·학생은 여기 들어오지 않는다. */
    isStaff: roles.some((r) => r === 'owner' || r === 'teacher' || r === 'activity'),
    isOwner: roles.includes('owner'),
    isGuardian: roles.includes('guardian'),
    choose,
    reload: load,
  };
}
