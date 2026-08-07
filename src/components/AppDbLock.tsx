import { useEffect } from 'react';

import { holdDbLock } from '@/lib/tabPresence';

/**
 * SQLiteProvider 안쪽에 놓는다. 이 컴포넌트가 마운트됐다는 건 DB가 실제로 열렸다는
 * 뜻이다(Provider가 준비될 때까지 suspend하므로). 그 탭만 잠금을 쥐게 해서,
 * 나중에 열린 탭이 "누가 DB를 쓰고 있나"를 정확히 알 수 있게 한다.
 *
 * 에러로 떨어진 탭까지 잠금을 잡으면 서로 자기가 주인인 줄 알게 되어 판단이 꼬인다.
 */
export function AppDbLock() {
  useEffect(() => {
    holdDbLock();
  }, []);
  return null;
}
