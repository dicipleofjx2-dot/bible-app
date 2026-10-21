import { EASY_WORDS } from "./easyWords";
import type { Row, VocabWord } from "./types";

/**
 * 장별 기본 표에 보강 표를 합치고, 각 장 안에서 절 순서로 정렬한다(같은 절은 쓴 순서 그대로).
 */
export function mergeChapters(base: Row[][], more: Row[][]): Row[][] {
  return base.map((rows, i) =>
    [...rows, ...(more[i] ?? [])]
      .map((r, n) => [r, n] as const)
      .sort((a, b) => a[0][0] - b[0][0] || a[1] - b[1])
      .map(([r]) => r),
  );
}

/**
 * 장별 표(`Row[][]`)를 단어 목록으로 바꾼다. 앞서 나온 책(`exclude`)과 같은 책 앞 장에 이미 나온
 * 단어, 그리고 초등학생이 이미 아는 쉬운 단어(`EASY_WORDS`)는 뺀다 — 한 단어를 두 번 외울 일이
 * 없고 진도도 둘로 갈라지지 않는다.
 * id 는 `접두어 + 장 + 순번` 이라 책이 다르면 겹치지 않는다.
 */
export function buildWords(prefix: string, chapters: Row[][], exclude: VocabWord[][]): VocabWord[] {
  const seen = new Set<string>();
  for (const book of exclude) for (const w of book) seen.add(w.word.toLowerCase());

  return chapters.flatMap((rows, ci) => {
    const chapter = ci + 1;
    const out: VocabWord[] = [];
    for (const [verse, word, pos, ko, example, exampleKo] of rows) {
      const key = word.toLowerCase();
      if (seen.has(key) || EASY_WORDS.has(key)) continue;
      seen.add(key);
      out.push({ id: `${prefix}${chapter}-${out.length + 1}`, chapter, verse, word, pos, ko, example, exampleKo });
    }
    return out;
  });
}
