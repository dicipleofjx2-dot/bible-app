// 성경 66권의 한글 이름을 성경 파일에서 뽑아 표로 만든다.
//
// 토라포션·하프타라·절기 독서가 가리키는 책이 오경에서 예언서, 룻기·에스더까지
// 넓어졌다. 코드 안에 필요한 것만 손으로 적어 두었더니 **레위기·민수기가 빠져
// 절기 독서의 책 이름이 빈칸으로 나왔다**(「 22:26–23:44」). 66권을 한 번에
// 뽑아 두면 그런 일이 안 생긴다.
//
// 쓰는 법: node scripts/build-book-names.mjs

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PYTHON = 'C:/Users/dicip/AppData/Local/Programs/Python/Python311/python';
const DB = path.join(process.cwd(), 'assets', 'bible-data', 'bible.db');
const OUT = path.join(process.cwd(), 'src', 'data', 'book-names-ko.json');

// ⚠️ 파이썬 stdout 을 **UTF-8 로 못 박고**, 노드도 바이트로 받아 직접 푼다.
// 윈도에서는 파이썬이 cp949 로 찍고 노드가 utf8 로 읽어, 한글이 「������」로
// 깨진 채 파일에 들어간다. 숫자만 주고받던 다른 스크립트에서는 안 드러났다.
const py = `
import sqlite3, json, sys
sys.stdout.reconfigure(encoding='utf-8')
c = sqlite3.connect(sys.argv[1])
print(json.dumps({str(i): n for i, n in c.execute("select id, name_ko from books order by id")}, ensure_ascii=False))
`;
const tmp = path.join(process.cwd(), 'scripts', '.build-book-names.py');
fs.writeFileSync(tmp, py, 'utf8');
let names;
try {
  const raw = execFileSync(PYTHON, [tmp, DB]);
  names = JSON.parse(raw.toString('utf8'));
} finally {
  fs.unlinkSync(tmp);
}

if (Object.values(names).some((n) => n.includes('�'))) {
  throw new Error('한글이 깨져서 들어왔다 — 파이썬 stdout 인코딩을 확인할 것');
}

const count = Object.keys(names).length;
if (count !== 66) throw new Error(`66권이 아니라 ${count}권이다`);

fs.writeFileSync(OUT, JSON.stringify(names, null, 1), 'utf8');
console.log(`${count}권 → ${OUT} (${names['1']} … ${names['66']})`);
