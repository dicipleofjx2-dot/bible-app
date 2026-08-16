import { deleteDatabaseAsync } from 'expo-sqlite';
import { useEffect } from 'react';

import { holdDbLock } from '@/lib/tabPresence';

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
