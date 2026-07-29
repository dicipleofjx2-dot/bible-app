import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SEEN_KEY = 'shepherd_letter_last_seen_at';

// 홈 화면 아이콘의 "새 글" 뱃지 판단 — 서버에 안 읽음 상태를 저장하지 않고,
// 기기별 AsyncStorage에 마지막으로 목록을 연 시각만 남겨서 최신 글 시각과 비교한다.
export async function hasUnseenLetter(latestCreatedAt: string | null): Promise<boolean> {
  if (!latestCreatedAt) return false;
  const lastSeen = await AsyncStorage.getItem(LAST_SEEN_KEY);
  if (!lastSeen) return true;
  return new Date(latestCreatedAt).getTime() > new Date(lastSeen).getTime();
}

export async function markLettersSeen(): Promise<void> {
  await AsyncStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
}
