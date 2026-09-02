// 하프타라(토라포션 뒤에 이어 읽는 예언서 본문) 표를 만든다.
//
// ── 왜 스크립트로 뽑나 ──────────────────────────────────────────────
// 54편의 짝을 손으로 옮겨 적으면 반드시 어디선가 한 절씩 틀린다. @hebcal/leyning
// 이 갖고 있는 것을 그대로 가져오고, **절 번호만 개역개정으로 옮긴다.**
//
// ── 절 번호를 왜 옮겨야 하나 ────────────────────────────────────────
// hebcal 은 히브리어 성경(마소라) 번호를 쓴다. 그대로 두면 앱에서 그 절을 펴
// 봤을 때 엉뚱한 데가 나오거나 아예 없는 절이 된다. 예를 들어
//   · 이트로의 「이사야 9:5-6」은 개역개정으로 **9:6-7** 이다("한 아기가 우리에게
//     났고"가 개역개정에서는 9:6이다).
//   · 트루마의 「열왕기상 5:26」은 개역개정 **5:12** 다(히브리어 5:15부터 한 장이
//     앞당겨진다).
//   · 바미드바르의 「호세아 2:1-22」는 개역개정 **1:10–2:20** 이다.
// 아래 FIXES 에 어긋나는 자리만 적어 두고, 나머지는 그대로 쓴다.
// 옮긴 결과는 `scripts/check-haftarah.mjs` 가 bible.db 로 **실재하는 절인지** 잰다.
//
// 쓰는 법: node scripts/build-haftarah.mjs

import fs from 'node:fs';
import path from 'node:path';

import { getLeyningForParsha } from '@hebcal/leyning';

const OUT = path.join(process.cwd(), 'src', 'data', 'haftarah.json');
const parashot = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'parashot.json'), 'utf8'));

/** hebcal 이 쓰는 책 이름 → 성경 책 번호(개역개정 순서). */
const BOOK_ID = {
  Joshua: 6, Judges: 7, 'I Samuel': 9, 'II Samuel': 10, 'I Kings': 11, 'II Kings': 12,
  Isaiah: 23, Jeremiah: 24, Ezekiel: 26, Hosea: 28, Joel: 29, Amos: 30, Obadiah: 31,
  Jonah: 32, Micah: 33, Nahum: 34, Habakkuk: 35, Zephaniah: 36, Haggai: 37,
  Zechariah: 38, Malachi: 39,
};

/**
 * 히브리어 번호 → 개역개정 번호.
 * 열쇠는 `책 장:절`, 값은 [장, 절]. 여기 없는 절은 두 성경이 같다.
 * 하프타라에 실제로 나오는 자리만 적는다 — 성경 전체의 차이를 다 적으면
 * 쓰지도 않는 규칙을 지키느라 표가 커지고 틀릴 자리만 는다.
 */
const FIXES = {
  'Isaiah 9:5': [9, 6], 'Isaiah 9:6': [9, 7],
  'I Kings 5:26': [5, 12],
  'Hosea 2:1': [1, 10], 'Hosea 2:22': [2, 20],
  'Hosea 12:12': [12, 11], 'Hosea 12:13': [12, 12], 'Hosea 14:10': [14, 9],
  'Jeremiah 9:22': [9, 23], 'Jeremiah 9:23': [9, 24],
  'Zechariah 2:14': [2, 10],
  'Micah 5:6': [5, 7],
};

/** V'Zot HaBerachah 는 hebcal 의 parsha 목록에 없다(안식일에 안 읽는다). */
const VZOT = { haftara: 'Joshua 1:1-18', sephardic: 'Joshua 1:1-9' };

function fix(bookEn, chapter, verse) {
  const hit = FIXES[`${bookEn} ${chapter}:${verse}`];
  return hit ? { chapter: hit[0], verse: hit[1] } : { chapter, verse };
}

/**
 * "Isaiah 27:6-28:13, 29:22-23" → 토막 목록.
 * 쉼표로 이어지는 뒤 토막은 책 이름이 없다 — 앞 토막의 책을 잇는다.
 */
function parse(text) {
  const parts = [];
  let bookEn = null;
  for (const chunk of text.split(',').map((s) => s.trim())) {
    // "Isaiah 27:6-28:13" · "29:22-23" · "3:4"(한 절만) 세 가지 모양이 다 온다.
    const m = chunk.match(/^(?:((?:I{1,2}\s)?[A-Za-z][A-Za-z ]*?)\s)?(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/);
    if (!m) throw new Error(`못 읽는 범위: "${chunk}" (${text})`);
    if (m[1]) bookEn = m[1].trim();
    if (!bookEn) throw new Error(`책 이름이 없다: ${text}`);
    const book = BOOK_ID[bookEn];
    if (!book) throw new Error(`모르는 책: ${bookEn}`);

    const sc = Number(m[2]);
    const start = fix(bookEn, sc, Number(m[3]));
    const ec = m[4] ? Number(m[4]) : sc;
    const end = m[5] === undefined ? start : fix(bookEn, ec, Number(m[5]));

    parts.push({
      book,
      startChapter: start.chapter, startVerse: start.verse,
      endChapter: end.chapter, endVerse: end.verse,
    });
  }
  return parts;
}

/**
 * 두 편을 붙여 읽는 주는 **하프타라가 하나만** 나간다. 대개 뒤 편의 것을
 * 읽지만 그렇지 않은 짝이 있어(니차빔-바옐레크는 앞 편인 니차빔의 것,
 * 아하레이 모트-케도쉼도 앞 편의 것) 규칙으로 짐작하지 않고 하나씩 물어본다.
 */
const PAIRS = [
  'Vayakhel-Pekudei', 'Tazria-Metzora', 'Achrei Mot-Kedoshim',
  'Behar-Bechukotai', 'Chukat-Balak', 'Matot-Masei', 'Nitzavim-Vayeilech',
];

const INDEX = new Map(parashot.map((p, i) => [p.en, i]));

function toEntry(raw, label) {
  if (!raw.haftara) throw new Error(`${label} 에 하프타라가 없다`);
  const entry = { ashkenazi: parse(raw.haftara) };
  // 세파르딤 전통이 다른 편만 따로 담는다. 같으면 화면에 두 줄을 보일 이유가 없다.
  if (raw.sephardic && raw.sephardic !== raw.haftara) entry.sephardi = parse(raw.sephardic);
  return entry;
}

// 열쇠는 파라샤 번호다 — 붙여 읽는 주는 "21-22" 처럼 이어 붙인다.
// (일정표 json 이 쓰는 번호와 같은 자리여야 한다.)
const out = {};
for (const p of parashot) {
  const raw = p.en === "V'Zot HaBerachah" ? VZOT : getLeyningForParsha(p.en);
  out[String(INDEX.get(p.en))] = toEntry(raw, p.en);
}
for (const pair of PAIRS) {
  const key = pair.split('-').map((n) => {
    // 'Achrei Mot-Kedoshim' 처럼 이름 안에 빈칸이 있는 것도 있다.
    const i = INDEX.get(n);
    if (i === undefined) throw new Error(`짝에서 모르는 이름: ${n} (${pair})`);
    return i;
  }).join('-');
  out[key] = toEntry(getLeyningForParsha(pair), pair);
}

const single = Object.keys(out).filter((k) => !k.includes('-'));
if (single.length !== 54) throw new Error(`54편이 아니라 ${single.length}편이다`);

fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');
console.log(`54편 + 붙여 읽는 짝 ${PAIRS.length}개 → ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)}KB)`);
console.log(`전통이 갈리는 것 ${Object.values(out).filter((e) => e.sephardi).length}개`);
