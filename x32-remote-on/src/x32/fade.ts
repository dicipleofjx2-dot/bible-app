// 페이드 곡선과 한 걸음 계산. 시간·전송은 client 가 맡고 여기는 순수 함수만 둔다.
export type Curve = 'linear' | 'scurve' | 'fastStart' | 'slowEnd';

export const CURVE_LABEL: Record<Curve, string> = {
  linear: '일정하게',
  scurve: '부드럽게(S)',
  fastStart: '빠른 시작',
  slowEnd: '느린 마무리',
};

export function ease(curve: Curve, p: number): number {
  const x = Math.min(1, Math.max(0, p));
  switch (curve) {
    case 'linear': return x;
    case 'scurve': return x * x * (3 - 2 * x);
    case 'fastStart': return 1 - (1 - x) * (1 - x);
    case 'slowEnd': return 1 - Math.pow(1 - x, 3);
  }
}

export function fadeValue(from: number, to: number, curve: Curve, elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return to;
  return from + (to - from) * ease(curve, elapsedMs / durationMs);
}

/** 페이드 한 걸음 간격 40ms(초당 25번). X32 에 과부하를 주지 않으면서 귀에 계단이 안 들린다. */
export const FADE_TICK_MS = 40;
