import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getCellContext, getCellMemberNames, type Cell } from '@/db/cell';
import { getMyVillage, amVillageLeader, type Village } from '@/db/village';
import { getProfile } from '@/db/profile';
import { useAuth } from '@/lib/auth';

/**
 * 목장 방 하나를 열 때마다 필요한 것들.
 *
 * 방이 여섯이라 화면마다 「내 목장이 어디고, 내가 목자인가, 교회는 어디인가,
 * 이 사람 이름은 무엇인가」를 다시 물어야 한다. 그 넷은 어느 방에서나 똑같아서
 * 여기 한 번 모아 둔다.
 *
 * 이름을 함께 받는 이유: 나눔·참석·돌봄이 모두 user_id 만 갖고 있다. 화면마다
 * 따로 이름을 찾으면 방을 옮길 때마다 같은 질의가 되풀이된다.
 */
export type CellRoom = {
  userId: string;
  cell: Cell | null;
  isLeader: boolean;
  canSeeAll: boolean;
  churchId: string | null;
  village: Village;
  isVillageLeader: boolean;
  /** user_id → 이름. 없으면 '성도'로 부른다. */
  names: Map<string, string>;
};

export function useCellRoom() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? '';

  const [room, setRoom] = useState<CellRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setRoom(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [ctx, village, profile] = await Promise.all([
        getCellContext(),
        getMyVillage(),
        getProfile(userId).catch(() => null),
      ]);
      const cell = ctx.cell ?? ctx.allCells[0] ?? null;
      const [names, villageLeader] = await Promise.all([
        cell ? getCellMemberNames(cell.id).catch(() => new Map<string, string>()) : Promise.resolve(new Map<string, string>()),
        amVillageLeader(village.id).catch(() => false),
      ]);
      setRoom({
        userId,
        cell,
        isLeader: ctx.isLeader,
        canSeeAll: ctx.canSeeAll,
        churchId: (profile as { church_id?: string | null } | null)?.church_id ?? null,
        village,
        isVillageLeader: villageLeader,
        names,
      });
    } catch {
      setError('목장 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { room, loading, error, reload: load };
}

/** user_id 를 사람 이름으로. 교적에 없으면 '성도'다 — 아이디를 보여 주지 않는다. */
export function nameOf(names: Map<string, string>, userId: string | null | undefined): string {
  if (!userId) return '성도';
  return names.get(userId) ?? '성도';
}
