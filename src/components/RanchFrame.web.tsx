import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { ranchUrl } from '@/lib/ranchUrl';

export function RanchFrame({ items }: { items: [string, string, string][] }) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const first = useRef(ranchUrl(items));

  // 먹이가 쌓여 동물이 늘면 판을 다시 불러오지 않고 목록만 알린다.
  useEffect(() => {
    ref.current?.contentWindow?.postMessage({ source: 'ranch-host', items }, '*');
  }, [items]);

  return (
    <View style={{ flex: 1, width: '100%' }}>
      <iframe
        ref={ref}
        src={first.current}
        title="방주 목장"
        style={{ border: 0, width: '100%', height: '100%', display: 'block', background: '#9fd2f5' }}
      />
    </View>
  );
}
