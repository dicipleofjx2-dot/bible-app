import { MARK_CHAPTERS, MARK_WORDS } from "./mark";
import { JOHN_CHAPTERS, JOHN_WORDS } from "./john";
import { JOSHUA_CHAPTERS, JOSHUA_WORDS } from "./joshua";
import { JUDGES_CHAPTERS, JUDGES_WORDS } from "./judges";
import { LUKE_CHAPTERS, LUKE_WORDS } from "./luke";
import { MATTHEW_CHAPTERS, MATTHEW_WORDS } from "./matthew";
import type { VocabWord } from "./types";

/**
 * 단어장이 있는 책. 책을 늘릴 때는 데이터 파일을 만들고 여기 한 줄을 더한다.
 * 단어 id 가 책마다 달라야 진도가 섞이지 않는다(`mk…`, `mt…`, `lk…`, `jn…`, `js…`, `jg…`).
 */
export type VocabBook = { id: string; name: string; words: VocabWord[]; chapters: number[] };

export const VOCAB_BOOKS: VocabBook[] = [
  { id: "mark", name: "마가복음", words: MARK_WORDS, chapters: MARK_CHAPTERS },
  { id: "matthew", name: "마태복음", words: MATTHEW_WORDS, chapters: MATTHEW_CHAPTERS },
  { id: "luke", name: "누가복음", words: LUKE_WORDS, chapters: LUKE_CHAPTERS },
  { id: "john", name: "요한복음", words: JOHN_WORDS, chapters: JOHN_CHAPTERS },
  { id: "joshua", name: "여호수아", words: JOSHUA_WORDS, chapters: JOSHUA_CHAPTERS },
  { id: "judges", name: "사사기", words: JUDGES_WORDS, chapters: JUDGES_CHAPTERS },
];
