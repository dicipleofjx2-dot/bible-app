import { useEffect, useState } from 'react';

import { signedPhotoUrls } from '@/db/inventory';

/**
 * 비공개 사진 통의 주소를 화면 단위로 한 번에 받아 둔다.
 *
 * 카드마다 각자 주소를 받으면 한 면에 수십 번의 왕복이 생긴다. 화면이 쓸
 * 경로를 통째로 넘기면 한 번에 서명해 온다(db/inventory 의 signedPhotoUrls).
 */
export function usePhotoUrls(paths: (string | null | undefined)[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  // 배열은 매 렌더 새 객체라 그대로 의존성에 두면 영원히 다시 부른다.
  const key = paths.filter(Boolean).sort().join('|');

  useEffect(() => {
    let alive = true;
    const wanted = key ? key.split('|') : [];
    if (wanted.length === 0) {
      setUrls({});
      return;
    }
    signedPhotoUrls(wanted)
      .then((next) => {
        if (alive) setUrls(next);
      })
      .catch(() => {
        // 사진이 없으면 자리 그림으로 대신 그린다. 화면을 멈추지 않는다.
        if (alive) setUrls({});
      });
    return () => {
      alive = false;
    };
  }, [key]);

  return urls;
}
