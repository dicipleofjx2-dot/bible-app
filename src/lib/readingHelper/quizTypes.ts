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

/** 하루치 해설·퀴즈·암송구절. 앱이 직접 보관하는 `reading_helper_day_content`에서
 * 읽어온다(예전에는 매일 발행되는 블로그 글을 파싱해 썼다 — 그 발행이 멈추면
 * 앱도 함께 멈춰서 자체 보관으로 옮겼다). */
export type DayQuizContent = {
  dayNumber: number;
  narrative: string;
  questions: QuizQuestion[];
  memorization: MemorizationVerse;
};
