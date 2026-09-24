import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * 웹은 정적으로 한 번 그려 두고 브라우저에서 다시 살아난다. 그때 다시 재야
 * 어두운 모드가 맞는다 — 프리렌더 시점에는 무조건 밝은 쪽으로 그린다.
 */
export function useColorScheme() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const scheme = useRNColorScheme();
  return hydrated ? scheme : 'light';
}
