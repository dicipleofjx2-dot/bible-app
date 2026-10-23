import AsyncStorage from '@react-native-async-storage/async-storage';

import { BIBLE_BOOKS } from './bibleBooks';
import { getDayContent } from './dayContent';
import { buildFullPlan, todayDateString, type PlanChapterEntry, type PlanDay } from './readingPlan';
import type { Lang } from '@/lib/i18n';
import type { DayQuizContent } from './quizTypes';

/**
 * 로그인 없이 볼 범위.
 *
 * 블로그 「성경통독 365」의 하루 글이 `/reading-helper?from=205&to=207` 로 연다
 * (성경 전체 장 번호, 창세기 1장 = 1 — 웹툰과 같은 번호). 그 범위를 기억해 두었다가
 * 퀴즈·3초 OX·암송 화면도 같은 범위로 연다. 링크 없이 들어오면 예전처럼
 * 「오늘 시작한 사람의 1일차」.
 *
 * 화면끼리 주소로 넘기지 않고 저장해 두는 이유: 퀴즈 → 정답 화면처럼 여러 단계를
 * 거치는데, 단계마다 범위를 실어 나르다 하나라도 빠뜨리면 창세기 1장 문제가 나온다.
 */

const KEY = 'readingHelper.guestRange';
// 날 번호는 웹툰 화 번호와 맞춘다 — 웹툰도 이 날 시작한 계획으로 나눴다.
const PLAN_ANCHOR = '2026-07-29';

const ALL: PlanChapterEntry[] = BIBLE_BOOKS.flatMap((b) =>
  Array.from({ length: b.chapters }, (_, i) => ({ bookId: b.id, bookName: b.name, chapter: i + 1 }))
);

/** 주소의 from/to 를 받아 둔다. 엉뚱한 값이면 지우고 1일차로 돌아간다. */
export async function setGuestRange(from?: string, to?: string): Promise<void> {
  const a = Number(from);
  const b = Number(to ?? from);
  const ok = Number.isInteger(a) && Number.isInteger(b) && a >= 1 && b >= a && b <= ALL.length && b - a < 10;
  try {
    if (ok) await AsyncStorage.setItem(KEY, JSON.stringify({ from: a, to: b }));
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // 저장이 막힌 브라우저 — 범위 없이 1일차로 간다
  }
}

async function storedRange(): Promise<{ from: number; to: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** 손님이 지금 보는 날 — 범위가 있으면 그 장들, 없으면 오늘 시작한 사람의 1일차 */
export async function guestDay(): Promise<PlanDay | null> {
  const r = await storedRange();
  if (!r) return buildFullPlan(todayDateString())[0] ?? null;
  const chapters = ALL.slice(r.from - 1, r.to);
  const plan = buildFullPlan(PLAN_ANCHOR);
  const first = `${chapters[0].bookId}:${chapters[0].chapter}`;
  const hit = plan.find((d) => d.chapters.some((c) => `${c.bookId}:${c.chapter}` === first));
  return {
    dayNumber: hit?.dayNumber ?? 1,
    date: todayDateString(),
    isSunday: chapters.length >= 5,
    chapters,
  };
}

export async function guestDayContent(lang: Lang): Promise<DayQuizContent | null> {
  const day = await guestDay();
  return day ? getDayContent(day.dayNumber, day.chapters, lang) : null;
}
