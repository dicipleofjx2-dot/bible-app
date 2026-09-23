import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getCellContext, getCellMemberNames, type Cell } from '@/db/cell';
import { getMyVillage, amVillageLeader, isCellLeaderOf, type Village } from '@/db/village';
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
 *
 * ── 첫 번째 목장을 말없이 집지 않는다 ───────────────────────────────
 * 처음에는 내 목장이 없으면 `allCells[0]` 을 썼다. 관리자·교역자에게는 열한
 * 목장이 전부 목록에 오므로, **정렬 첫 번째 목장이 「우리 목장」인 척 떴다.**
 * 남의 목장 명단과 모임이 자기 것처럼 보이는 셈이라 그냥 틀린 정도가 아니다.
 *
 * 지금은 이렇게 고른다:
 *   1. 고른 목장이 저장돼 있고 아직 볼 수 있으면 그것
 *   2. 없으면 교적이 말하는 **내 목장**
 *   3. 그것도 없으면 **null** — 화면이 「어느 목장을 보시겠어요」를 묻는다
 *
 * 고른 것을 AsyncStorage 에 담는 까닭: 방이 여섯인데 방마다 다시 고르게 하면
 * 예배당에서 고른 목장이 소그룹실에서 또 풀린다.
 */
const PICK_KEY = 'village.pickedCellId';

export type CellRoom = {
  userId: string;
  /** 지금 보고 있는 목장. 고른 것이 없고 내 목장도 없으면 null. */
  cell: Cell | null;
  /** 교적이 말하는 내 목장. 관리자라도 교적에 안 걸려 있으면 null. */
  myCell: Cell | null;
  /** 고를 수 있는 목장. 목원에게는 자기 것 하나뿐이다. */
  allCells: Cell[];
  /** 지금 보는 목장이 내 목장이 아니다 — 화면이 그 사실을 알린다. */
  viewingOther: boolean;
  /** 지금 보는 목장의 목자인가. */
  isLeader: boolean;
  canSeeAll: boolean;
  churchId: string | null;
  village: Village;
  isVillageLeader: boolean;
  /** user_id → 이름. 없으면 '성도'로 부른다. */
  names: Map<string, string>;
};

/** 볼 목장을 고른다. 부른 쪽에서 reload() 를 이어 부른다. */
export async function pickCell(cellId: string | null): Promise<void> {
  try {
    if (cellId) await AsyncStorage.setItem(PICK_KEY, cellId);
    else await AsyncStorage.removeItem(PICK_KEY);
  } catch {
    // 저장이 막혀도 이번 화면에서는 고른 대로 보인다. 다음에 다시 고르면 된다.
  }
}

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
      const [ctx, village, profile, picked] = await Promise.all([
        getCellContext(),
        getMyVillage(),
        getProfile(userId).catch(() => null),
        AsyncStorage.getItem(PICK_KEY).catch(() => null),
      ]);

      const myCell = ctx.cell;
      // 고른 목장이 아직 목록에 있는지 본다. 목장이 없어지거나 권한이 바뀌면
      // 저장된 것이 남아 있을 수 있는데, 그때는 없던 것으로 친다.
      const pickedCell = picked ? (ctx.allCells.find((c) => c.id === picked) ?? null) : null;
      const cell = pickedCell ?? myCell;

      const [names, villageLeader, leaderHere] = await Promise.all([
        cell
          ? getCellMemberNames(cell.id).catch(() => new Map<string, string>())
          : Promise.resolve(new Map<string, string>()),
        amVillageLeader(village.id).catch(() => false),
        // 내 목장이면 이미 물어본 답이 있다. 남의 목장을 볼 때만 다시 묻는다.
        !cell
          ? Promise.resolve(false)
          : cell.id === myCell?.id
            ? Promise.resolve(ctx.isLeader)
            : isCellLeaderOf(cell.id).catch(() => false),
      ]);

      setRoom({
        userId,
        cell,
        myCell,
        allCells: ctx.allCells,
        viewingOther: Boolean(cell) && cell?.id !== myCell?.id,
        isLeader: leaderHere,
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
