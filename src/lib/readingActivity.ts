import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_READ_KEY = 'bibleapp.lastReadDate';

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// R2M "성경읽기" 오늘의 훈련 항목의 로컬 신호 — 챕터를 열 때마다 오늘 날짜를 기록해두면
// 홈/R2M 대시보드가 서버 왕복 없이 곧바로 "오늘 읽음"을 알 수 있다. 리더용 완료 여부는
// r2m_daily_checkins.reading(서버 핑)이 따로 맡는다.
export async function markReadToday(): Promise<void> {
  await AsyncStorage.setItem(LAST_READ_KEY, todayDateString());
}

export async function wasReadToday(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(LAST_READ_KEY);
  return stored === todayDateString();
}
