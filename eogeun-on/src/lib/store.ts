import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SessionState } from './session';
import type { Cards, DayLog, Profile } from './types';

/**
 * 저장소 — 기기 안(AsyncStorage)에만 둔다.
 *
 * 아이의 학습 기록이다(§7 「아동 학습 기록의 공개 범위」). 1차는 서버에
 * 올리지 않는다 — 보호자는 같은 기기에서 보고서를 본다. 기기 간 동기화나
 * 교사 반 관리(2차)를 붙일 때 이 파일만 바꾸면 되도록 읽기·쓰기를 여기 모았다.
 */

const K = {
  profile: 'eo.v1.profile',
  cards: 'eo.v1.cards',
  logs: 'eo.v1.logs',
  session: 'eo.v1.session',
} as const;

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export interface Saved {
  profile: Profile | null;
  cards: Cards;
  logs: DayLog[];
  session: SessionState | null;
}

export async function loadAll(): Promise<Saved> {
  const [profile, cards, logs, session] = await Promise.all([
    read<Profile | null>(K.profile, null),
    read<Cards>(K.cards, {}),
    read<DayLog[]>(K.logs, []),
    read<SessionState | null>(K.session, null),
  ]);
  return { profile, cards, logs, session };
}

export const saveProfile = (p: Profile) => write(K.profile, p);
export const saveCards = (c: Cards) => write(K.cards, c);
export const saveLogs = (l: DayLog[]) => write(K.logs, l.slice(-400));
export const saveSession = (s: SessionState | null) => (s ? write(K.session, s) : AsyncStorage.removeItem(K.session));

export async function resetAll(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(K));
}
