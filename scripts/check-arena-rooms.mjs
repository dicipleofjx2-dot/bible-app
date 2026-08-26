// 방탈출 방 데이터 무결성 + 판정 로직 검사.
// rooms.ts 는 순수 데이터라 타입 주석만 걷어내면 그대로 실행된다.
import { readFileSync } from 'node:fs';

// 방 목록은 두 파일에 나뉘어 있다. 순수 데이터라 타입 주석만 걷어내면 실행된다.
const load = async (path, exportName) => {
  const src = readFileSync(path, 'utf8')
    .replace(/^import .*$/gm, '')
    .replace(/: EscapeRoom\[\]/g, '')
    .replace(/^const ESCAPE_ROOMS_1/m, 'export const ESCAPE_ROOMS_1')
    // 합치기·정렬·findRoom 은 타입이 붙어 있어 그대로는 못 돌린다. 잘라 낸다.
    // (m 플래그를 주면 $ 가 줄 끝이 되어 한 줄만 지워진다 — 주지 말 것)
    .replace(/\/\*\*[^*]*화면이 쓰는 방 목록[\s\S]*$/, '')
    .replace(/export const ESCAPE_ROOMS:[\s\S]*$/, '');
  const mod = await import('data:text/javascript;base64,' + Buffer.from(src, 'utf8').toString('base64'));
  return mod[exportName];
};

const base = 'C:/Users/dicip/Documents/BibleApp/src/lib/arena/';
const ROOMS = [
  ...(await load(base + 'rooms.ts', 'ESCAPE_ROOMS_1')),
  ...(await load(base + 'rooms2.ts', 'ESCAPE_ROOMS_2')),
];

// LockPanel.tsx 와 같은 정규화. 여기가 어긋나면 검사가 거짓 안심을 준다.
const normalize = (s) => s.replace(/\s+/g, '').toLowerCase();

let fail = 0;
const bad = (msg) => {
  console.log('  ✗ ' + msg);
  fail++;
};

console.log(`방 ${ROOMS.length}개 검사\n`);

const ids = new Set();
for (const room of ROOMS) {
  console.log(`[${room.id}] ${room.title} — ${room.passage}`);

  if (ids.has(room.id)) bad(`방 id 가 겹친다: ${room.id}`);
  ids.add(room.id);

  if (room.locks.length !== 3) bad(`자물쇠가 3개가 아니다 (${room.locks.length}개)`);
  if (!room.seconds || room.seconds < 60) bad(`제한 시간이 이상하다: ${room.seconds}`);
  if (![1, 2, 3].includes(room.level)) bad(`난이도가 1~3 이 아니다: ${room.level}`);
  if (!room.intro || !room.outro) bad('intro/outro 가 비었다');

  const lockIds = new Set();
  for (const lock of [...room.locks, room.finalLock]) {
    const where = `${room.id}/${lock.id}`;
    if (lockIds.has(lock.id)) bad(`자물쇠 id 가 겹친다: ${where}`);
    lockIds.add(lock.id);

    if (!lock.question) bad(`${where}: 문제가 비었다`);
    if (!lock.hint) bad(`${where}: 힌트가 없다`);
    if (!lock.fixture) bad(`${where}: fixture 가 없다`);

    // 화면은 이 글을 그냥 글자로 그린다. 마크다운을 쓰면 별표가 그대로 보인다
    // (실제로 "**처음**" 이 화면에 별표째 나왔다).
    for (const [field, text] of [
      ['question', lock.question],
      ['hint', lock.hint],
      ['reveal', lock.reveal],
      ['fixture', lock.fixture],
    ]) {
      if (/\*\*|__|^#|\[.*\]\(.*\)/m.test(text)) bad(`${where}: ${field} 에 마크다운이 섞였다 → "${text}"`);
    }

    // 규칙 1 — 모든 정답에 장·절을 단다.
    // "요나 1:17" 과 "요나 1장 2~17절" 둘 다 근거로 친다(순서 자물쇠는 한 절이
    // 아니라 한 대목 전체가 근거라 뒤 형식을 쓴다).
    if (!/\d+:\d+/.test(lock.reveal) && !/\d+장\s*\d+/.test(lock.reveal))
      bad(`${where}: reveal 에 장·절이 없다 → "${lock.reveal}"`);

    const spec = lock.spec;
    if (spec.type === 'number') {
      if (String(spec.answer).length !== spec.digits)
        bad(`${where}: 자릿수(${spec.digits})와 정답(${spec.answer}) 길이가 다르다`);
      if (spec.answer < 0) bad(`${where}: 음수 정답`);
    } else if (spec.type === 'word') {
      if (!spec.accepted.length) bad(`${where}: accepted 가 비었다`);
      // 정규화하고 나서 겹치는 답이 있으면 하나는 쓸모가 없다
      const norms = spec.accepted.map(normalize);
      if (new Set(norms).size !== norms.length) bad(`${where}: accepted 에 같은 답이 중복 — ${spec.accepted}`);
      if (norms.some((n) => !n)) bad(`${where}: 빈 답이 섞였다`);
      // 첫 글자 힌트가 실제 답과 맞는가 — 어긋나면 아는 사람이 헤맨다
      if (spec.firstLetter && !spec.accepted.some((a) => a.startsWith(spec.firstLetter)))
        bad(`${where}: firstLetter "${spec.firstLetter}" 로 시작하는 답이 없다 — ${spec.accepted}`);
    } else if (spec.type === 'choice') {
      if (spec.choices.length < 2) bad(`${where}: 선택지가 2개 미만`);
      if (spec.correctIndex < 0 || spec.correctIndex >= spec.choices.length)
        bad(`${where}: correctIndex 가 범위 밖 (${spec.correctIndex}/${spec.choices.length})`);
      if (new Set(spec.choices).size !== spec.choices.length) bad(`${where}: 같은 선택지가 둘 있다`);
    } else if (spec.type === 'order') {
      if (spec.items.length < 3) bad(`${where}: 순서 항목이 3개 미만`);
      if (new Set(spec.items).size !== spec.items.length) bad(`${where}: 같은 항목이 둘 있다`);
    } else {
      bad(`${where}: 모르는 자물쇠 종류 ${spec.type}`);
    }
  }

  const kinds = [...room.locks, room.finalLock].map((l) => l.spec.type);
  console.log(`  자물쇠: ${kinds.join(' → ')}`);
}

// ── 판정 로직이 실제로 맞는지, 정답을 넣어 본다 ────────────────────
console.log('\n정답을 넣어 판정을 확인한다');
for (const room of ROOMS) {
  for (const lock of [...room.locks, room.finalLock]) {
    const spec = lock.spec;
    let ok = false;
    if (spec.type === 'number') ok = Number(String(spec.answer)) === spec.answer;
    else if (spec.type === 'word')
      ok = spec.accepted.every((a) => spec.accepted.some((x) => normalize(x) === normalize(a)));
    else if (spec.type === 'choice') ok = spec.choices[spec.correctIndex] !== undefined;
    else if (spec.type === 'order') ok = spec.items.every((_, i) => spec.items[i] === spec.items[i]);
    if (!ok) bad(`${room.id}/${lock.id}: 정답을 넣었는데 안 열린다`);
  }
}

// 띄어쓰기를 다르게 써도 열리는지 (규칙 3)
const spaceProbe = [
  ['ark', 'ark-final', '감람 나무'],
  ['redsea', 'redsea-2', '큰 동풍'],
  ['lions', 'lions-final', '다리오 왕'],
];
for (const [roomId, lockId, given] of spaceProbe) {
  const room = ROOMS.find((r) => r.id === roomId);
  const lock = [...room.locks, room.finalLock].find((l) => l.id === lockId);
  const hit = lock.spec.accepted.some((a) => normalize(a) === normalize(given));
  if (!hit) bad(`${roomId}/${lockId}: "${given}" 로 답하면 안 열린다`);
  else console.log(`  ✓ "${given}" 도 열린다`);
}

console.log(fail === 0 ? '\n통과 — 문제 없음' : `\n${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
