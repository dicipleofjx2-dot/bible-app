// 하프타라 범위가 **개역개정에 실재하는 절**인지 잰다.
//
// hebcal 은 히브리어 성경 번호를 쓴다. 옮기는 것을 빠뜨리면 없는 절(호세아
// 14:10 — 개역개정 호세아 14장은 9절까지다)이 그대로 남고, 앱에서 그 자리를
// 펴면 빈칸이 나온다. 눈으로는 안 보이므로 성경 파일로 잰다.
//
// 쓰는 법: node scripts/check-haftarah.mjs

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PYTHON = 'C:/Users/dicip/AppData/Local/Programs/Python/Python311/python';
const DB = path.join(process.cwd(), 'assets', 'bible-data', 'bible.db');

const haftarah = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'haftarah.json'), 'utf8'));

const py = `
import sqlite3, json, sys
c = sqlite3.connect(sys.argv[1])
rows = c.execute("select book_id, chapter, max(verse) from verses where translation='krv' group by book_id, chapter").fetchall()
names = {b: n for b, n in c.execute("select id, name_ko from books")}
print(json.dumps({"last": {f"{b}:{ch}": mx for b, ch, mx in rows}, "names": names}))
`;
const tmp = path.join(process.cwd(), 'scripts', '.check-haftarah.py');
fs.writeFileSync(tmp, py, 'utf8');
let data;
try {
  data = JSON.parse(execFileSync(PYTHON, [tmp, DB], { encoding: 'utf8' }));
} finally {
  fs.unlinkSync(tmp);
}
const last = (b, c) => data.last[`${b}:${c}`];
const bookKo = (b) => data.names[b] ?? `책${b}`;

const problems = [];
let ranges = 0;

for (const [key, entry] of Object.entries(haftarah)) {
  for (const [tradition, parts] of [['아슈케나짐', entry.ashkenazi], ['세파르딤', entry.sephardi]]) {
    if (!parts) continue;
    for (const p of parts) {
      ranges++;
      const label = `${key}(${tradition}) ${bookKo(p.book)} ${p.startChapter}:${p.startVerse}–${p.endChapter}:${p.endVerse}`;
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

if (problems.length) {
  console.error(`❌ ${problems.length}군데 어긋난다:\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log(`✅ 하프타라 ${ranges}개 범위가 모두 개역개정에 실재한다 (항목 ${Object.keys(haftarah).length}개 · 전통이 갈리는 편 ${Object.values(haftarah).filter((e) => e.sephardi).length}개).`);
