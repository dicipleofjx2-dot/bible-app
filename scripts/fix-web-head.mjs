// 내보낸 웹 HTML 에서 **빈 제목 태그**를 걷어낸다.
//
// expo-router 는 화면마다 `<title data-rh="true"></title>` 를 head 맨 앞에 넣는다.
// 우리는 +html.tsx 에 진짜 제목을 두었는데, 한 문서에 제목이 둘이면
// 검색엔진은 **앞의 것**을 쓴다 — 그래서 「데이빗바이블」로 검색해도 제목 없는
// 문서로 잡혔다. 앞의 빈 것만 지우면 뒤의 진짜 제목이 유일한 제목이 된다.
// (내용이 든 data-rh 제목은 화면이 스스로 정한 것이므로 건드리지 않는다.)
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const EMPTY_TITLE = /<title data-rh="true"><\/title>/g;

let touched = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!p.endsWith('.html')) continue;
    const before = readFileSync(p, 'utf8');
    const after = before.replace(EMPTY_TITLE, '');
    if (after !== before) { writeFileSync(p, after); touched++; }
  }
}

walk(DIST);
console.log(`빈 제목 태그를 지운 문서: ${touched}개`);
