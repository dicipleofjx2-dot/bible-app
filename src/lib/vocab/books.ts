import { MARK_CHAPTERS, MARK_WORDS } from "./mark";
import { MATTHEW_CHAPTERS, MATTHEW_WORDS } from "./matthew";
import type { VocabWord } from "./types";

/**
 * 단어장이 있는 책. 책을 늘릴 때는 데이터 파일을 만들고 여기 한 줄을 더한다.
 * 단어 id 가 책마다 달라야 진도가 섞이지 않는다(`mk…`, `mt…`).
 */
export type VocabBook = { id: string; name: string; words: VocabWord[]; chapters: number[] };

export const VOCAB_BOOKS: VocabBook[] = [
  { id: "mark", name: "마가복음", words: MARK_WORDS, chapters: MARK_CHAPTERS },
  { id: "matthew", name: "마태복음", words: MATTHEW_WORDS, chapters: MATTHEW_CHAPTERS },
];
