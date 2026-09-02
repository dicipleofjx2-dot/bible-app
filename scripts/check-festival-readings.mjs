// 절기 독서(토라·하프타라)의 범위가 **개역개정에 실재하는 절**인지 잰다.
//
// hebcal 은 히브리어 성경 번호를 쓴다. 옮기는 것을 빠뜨리면 없는 절이 남는다 —
// 샤밧 하가돌의 「말라기 3:24」는 개역개정 말라기 3장이 18절까지라 그대로 두면
// 빈칸이 되고, 정작 읽어야 할 「엘리야를 보내리니」(4:5-6)를 못 편다.
//
// 쓰는 법: node scripts/check-festival-readings.mjs

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PYTHON = 'C:/Users/dicip/AppData/Local/Programs/Python/Python311/python';
const DB = path.join(process.cwd(), 'assets', 'bible-data', 'bible.db');

const data = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'festival-readings.json'), 'utf8'),
);

const py = `
import sqlite3, json, sys
c = sqlite3.connect(sys.argv[1])
rows = c.execute("select book_id, chapter, max(verse) from verses where translation='krv' group by book_id, chapter").fetchall()
names = {b: n for b, n in c.execute("select id, name_ko from books")}
print(json.dumps({"last": {f"{b}:{ch}": mx for b, ch, mx in rows}, "names": names}))
`;
const tmp = path.join(process.cwd(), 'scripts', '.check-festival.py');
fs.writeFileSync(tmp, py, 'utf8');
let bible;
try {
  bible = JSON.parse(execFileSync(PYTHON, [tmp, DB], { encoding: 'utf8' }));
} finally {
  fs.unlinkSync(tmp);
}
const last = (b, c) => bible.last[`${b}:${c}`];
const bookKo = (b) => bible.names[b] ?? `책${b}`;

const problems = [];
let ranges = 0;

for (const [key, reading] of Object.entries(data.readings)) {
  const groups = [
    ['하프타라', reading.haftarah],
    ['하프타라(세파르딤)', reading.sephardi],
    ['토라', reading.torah],
  ];
  for (const [what, parts] of groups) {
    if (!parts) continue;
    for (const p of parts) {
      ranges++;
      const label = `${key} ${what} ${bookKo(p.book)} ${p.startChapter}:${p.startVerse}–${p.endChapter}:${p.endVerse}`;
      const startMax = last(p.book, p.startChapter);
      const endMax = last(p.book, p.endChapter);
      if (!startMax) problems.push(`${label}: ${p.startChapter}장이 없다`);
      else if (p.startVerse > startMax) problems.push(`${label}: 시작 절이 없다 (${p.startChapter}장은 ${startMax}절까지)`);
      if (!endMax) problems.push(`${label}: ${p.endChapter}장이 없다`);
      else if (p.endVerse > endMax) problems.push(`${label}: 끝 절이 없다 (${p.endChapter}장은 ${endMax}절까지)`);
      if (p.endChapter < p.startChapter || (p.endChapter === p.startChapter && p.endVerse < p.startVerse)) {
        problems.push(`${label}: 끝이 시작보다 앞선다`);
      }
    }
  }
}

// 날짜표가 가리키는 독서가 실재하는가.
for (const [day, key] of Object.entries(data.dates)) {
  if (!data.readings[key]) problems.push(`${day} 가 없는 독서(${key})를 가리킨다`);
}

if (problems.length) {
  console.error(`❌ ${problems.length}군데 어긋난다:\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log(
  `✅ 절기 독서 ${Object.keys(data.readings).length}가지 · 범위 ${ranges}개가 모두 개역개정에 실재한다 ` +
  `(날짜 ${Object.keys(data.dates).length}일).`,
);
