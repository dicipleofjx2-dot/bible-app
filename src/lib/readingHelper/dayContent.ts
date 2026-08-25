import { supabase } from '@/lib/supabase';
import { buildFullPlan, type PlanChapterEntry } from './readingPlan';
import { BOOK_NAMES_EN } from './bibleBooks';
import type { Lang } from '@/lib/i18n';
import type { DayQuizContent, MemorizationVerse, QuizQuestion } from './quizTypes';
import { shuffleQuestionChoices } from './shuffleChoices';

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
  // 영어판. 아직 안 옮긴 장은 null 이고, 그럴 땐 한글이 대신 나온다.
  summary_en: string | null;
  questions_en: QuizQuestion[] | null;
  memory_verse_en: { reference: string; text: string } | null;
};

/**
 * 그 장의 요약·문항·암송구절을 **읽는 말로** 고른다.
 *
 * 영어 칸이 비어 있으면 한글을 준다. 창세기부터 차례로 옮기는 중이라 아직 안
 * 옮긴 장이 있는데, 거기서 빈 화면이 나오면 그날 통독이 통째로 막힌다.
 */
function pick(row: ChapterRow, lang: Lang) {
  const en = lang === 'en';
  return {
    bookName: en ? (BOOK_NAMES_EN[row.book_id] ?? row.book_name) : row.book_name,
    summary: (en && row.summary_en) || row.summary,
    questions: (en && row.questions_en?.length ? row.questions_en : row.questions) ?? [],
    memoryVerse: (en && row.memory_verse_en) || row.memory_verse,
  };
}

/** 「창세기 1장」 / "Genesis 1". 영어에는 「장」에 해당하는 말을 붙이지 않는다. */
function headingFor(bookName: string, chapter: number, lang: Lang): string {
  return lang === 'en' ? `${bookName} ${chapter}` : `${bookName} ${chapter}장`;
}

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
  chapters: PlanChapterEntry[],
  lang: Lang = 'ko'
): Promise<DayQuizContent | null> {
  if (chapters.length === 0) return null;

  // 말도 열쇠에 넣는다. 안 그러면 한 번 한글로 받아 둔 것을 영어로 바꾼 뒤에도
  // 그대로 내주어, 언어를 바꿔도 화면이 안 바뀐다.
  const cacheKey = lang + '|' + chapters.map((c) => `${c.bookId}:${c.chapter}`).join(',');
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  // (book_id, chapter) 짝으로 걸러야 한다. 책 범위와 장 범위를 따로 걸면
  // 창세기 50장~출애굽기 2장 같은 구간에서 엉뚱한 장이 딸려온다.
  const orFilter = chapters
    .map((c) => `and(book_id.eq.${c.bookId},chapter.eq.${c.chapter})`)
    .join(',');

  const { data, error } = await supabase
    .from('reading_helper_chapter_content')
    .select(
      'book_id, chapter, book_name, summary, questions, memory_verse, summary_en, questions_en, memory_verse_en'
    )
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
    narrative: rows
      .map((r) => {
        const c = pick(r, lang);
        return `${headingFor(c.bookName, r.chapter, lang)}\n${c.summary}`;
      })
      .join('\n\n'),
    questions: pickQuestions(rows, lang),
    memorization: pickMemorization(rows, lang),
  };

  cache.set(cacheKey, content);
  return content;
}

/** 시작일과 며칠째인지만 알고 있는 화면들을 위한 편의 함수.
 * 그날 읽는 장 목록은 통독 계획에서 뽑아 쓴다. */
export async function getDayContentForDay(
  startDateStr: string,
  dayNumber: number,
  lang: Lang = 'ko'
): Promise<DayQuizContent | null> {
  const day = buildFullPlan(startDateStr)[dayNumber - 1];
  return getDayContent(dayNumber, day?.chapters ?? [], lang);
}

/** 장마다 고르게 한 문제씩 돌아가며 뽑는다. 앞 장 문제만 20개 나오면
 * 뒤에 읽은 장은 한 문제도 안 나오게 된다. */
function pickQuestions(rows: ChapterRow[], lang: Lang): QuizQuestion[] {
  const perChapter = rows.map((r) => pick(r, lang).questions.slice());
  // 보기를 섞을 씨앗. **말과 상관없는** 열쇠라야 한국어와 영어가 같은 순서로
  // 섞인다 — 안 그러면 퀴즈를 풀고 말을 바꾼 뒤 정답 화면이 어긋난다.
  const perChapterKeys = rows.map((r, ri) =>
    pick(r, lang).questions.map((_, qi) => `${r.book_id}:${r.chapter}:${qi}:${ri}`)
  );
  const picked: QuizQuestion[] = [];
  const pickedKeys: string[] = [];

  let round = 0;
  while (picked.length < MAX_QUESTIONS_PER_DAY) {
    let addedThisRound = false;
    for (let ci = 0; ci < perChapter.length; ci += 1) {
      const list = perChapter[ci];
      if (round >= list.length) continue;
      picked.push(list[round]);
      pickedKeys.push(perChapterKeys[ci][round]);
      addedThisRound = true;
      if (picked.length >= MAX_QUESTIONS_PER_DAY) break;
    }
    if (!addedThisRound) break;
    round += 1;
  }

  // 보기 순서를 섞는다. 저장된 문제는 정답이 거의 다 1번이라(538개 중 531개)
  // 문제를 안 읽고 찍어도 맞았다. 데이터를 고치지 않고 여기서 섞는 이유는,
  // 앞으로 추가할 문제에도 같은 편중이 다시 쌓이기 때문이다.
  // 순서는 문제 내용에서 뽑은 씨앗으로 정해 늘 같다 — 채점 화면이 저장해 둔
  // 답 번호와 어긋나면 안 된다.
  const shuffled = shuffleQuestionChoices(picked, pickedKeys);

  // 문항 번호는 화면 표시용이라 합친 뒤 다시 매긴다.
  return shuffled.map((q, i) => ({ ...q, id: i + 1 }));
}

/** 그날 암송구절은 범위 중 구절이 지정된 첫 장의 것을 쓴다. */
function pickMemorization(rows: ChapterRow[], lang: Lang): MemorizationVerse {
  const found = rows.map((r) => pick(r, lang)).find((c) => c.memoryVerse?.text);
  if (!found?.memoryVerse) {
    return { reference: '', text: '', words: [] };
  }
  return {
    reference: found.memoryVerse.reference,
    text: found.memoryVerse.text,
    words: chunkVerseWords(found.memoryVerse.text),
  };
}
