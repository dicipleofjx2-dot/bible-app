// Canonical 66-book order, Korean names (개역개정 versification), and chapter
// counts. Total is 1189 chapters (OT 929 + NT 260) — the standard Protestant
// chapter count, used to spread the 1-year reading plan evenly.
export type BibleBook = {
  id: number; // 1-66, canonical order
  name: string; // full Korean name, e.g. "창세기"
  abbrev: string; // short Korean form, e.g. "창"
  chapters: number;
};

export const BIBLE_BOOKS: BibleBook[] = [
  { id: 1, name: '창세기', abbrev: '창', chapters: 50 },
  { id: 2, name: '출애굽기', abbrev: '출', chapters: 40 },
  { id: 3, name: '레위기', abbrev: '레', chapters: 27 },
  { id: 4, name: '민수기', abbrev: '민', chapters: 36 },
  { id: 5, name: '신명기', abbrev: '신', chapters: 34 },
  { id: 6, name: '여호수아', abbrev: '수', chapters: 24 },
  { id: 7, name: '사사기', abbrev: '삿', chapters: 21 },
  { id: 8, name: '룻기', abbrev: '룻', chapters: 4 },
  { id: 9, name: '사무엘상', abbrev: '삼상', chapters: 31 },
  { id: 10, name: '사무엘하', abbrev: '삼하', chapters: 24 },
  { id: 11, name: '열왕기상', abbrev: '왕상', chapters: 22 },
  { id: 12, name: '열왕기하', abbrev: '왕하', chapters: 25 },
  { id: 13, name: '역대상', abbrev: '대상', chapters: 29 },
  { id: 14, name: '역대하', abbrev: '대하', chapters: 36 },
  { id: 15, name: '에스라', abbrev: '스', chapters: 10 },
  { id: 16, name: '느헤미야', abbrev: '느', chapters: 13 },
  { id: 17, name: '에스더', abbrev: '에', chapters: 10 },
  { id: 18, name: '욥기', abbrev: '욥', chapters: 42 },
  { id: 19, name: '시편', abbrev: '시', chapters: 150 },
  { id: 20, name: '잠언', abbrev: '잠', chapters: 31 },
  { id: 21, name: '전도서', abbrev: '전', chapters: 12 },
  { id: 22, name: '아가', abbrev: '아', chapters: 8 },
  { id: 23, name: '이사야', abbrev: '사', chapters: 66 },
  { id: 24, name: '예레미야', abbrev: '렘', chapters: 52 },
  { id: 25, name: '예레미야애가', abbrev: '애', chapters: 5 },
  { id: 26, name: '에스겔', abbrev: '겔', chapters: 48 },
  { id: 27, name: '다니엘', abbrev: '단', chapters: 12 },
  { id: 28, name: '호세아', abbrev: '호', chapters: 14 },
  { id: 29, name: '요엘', abbrev: '욜', chapters: 3 },
  { id: 30, name: '아모스', abbrev: '암', chapters: 9 },
  { id: 31, name: '오바댜', abbrev: '옵', chapters: 1 },
  { id: 32, name: '요나', abbrev: '욘', chapters: 4 },
  { id: 33, name: '미가', abbrev: '미', chapters: 7 },
  { id: 34, name: '나훔', abbrev: '나', chapters: 3 },
  { id: 35, name: '하박국', abbrev: '합', chapters: 3 },
  { id: 36, name: '스바냐', abbrev: '습', chapters: 3 },
  { id: 37, name: '학개', abbrev: '학', chapters: 2 },
  { id: 38, name: '스가랴', abbrev: '슥', chapters: 14 },
  { id: 39, name: '말라기', abbrev: '말', chapters: 4 },
  { id: 40, name: '마태복음', abbrev: '마', chapters: 28 },
  { id: 41, name: '마가복음', abbrev: '막', chapters: 16 },
  { id: 42, name: '누가복음', abbrev: '눅', chapters: 24 },
  { id: 43, name: '요한복음', abbrev: '요', chapters: 21 },
  { id: 44, name: '사도행전', abbrev: '행', chapters: 28 },
  { id: 45, name: '로마서', abbrev: '롬', chapters: 16 },
  { id: 46, name: '고린도전서', abbrev: '고전', chapters: 16 },
  { id: 47, name: '고린도후서', abbrev: '고후', chapters: 13 },
  { id: 48, name: '갈라디아서', abbrev: '갈', chapters: 6 },
  { id: 49, name: '에베소서', abbrev: '엡', chapters: 6 },
  { id: 50, name: '빌립보서', abbrev: '빌', chapters: 4 },
  { id: 51, name: '골로새서', abbrev: '골', chapters: 4 },
  { id: 52, name: '데살로니가전서', abbrev: '살전', chapters: 5 },
  { id: 53, name: '데살로니가후서', abbrev: '살후', chapters: 3 },
  { id: 54, name: '디모데전서', abbrev: '딤전', chapters: 6 },
  { id: 55, name: '디모데후서', abbrev: '딤후', chapters: 4 },
  { id: 56, name: '디도서', abbrev: '딛', chapters: 3 },
  { id: 57, name: '빌레몬서', abbrev: '몬', chapters: 1 },
  { id: 58, name: '히브리서', abbrev: '히', chapters: 13 },
  { id: 59, name: '야고보서', abbrev: '약', chapters: 5 },
  { id: 60, name: '베드로전서', abbrev: '벧전', chapters: 5 },
  { id: 61, name: '베드로후서', abbrev: '벧후', chapters: 3 },
  { id: 62, name: '요한일서', abbrev: '요일', chapters: 5 },
  { id: 63, name: '요한이서', abbrev: '요이', chapters: 1 },
  { id: 64, name: '요한삼서', abbrev: '요삼', chapters: 1 },
  { id: 65, name: '유다서', abbrev: '유', chapters: 1 },
  { id: 66, name: '요한계시록', abbrev: '계', chapters: 22 },
];

export const TOTAL_CHAPTERS = BIBLE_BOOKS.reduce((sum, b) => sum + b.chapters, 0);

/** Longest-name-first so a search doesn't match a short substring of a longer book name. */
export const BIBLE_BOOKS_BY_NAME_LENGTH = [...BIBLE_BOOKS].sort(
  (a, b) => b.name.length - a.name.length
);
