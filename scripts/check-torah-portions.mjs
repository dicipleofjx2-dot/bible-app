// 토라포션 54편의 범위가 **개역개정 절 번호로** 맞는지 검사한다.
//
// 유대력 자료의 절 번호를 그대로 옮기면 앱에서 그 절을 펴 봤을 때 엉뚱한 데가
// 나온다(히브리어 성경과 나누는 자리가 다른 곳이 여럿이다). 그래서 두 가지를
// 실제 성경 파일(bible.db 의 krv)로 잰다.
//
//   1. 끝 절이 **정말 그 장의 마지막 절**이거나, 다음 편이 바로 그 다음 절에서
//      시작하는가 — 54편이 창세기 1:1부터 신명기 34:12까지 빈틈없이 잇는가.
//   2. 시작·끝 절이 실재하는가(장 끝을 넘겨 적지 않았는가).
//
// 쓰는 법: node scripts/check-torah-portions.mjs

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PYTHON = 'C:/Users/dicip/AppData/Local/Programs/Python/Python311/python';
const DB = path.join(process.cwd(), 'assets', 'bible-data', 'bible.db');

const parashot = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'parashot.json'), 'utf8'));

if (parashot.length !== 54) {
  console.error(`표에 ${parashot.length}편이 있다. 54편이어야 한다.`);
  process.exit(1);
}

// 개역개정의 장별 마지막 절을 가져온다.
const py = `
import sqlite3, json, sys
c = sqlite3.connect(sys.argv[1])
rows = c.execute("select book_id, chapter, max(verse) from verses where translation='krv' and book_id<=5 group by book_id, chapter").fetchall()
print(json.dumps({f"{b}:{ch}": mx for b, ch, mx in rows}))
`;
const tmp = path.join(process.cwd(), 'scripts', '.check-torah.py');
fs.writeFileSync(tmp, py, 'utf8');
let lastVerse;
try {
  lastVerse = JSON.parse(execFileSync(PYTHON, [tmp, DB], { encoding: 'utf8' }));
} finally {
  fs.unlinkSync(tmp);
}

const BOOK = ['창세기', '출애굽기', '레위기', '민수기', '신명기'];
const problems = [];
const last = (b, c) => lastVerse[`${b}:${c}`];

for (let i = 0; i < parashot.length; i++) {
  const p = parashot[i];
  const label = `${p.ko}(${p.en})`;

  // 있는 절인가
  const startMax = last(p.book, p.startChapter);
  const endMax = last(p.book, p.endChapter);
  if (!startMax) problems.push(`${label}: ${BOOK[p.book - 1]} ${p.startChapter}장이 없다`);
  else if (p.startVerse > startMax) problems.push(`${label}: 시작 ${p.startChapter}:${p.startVerse} 가 없다 (그 장은 ${startMax}절까지)`);
  if (!endMax) problems.push(`${label}: ${BOOK[p.book - 1]} ${p.endChapter}장이 없다`);
  else if (p.endVerse > endMax) problems.push(`${label}: 끝 ${p.endChapter}:${p.endVerse} 가 없다 (그 장은 ${endMax}절까지)`);

  // 다음 편과 빈틈없이 이어지는가
  const next = parashot[i + 1];
  if (!next) continue;
  const sameBook = next.book === p.book;
  const contiguous = sameBook
    ? (next.startChapter === p.endChapter && next.startVerse === p.endVerse + 1) ||
      (next.startChapter === p.endChapter + 1 && next.startVerse === 1 && p.endVerse === endMax)
    : next.book === p.book + 1 && next.startChapter === 1 && next.startVerse === 1 && p.endChapter === Math.max(...Object.keys(lastVerse).filter((k) => k.startsWith(`${p.book}:`)).map((k) => +k.split(':')[1])) && p.endVerse === endMax;
  if (!contiguous) {
    problems.push(
      `${label} 끝 ${p.endChapter}:${p.endVerse} → ${next.ko} 시작 ${next.startChapter}:${next.startVerse} 가 안 이어진다` +
      (endMax ? ` (${p.endChapter}장은 ${endMax}절까지)` : ''),
    );
  }
}

// 처음과 끝
const first = parashot[0];
const final = parashot[53];
if (!(first.book === 1 && first.startChapter === 1 && first.startVerse === 1)) problems.push('첫 편이 창세기 1:1에서 시작하지 않는다');
if (!(final.book === 5 && final.endChapter === 34 && final.endVerse === last(5, 34))) {
  problems.push(`마지막 편이 신명기 끝(34:${last(5, 34)})에서 안 끝난다 — 지금은 34:${final.endVerse}`);
}

if (problems.length) {
  console.error(`❌ ${problems.length}군데 어긋난다:\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log(`✅ 54편이 창세기 1:1 – 신명기 34:${last(5, 34)} 를 빈틈없이 잇는다 (개역개정 절 번호 기준).`);
