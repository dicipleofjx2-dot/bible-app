/**
 * 마태복음 영어 단어장 데이터. 만드는 방식은 `mark.ts` 와 같다.
 *
 * 마가복음에서 이미 나온 단어는 뺀다 — 마가복음을 먼저 익혔다면 같은 단어를 두 번
 * 외울 일이 없고, 진도도 둘로 갈라지지 않는다. 그래서 마태복음 단어는
 * 마가복음에 없던 것만 들어 있다.
 */
import { CH1 } from "./matthew/ch01";
import { CH2 } from "./matthew/ch02";
import { CH3 } from "./matthew/ch03";
import { CH4 } from "./matthew/ch04";
import { CH5 } from "./matthew/ch05";
import { CH6 } from "./matthew/ch06";
import { CH7 } from "./matthew/ch07";
import { CH8 } from "./matthew/ch08";
import { CH9 } from "./matthew/ch09";
import { CH10 } from "./matthew/ch10";
import { CH11 } from "./matthew/ch11";
import { CH12 } from "./matthew/ch12";
import { CH13 } from "./matthew/ch13";
import { CH14 } from "./matthew/ch14";
import { CH15 } from "./matthew/ch15";
import { CH16 } from "./matthew/ch16";
import { CH17 } from "./matthew/ch17";
import { CH18 } from "./matthew/ch18";
import { CH19 } from "./matthew/ch19";
import { CH20 } from "./matthew/ch20";
import { CH21 } from "./matthew/ch21";
import { CH22 } from "./matthew/ch22";
import { CH23 } from "./matthew/ch23";
import { CH24 } from "./matthew/ch24";
import { CH25 } from "./matthew/ch25";
import { CH26 } from "./matthew/ch26";
import { CH27 } from "./matthew/ch27";
import { CH28 } from "./matthew/ch28";
import { MARK_WORDS } from "./mark";
import type { Row, VocabWord } from "./types";

const CHAPTERS: Row[][] = [CH1, CH2, CH3, CH4, CH5, CH6, CH7, CH8, CH9, CH10, CH11, CH12, CH13, CH14, CH15, CH16, CH17, CH18, CH19, CH20, CH21, CH22, CH23, CH24, CH25, CH26, CH27, CH28];

const seen = new Set<string>(MARK_WORDS.map((w) => w.word.toLowerCase()));

export const MATTHEW_WORDS: VocabWord[] = CHAPTERS.flatMap((rows, ci) => {
  const chapter = ci + 1;
  const out: VocabWord[] = [];
  for (const [verse, word, pos, ko, example, exampleKo] of rows) {
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: `mt${chapter}-${out.length + 1}`, chapter, verse, word, pos, ko, example, exampleKo });
  }
  return out;
});

export const MATTHEW_CHAPTERS = CHAPTERS.map((_, i) => i + 1);
