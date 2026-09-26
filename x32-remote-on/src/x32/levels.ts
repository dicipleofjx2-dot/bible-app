// X32 페이더 값(0~1)과 dB 의 변환. X32 는 4구간 직선으로 나눈다(Behringer OSC 문서 표).
export function faderToDb(f: number): number {
  const x = Math.min(1, Math.max(0, f));
  if (x >= 0.5) return x * 40 - 30;
  if (x >= 0.25) return x * 80 - 50;
  if (x >= 0.0625) return x * 160 - 70;
  if (x > 0) return x * 480 - 90;
  return -Infinity;
}

export function dbToFader(db: number): number {
  if (!isFinite(db) || db <= -90) return 0;
  let f: number;
  if (db < -60) f = (db + 90) / 480;
  else if (db < -30) f = (db + 70) / 160;
  else if (db < -10) f = (db + 50) / 80;
  else f = (db + 30) / 40;
  // X32 는 1024 단계로 양자화한다. 맞춰 두면 회신값과 비교할 때 어긋나지 않는다.
  return Math.round(Math.min(1, Math.max(0, f)) * 1023) / 1023;
}

export function formatDb(f: number): string {
  const db = faderToDb(f);
  if (!isFinite(db)) return '-∞';
  return (db > 0 ? '+' : '') + db.toFixed(1);
}
