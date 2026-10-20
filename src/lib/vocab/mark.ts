/**
 * 마가복음 영어 단어장 데이터.
 *
 * NIV 본문은 저작권이 있어 문장을 옮기지 않는다 — 단어·뜻·나오는 절 번호와
 * 직접 쓴 쉬운 예문만 둔다. 장마다 파일 하나(`chNN.ts`)이고, 순서는 본문에
 * 처음 나오는 차례(절 순)다. 앞 장에 나온 단어가 뒤 장에 또 있으면 뒤의 것은 버린다.
 */
import { CH1 } from "./ch01";
import { CH2 } from "./ch02";
import { CH3 } from "./ch03";
import { CH4 } from "./ch04";
import { CH5 } from "./ch05";
import { CH6 } from "./ch06";
import { CH7 } from "./ch07";
import { CH8 } from "./ch08";
import { CH9 } from "./ch09";
import { CH10 } from "./ch10";
import { CH11 } from "./ch11";
import { CH12 } from "./ch12";
import { CH13 } from "./ch13";
import { CH14 } from "./ch14";
import { CH15 } from "./ch15";
import { CH16 } from "./ch16";
import type { Row, VocabWord } from "./types";

export type { VocabWord };

const CHAPTERS: Row[][] = [CH1, CH2, CH3, CH4, CH5, CH6, CH7, CH8, CH9, CH10, CH11, CH12, CH13, CH14, CH15, CH16];

const seen = new Set<string>();

export const MARK_WORDS: VocabWord[] = CHAPTERS.flatMap((rows, ci) => {
  const chapter = ci + 1;
  const out: VocabWord[] = [];
  for (const [verse, word, pos, ko, example, exampleKo] of rows) {
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: `mk${chapter}-${out.length + 1}`, chapter, verse, word, pos, ko, example, exampleKo });
  }
  return out;
});

export const MARK_CHAPTERS = CHAPTERS.map((_, i) => i + 1);
