import { supabase } from '@/lib/supabase';
import { buildFullPlan, type PlanChapterEntry } from './readingPlan';
import type { DayQuizContent, MemorizationVerse, QuizQuestion } from './quizTypes';

/** 하루 퀴즈에 내보내는 최대 문항 수. 주일은 5장을 읽어서 장별 문제를 다 모으면
 * 너무 길어진다 — 장마다 고르게 뽑아 이 수에 맞춘다. */
const MAX_QUESTIONS_PER_DAY = 20;

const cache = new Map<string, DayQuizContent | null>();

/** 암송 퍼즐이 섞을 조각으로 구절을 나눈다.
 * 어절 단위로 자르되 조각이 너무 잘아지지 않게 몇 어절씩 묶는다. */
export function chunkVerseWords(text: string, targetPieces = 7): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= targetPieces) return words;

  const perPiece = Math.ceil(words.length / targetPieces);
  const pieces: string[] = [];
  for (let i = 0; i < words.length; i += perPiece) {
    pieces.push(words.slice(i, i + perPiece).join(' '));
  }
  return pieces;
}

type ChapterRow = {
  book_id: number;
  chapter: number;
  book_name: string;
  summary: string;
  questions: QuizQuestion[] | null;
  memory_verse: { reference: string; text: string } | null;
};

/**
 * 하루치 해설·퀴즈·암송구절.
 *
 * 콘텐츠는 장에 붙어 있으므로(reading_helper_chapter_content) 그날 읽는 장들을
 * 받아 합쳐서 만든다. "며칠째"로 저장하지 않는 이유는 주일 5장·평일 3장이라
 * 시작 요일이 다르면 같은 Day가 다른 본문을 가리키기 때문이다.
 *
 * 그날 범위의 장이 하나도 채워져 있지 않으면 null — 화면은 "준비 중"을 보여준다.
 * 일부만 채워져 있으면 채워진 만큼으로 만든다(빈 화면보다 낫다).
 */
export async function getDayContent(
  dayNumber: number,
  chapters: PlanChapterEntry[]
): Promise<DayQuizContent | null> {
  if (chapters.length === 0) return null;

  const cacheKey = chapters.map((c) => `${c.bookId}:${c.chapter}`).join(',');
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  // (book_id, chapter) 짝으로 걸러야 한다. 책 범위와 장 범위를 따로 걸면
  // 창세기 50장~출애굽기 2장 같은 구간에서 엉뚱한 장이 딸려온다.
  const orFilter = chapters
    .map((c) => `and(book_id.eq.${c.bookId},chapter.eq.${c.chapter})`)
    .join(',');

  const { data, error } = await supabase
    .from('reading_helper_chapter_content')
    .select('book_id, chapter, book_name, summary, questions, memory_verse')
    .or(orFilter);
  if (error) throw error;

  const rows = (data ?? []) as ChapterRow[];
  if (rows.length === 0) {
    cache.set(cacheKey, null);
    return null;
  }

  // 읽는 순서대로 정렬 — 조회 결과 순서는 보장되지 않는다.
  const order = new Map(chapters.map((c, i) => [`${c.bookId}:${c.chapter}`, i]));
  rows.sort(
    (a, b) =>
      (order.get(`${a.book_id}:${a.chapter}`) ?? 0) - (order.get(`${b.book_id}:${b.chapter}`) ?? 0)
  );

  const content: DayQuizContent = {
    dayNumber,
    narrative: rows.map((r) => `${r.book_name} ${r.chapter}장\n${r.summary}`).join('\n\n'),
    questions: pickQuestions(rows),
    memorization: pickMemorization(rows),
  };

  cache.set(cacheKey, content);
  return content;
}

/** 시작일과 며칠째인지만 알고 있는 화면들을 위한 편의 함수.
 * 그날 읽는 장 목록은 통독 계획에서 뽑아 쓴다. */
export async function getDayContentForDay(
  startDateStr: string,
  dayNumber: number
): Promise<DayQuizContent | null> {
  const day = buildFullPlan(startDateStr)[dayNumber - 1];
  return getDayContent(dayNumber, day?.chapters ?? []);
}

/** 장마다 고르게 한 문제씩 돌아가며 뽑는다. 앞 장 문제만 20개 나오면
 * 뒤에 읽은 장은 한 문제도 안 나오게 된다. */
function pickQuestions(rows: ChapterRow[]): QuizQuestion[] {
  const perChapter = rows.map((r) => (r.questions ?? []).slice());
  const picked: QuizQuestion[] = [];

  let round = 0;
  while (picked.length < MAX_QUESTIONS_PER_DAY) {
    let addedThisRound = false;
    for (const list of perChapter) {
      if (round >= list.length) continue;
      picked.push(list[round]);
      addedThisRound = true;
      if (picked.length >= MAX_QUESTIONS_PER_DAY) break;
    }
    if (!addedThisRound) break;
    round += 1;
  }

  // 문항 번호는 화면 표시용이라 합친 뒤 다시 매긴다.
  return picked.map((q, i) => ({ ...q, id: i + 1 }));
}

/** 그날 암송구절은 범위 중 구절이 지정된 첫 장의 것을 쓴다. */
function pickMemorization(rows: ChapterRow[]): MemorizationVerse {
  const found = rows.find((r) => r.memory_verse?.text);
  if (!found?.memory_verse) {
    return { reference: '', text: '', words: [] };
  }
  return {
    reference: found.memory_verse.reference,
    text: found.memory_verse.text,
    words: chunkVerseWords(found.memory_verse.text),
  };
}
