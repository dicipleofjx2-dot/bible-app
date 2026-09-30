import { deleteDatabaseAsync } from 'expo-sqlite';
import { useEffect } from 'react';

import { hasWaitingTab, holdDbLock, markYielded, yieldDbOnClaim } from '@/lib/tabPresence';

/**
 * SQLiteProvider 안쪽에 놓는다. 이 컴포넌트가 마운트됐다는 건 DB가 실제로 열렸다는
 * 뜻이다(Provider가 준비될 때까지 suspend하므로). 그 탭만 잠금을 쥐게 해서,
 * 나중에 열린 탭이 "누가 DB를 쓰고 있나"를 정확히 알 수 있게 한다.
 *
 * 에러로 떨어진 탭까지 잠금을 잡으면 서로 자기가 주인인 줄 알게 되어 판단이 꼬인다.
 */
export function AppDbLock({ staleDbNames = [] }: { staleDbNames?: string[] }) {
  useEffect(() => {
    holdDbLock();
    // 다른 탭이 "내가 쓸게요" 하면 물러난다. 사용자가 지금 보고 있는 탭이
    // 이기는 것이 옳다 — 뒤에 숨은 탭을 찾아 닫으라고 시킬 일이 아니다.
    return yieldDbOnClaim();
  }, []);

  /**
   * **화면이 꺼져 있는 동안에도 자리를 내준다.**
   *
   * "내가 쓸게요"라는 말(BroadcastChannel)은 잠든 탭에게 닿지 않는다. 폰에서
   * 데이빗바이블을 열어 둔 채 교회앱에서 다시 누르면, 앞선 창이 잠들어 있어
   * 아무 답이 없고 **새 창은 영영 안 열린다.**
   *
   * 그래서 화면이 꺼지면 몇 초마다 "우리 잠금을 기다리는 사람이 있나" 직접
   * 본다. 줄 서 있는 사람이 있으면 그때 물러난다. 기다리는 사람이 없으면
   * 아무 일도 하지 않는다 — 잠깐 다른 앱을 봤다고 읽던 자리를 잃으면 안 된다.
   */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const start = () => {
      stop();
      timer = setInterval(async () => {
        if (!document.hidden) return;
        if (!(await hasWaitingTab())) return;
        stop();
        markYielded();
        window.location.reload();
      }, 2000);
    };

    const onVisibility = () => (document.hidden ? start() : stop());
    document.addEventListener('visibilitychange', onVisibility);
    if (document.hidden) start();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, []);

  // 성경 DB 이름을 올리면 옛 파일이 그대로 남는다(하나에 약 30MB). 새 DB가
  // 확실히 열린 뒤에 지운다. 없으면 그냥 실패하므로 조용히 넘어간다.
  useEffect(() => {
    for (const name of staleDbNames) {
      deleteDatabaseAsync(name).catch(() => {});
    }
    // 목록은 모듈 상수라 바뀌지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
