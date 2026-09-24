import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { WORDS } from '@/content/words';
import { today, weekKey, addDays } from '@/lib/day';
import { applyDiagnosis, weeklyAdjust } from '@/lib/diagnose';
import type { SessionState } from '@/lib/session';
import { applyAttempt, newCard, triedToday, type Outcome } from '@/lib/srs';
import * as store from '@/lib/store';
import type { Cards, DayLog, Grade, Profile, Word } from '@/lib/types';

/**
 * 학습 상태 한 곳. 화면은 여기서 읽고, 바꿀 때도 여기를 부른다.
 * 바뀔 때마다 바로 저장한다 — 아이가 앱을 그냥 닫아도 마지막 답까지 남는다.
 */

interface Ctx {
  ready: boolean;
  profile: Profile | null;
  cards: Cards;
  logs: DayLog[];
  session: SessionState | null;
  finishDiagnosis(grade: Grade, results: { word: Word; ok: boolean }[]): Promise<void>;
  /** 처음 만난 새 단어를 카드로 만든다(이미 있으면 그대로). */
  touch(id: string): void;
  record(id: string, o: Outcome): void;
  setSession(s: SessionState | null): void;
  addTime(seconds: number, counts?: { newCount?: number; reviewCount?: number; completed?: boolean }): void;
  finishWeekend(): void;
  reset(): Promise<void>;
}

const ProgressContext = createContext<Ctx | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cards, setCards] = useState<Cards>({});
  const [logs, setLogs] = useState<DayLog[]>([]);
  const [session, setSessionState] = useState<SessionState | null>(null);
  // 여러 답이 한 틱에 몰려도 앞의 것을 덮어쓰지 않게 최신값을 ref 로 들고 간다.
  const cardsRef = useRef<Cards>({});
  const logsRef = useRef<DayLog[]>([]);

  useEffect(() => {
    store.loadAll().then((s) => {
      setProfile(s.profile);
      cardsRef.current = s.cards;
      setCards(s.cards);
      logsRef.current = s.logs;
      setLogs(s.logs);
      // 어제 하다 만 세션은 이어 하지 않는다 — 예약이 이미 하루 밀렸다.
      setSessionState(s.session && s.session.day === today() ? s.session : null);
      setReady(true);
    });
  }, []);

  const commitCards = useCallback((next: Cards) => {
    cardsRef.current = next;
    setCards(next);
    void store.saveCards(next);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      profile,
      cards,
      logs,
      session,
      async finishDiagnosis(grade, results) {
        const r = applyDiagnosis(grade, results, cardsRef.current, today());
        const next = profile ? { ...r.profile, newAdjust: profile.newAdjust } : r.profile;
        setProfile(next);
        await store.saveProfile(next);
        commitCards(r.cards);
      },
      touch(id) {
        if (cardsRef.current[id]) return;
        commitCards({ ...cardsRef.current, [id]: newCard(id, today()) });
      },
      record(id, o) {
        const day = today();
        const card = cardsRef.current[id] ?? newCard(id, day);
        commitCards({ ...cardsRef.current, [id]: applyAttempt(card, day, o, !triedToday(card, day)) });
      },
      setSession(s) {
        setSessionState(s);
        void store.saveSession(s);
      },
      addTime(seconds, counts) {
        const day = today();
        const prev = logsRef.current;
        const cur = prev.find((l) => l.day === day) ?? { day, seconds: 0, newCount: 0, reviewCount: 0 };
        const upd: DayLog = {
          day,
          seconds: cur.seconds + Math.max(0, Math.round(seconds)),
          newCount: cur.newCount + (counts?.newCount ?? 0),
          reviewCount: cur.reviewCount + (counts?.reviewCount ?? 0),
          completed: cur.completed || !!counts?.completed,
        };
        const next = [...prev.filter((l) => l.day !== day), upd].sort((a, b) => a.day.localeCompare(b.day));
        logsRef.current = next;
        setLogs(next);
        void store.saveLogs(next);
      },
      finishWeekend() {
        if (!profile) return;
        const day = today();
        const next = weeklyAdjust(profile, cardsRef.current, weekKey(day), addDays(weekKey(day), -6));
        if (next !== profile) {
          setProfile(next);
          void store.saveProfile(next);
        }
      },
      async reset() {
        await store.resetAll();
        cardsRef.current = {};
        logsRef.current = [];
        setProfile(null);
        setCards({});
        setLogs([]);
        setSessionState(null);
      },
    }),
    [ready, profile, cards, logs, session, commitCards],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): Ctx {
  const c = useContext(ProgressContext);
  if (!c) throw new Error('useProgress 는 ProgressProvider 안에서만 쓴다');
  return c;
}

export { WORDS };
