export type VocabWord = {
  id: string;
  chapter: number;
  /** 처음 나오는 절 */
  verse: number;
  word: string;
  pos: string;
  ko: string;
  example: string;
  exampleKo: string;
};

export type Row = [verse: number, word: string, pos: string, ko: string, example: string, exampleKo: string];
