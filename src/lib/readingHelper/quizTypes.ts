export type ChoiceQuestion = {
  id: number;
  type: 'choice';
  question: string;
  choices: string[]; // 2-5 options, blog content varies (OX, either-or, 4~5-choice)
  correctIndex: number;
  explanation: string; // 블로그의 "정답 및 해설" 섹션 원문
};

export type ShortAnswerQuestion = {
  id: number;
  type: 'short';
  question: string;
  acceptedAnswers: string[]; // matched case/whitespace-insensitively
  explanation: string; // 블로그의 "정답 및 해설" 섹션 원문
};

export type QuizQuestion = ChoiceQuestion | ShortAnswerQuestion;

export type MemorizationVerse = {
  reference: string; // e.g. "창세기 3:15"
  text: string; // full verse text, for the hint/answer reveal
  words: string[]; // text split into the pieces the puzzle shuffles/reassembles
};

/** One day's worth of quiz + memorization content, parsed live from the
 * matching blog post (see lib/blogQuizParser.ts) — the blog is the single
 * source of truth, not hand-authored data. */
export type DayQuizContent = {
  dayNumber: number;
  narrative: string;
  questions: QuizQuestion[];
  memorization: MemorizationVerse;
};
