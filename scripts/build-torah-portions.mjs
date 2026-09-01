// 토라포션(파라샤) 일정표를 만든다.
//
// ── 왜 미리 만들어 두나 ─────────────────────────────────────────────
// 어느 안식일에 어느 파라샤를 읽는지는 히브리력 해의 모양(로쉬 하샤나가 무슨
// 요일인지, 윤년인지, 그 해가 며칠인지)에 따라 갈린다. 규칙이 만만치 않아서
// 손으로 짜면 몇 해에 한 번씩 조용히 어긋난다. 그래서 @hebcal/core 로 **미리
// 계산해 표로 굳혀** 둔다.
//
// 앱에는 @hebcal/core 를 안 싣는다(4MB짜리 꾸러미다). devDependency 로만 두고,
// 앱은 여기서 나온 json 하나만 읽는다.
//
// 쓰는 법:  node scripts/build-torah-portions.mjs
// 해를 늘리려면 아래 FROM/TO 만 고친다.

import fs from 'node:fs';
import path from 'node:path';

import { HDate, HebrewCalendar, Sedra, parshiot, flags } from '@hebcal/core';

const FROM = 2015;
const TO = 2045;
// 이스라엘 밖(디아스포라) 일정을 쓴다. 이스라엘은 유월절 마지막 날이 하루 짧아
// 한동안 한 주씩 어긋나는데, 우리 교인들이 보는 일정표는 디아스포라 쪽이다.
const IN_ISRAEL = false;

const OUT_DIR = path.join(process.cwd(), 'src', 'data');
const OUT = path.join(OUT_DIR, 'torah-portions.json');

/** 이름 → 번호. 앱 쪽 표(torah-portions.ts)와 **같은 순서**여야 한다. */
const INDEX = new Map(parshiot.map((name, i) => [name, i]));

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const schedule = {};

// ── 안식일마다 그 주의 파라샤 ──
// 첫 토요일을 찾아 이레씩 건너뛴다.
const cursor = new Date(FROM, 0, 1);
while (cursor.getDay() !== 6) cursor.setDate(cursor.getDate() + 1);

let sedra = null;
let sedraYear = 0;

while (cursor.getFullYear() <= TO) {
  const hd = new HDate(cursor);
  const hy = hd.getFullYear();
  if (hy !== sedraYear) {
    sedra = new Sedra(hy, IN_ISRAEL);
    sedraYear = hy;
  }
  // 절기와 겹치는 안식일에는 파라샤 대신 절기 독서를 한다. 그럴 때 sedra 는
  // 'Pesach I' 같은 절기 이름을 돌려준다 — 그런 날은 표에 넣지 않는다.
  // (절기 독서는 범위가 따로 있어 여기서 다루지 않는다. 달력에는 절기 이름이
  //  이미 뜨므로 빈칸이어도 화면이 허전하지 않다.)
  const parts = sedra.get(hd);
  if (Array.isArray(parts) && parts.length > 0) {
    const idx = parts.map((name) => INDEX.get(name));
    if (idx.every((i) => i !== undefined)) schedule[ymd(cursor)] = idx;
  }
  cursor.setDate(cursor.getDate() + 7);
}

// ── 브조트 하브라카 ──
// 안식일이 아니라 **심핫 토라**에 읽으므로 위 순회에는 안 잡힌다. 토라를 다
// 읽고 다시 창세기로 돌아가는 날이라, 이 날이 비어 있으면 표가 한 해에 한 번씩
// 끊긴 것처럼 보인다. 번호는 53(0부터 세어 54번째).
const VZOT = 53;
for (let y = FROM; y <= TO; y++) {
  const events = HebrewCalendar.calendar({
    year: y,
    isHebrewYear: false,
    il: IN_ISRAEL,
    mask: flags.CHAG,
  });
  for (const ev of events) {
    if (ev.getDesc() === 'Simchat Torah') schedule[ymd(ev.getDate().greg())] = [VZOT];
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(schedule), 'utf8');

const days = Object.keys(schedule).sort();
console.log(`${FROM}–${TO}년 · ${days.length}일 · ${(fs.statSync(OUT).size / 1024).toFixed(0)}KB`);
console.log(`처음 ${days[0]} → ${schedule[days[0]]}, 끝 ${days[days.length - 1]} → ${schedule[days[days.length - 1]]}`);

// 검증 — 파라샤 54개가 모두 한 번은 나와야 한다. 하나라도 빠지면 표가 틀렸다.
const seen = new Set(Object.values(schedule).flat());
const missing = [...Array(54).keys()].filter((i) => !seen.has(i));
if (missing.length) throw new Error(`한 번도 안 나온 파라샤: ${missing.join(', ')}`);
console.log('54개 파라샤가 모두 나온다.');
