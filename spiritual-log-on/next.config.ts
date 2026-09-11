import type { NextConfig } from 'next';

const config: NextConfig = {
  // 이 앱은 성경앱 리포 안에 얹혀 있다(레포를 따로 만들기 전까지). 위쪽 lockfile 을
  // 뿌리로 잡지 않도록 여기라고 못 박는다.
  outputFileTracingRoot: __dirname,
  // 이 앱에는 아직 eslint 설정이 없다. 형 검사(tsc)와 순수 함수 검사(npm run check)로
  // 대신한다 — 없는 설정을 찾느라 빌드가 멈추는 것이 더 나쁘다.
  eslint: { ignoreDuringBuilds: true },
  // 서비스워커(public/sw.js)는 캐시하지 않는다 — 낡은 워커가 남으면 배포가 안 보인다.
  async headers() {
    return [
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
    ];
  },
};

export default config;
