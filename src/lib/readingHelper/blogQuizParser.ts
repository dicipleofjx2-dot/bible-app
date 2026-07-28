import { stripHtml } from './blogContent';
import type { ChoiceQuestion, DayQuizContent, QuizQuestion, ShortAnswerQuestion } from './quizTypes';

const CIRCLED_INDEX: Record<string, number> = { '①': 0, '②': 1, '③': 2, '④': 3, '⑤': 4 };

/** Splits a post's HTML into named sections by its <h2> headings — the blog's
 * consistent structure is 오늘 본문 이야기 / 오늘의 암송구절 / 오늘의 성경 퀴즈 / 정답 및 해설
 * (headings carry emoji prefixes that vary slightly, so sections are looked
 * up by substring match, not exact title). */
function extractSections(html: string): Record<string, string> {
  const headingRegex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const matches: { title: string; index: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRegex.exec(html))) {
    matches.push({ title: stripHtml(m[1]), index: m.index, end: headingRegex.lastIndex });
  }
  const sections: Record<string, string> = {};
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].end;
    const end = i + 1 < matches.length ? matches[i + 1].index : html.length;
    sections[matches[i].title] = html.slice(start, end);
  }
  return sections;
}

function findSection(sections: Record<string, string>, keyword: string): string | null {
  const key = Object.keys(sections).find((k) => k.includes(keyword));
  return key ? sections[key] : null;
}

function parseMemorization(sections: Record<string, string>): { reference: string; text: string } | null {
  const html = findSection(sections, '암송구절');
  if (!html) return null;
  const refMatch = html.match(/<strong>([\s\S]*?)<\/strong>/i);
  if (!refMatch) return null;
  const reference = stripHtml(refMatch[1]).trim();
  const afterStrong = html.slice(refMatch.index! + refMatch[0].length);
  const text = stripHtml(afterStrong).replace(/^["“]|["”]$/g, '').trim();
  if (!reference || !text) return null;
  return { reference, text };
}

/** Splits verse text into puzzle pieces — phrase-sized chunks rather than
 * single words, since these verses can run 30-40+ words and a piece-per-word
 * puzzle would be tedious well past the spec's 10-attempt budget. */
function chunkVerseWords(text: string, targetPieces = 7): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= targetPieces) return words;
  const groupSize = Math.ceil(words.length / targetPieces);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += groupSize) {
    chunks.push(words.slice(i, i + groupSize).join(' '));
  }
  return chunks;
}

/** One raw "<br/><br/>"-delimited chunk from the 성경 퀴즈 section, paired
 * with its corresponding chunk from 정답 및 해설. The blog doesn't use a
 * single consistent question format across posts — some explicitly prefix
 * each question with "(단답형)"/"(4지선다형)"/etc, others rely purely on
 * structure (a "①…" choice list, or a plain O/X-answered statement, or a
 * "(A / B)" either-or embedded in the sentence) — so classification here
 * goes by structure/answer-shape, not by trusting an explicit label to
 * always be present. */
function parseOneQuestion(id: number, rawQuestion: string, rawAnswer: string): QuizQuestion | null {
  let rest = rawQuestion.replace(/^\s*\(([^)]+)\)\s*/, ''); // strip an explicit "(유형)" prefix if present
  rest = rest.replace(/^\s*\d+\.\s*/, ''); // strip a leading "18. " item number if present

  const answerValueMatch = rawAnswer.match(/정답:\s*([^/]+)\//);
  const answerValue = answerValueMatch ? answerValueMatch[1].trim() : '';
  const explanationMatch = rawAnswer.match(/해설:\s*([\s\S]*)$/);
  const explanation = explanationMatch ? stripHtml(explanationMatch[1]).trim() : '';

  // Multiple choice: a "①…" list follows the question line.
  if (/<br\s*\/?>\s*[①②③④⑤]/.test(rest)) {
    const parts = rest
      .split(/<br\s*\/?>/i)
      .map((s) => stripHtml(s).trim())
      .filter(Boolean);
    const question = parts[0];
    const choices = parts.slice(1).map((p) => p.replace(/^[①②③④⑤]\s*/, ''));
    const circledMatch = rawAnswer.match(/정답:\s*([①②③④⑤])/);
    const correctIndex = circledMatch ? CIRCLED_INDEX[circledMatch[1]] : -1;
    if (!question || choices.length < 2 || correctIndex < 0) return null;
    const q: ChoiceQuestion = { id, type: 'choice', question, choices, correctIndex, explanation };
    return q;
  }

  // O/X: the answer is exactly "O" or "X" (blog posts don't always mark
  // this in the question text itself, so the answer shape is the tell).
  if (/^[OX]$/i.test(answerValue)) {
    const question = stripHtml(rest)
      .replace(/\(\s*O\s*\/\s*X\s*\)\s*$/i, '')
      .trim();
    if (!question) return null;
    const q: ChoiceQuestion = {
      id,
      type: 'choice',
      question,
      choices: ['O', 'X'],
      correctIndex: answerValue.toUpperCase() === 'O' ? 0 : 1,
      explanation,
    };
    return q;
  }

  // Either-or: the question sentence embeds "(A / B)" directly.
  const eitherMatch = rest.match(/\(([^()/]+)\s*\/\s*([^()]+)\)/);
  if (eitherMatch) {
    const a = stripHtml(eitherMatch[1]).trim();
    const b = stripHtml(eitherMatch[2]).trim();
    const question = stripHtml(rest.replace(/\([^()]*\/[^()]*\)/, '( ___ )')).trim();
    let correctIndex = -1;
    if (answerValue === a) correctIndex = 0;
    else if (answerValue === b) correctIndex = 1;
    if (!question || !a || !b || correctIndex < 0) return null;
    const q: ChoiceQuestion = { id, type: 'choice', question, choices: [a, b], correctIndex, explanation };
    return q;
  }

  // Otherwise: short answer (free text).
  const question = stripHtml(rest).trim();
  if (!question || !answerValue) return null;
  const q: ShortAnswerQuestion = { id, type: 'short', question, acceptedAnswers: [answerValue], explanation };
  return q;
}

function parseQuestions(sections: Record<string, string>): QuizQuestion[] {
  const quizHtml = (findSection(sections, '성경 퀴즈') ?? '').replace(/<\/?p[^>]*>/gi, '');
  const answerHtml = (findSection(sections, '정답 및 해설') ?? '').replace(/<\/?p[^>]*>/gi, '');

  const rawQuestions = quizHtml
    .split(/<br\s*\/?>\s*<br\s*\/?>/i)
    .map((s) => s.trim())
    .filter(Boolean)
    // The blog sometimes inserts section-divider announcements like
    // "1~10번 문제는 O/X 문제입니다." between question groups — these aren't
    // real questions and have no corresponding answer entry, so they'd
    // desync the question/answer pairing below if left in.
    .filter((q) => !stripHtml(q).includes('문제입니다'));

  const rawAnswers = answerHtml
    .split(/<br\s*\/?>\s*<br\s*\/?>/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const questions: QuizQuestion[] = [];
  rawQuestions.forEach((rawQ, i) => {
    const parsed = parseOneQuestion(i + 1, rawQ, rawAnswers[i] ?? '');
    if (parsed) questions.push(parsed);
  });
  return questions;
}

/** Parses one blog post's full content into a day's quiz + memorization +
 * narrative. Returns null if the post doesn't have the expected sections
 * (e.g. an older/differently-formatted post) rather than throwing — callers
 * should treat that the same as "not ready yet". */
export function parseBlogPostContent(dayNumber: number, html: string): DayQuizContent | null {
  const sections = extractSections(html);
  const narrative = stripHtml(findSection(sections, '본문 이야기') ?? '');
  const memo = parseMemorization(sections);
  const questions = parseQuestions(sections);

  if (!narrative || !memo || questions.length === 0) return null;

  return {
    dayNumber,
    narrative,
    questions,
    memorization: {
      reference: memo.reference,
      text: memo.text,
      words: chunkVerseWords(memo.text),
    },
  };
}
