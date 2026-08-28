// 방탈출 방 데이터 검사. rooms.ts·rooms2.ts 는 순수 데이터라 타입 주석만
// 걷어내면 그대로 실행된다.
//
//   node scripts/check-arena-rooms.mjs
import { readFileSync } from 'node:fs';

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

/** 한 판에 자물쇠 셋을 뽑으므로 후보가 이보다 많아야 뽑는 맛이 있다.
 *
 * 대회를 시작하기도 전에 문제가 통째로 노출된 일이 있었다. 후보를 넉넉히 두면
 * 미리 풀어 본 사람도 어느 셋이 나올지 모른다. → src/lib/arena/draw.ts */
const MIN_LOCK_POOL = 5;
const MIN_FINAL_POOL = 2;

let fail = 0;
const bad = (msg) => {
  console.log('  X ' + msg);
  fail++;
};

console.log(`방 ${ROOMS.length}개 검사\n`);

const ids = new Set();
let totalQuestions = 0;

for (const room of ROOMS) {
  const pool = room.lockPool ?? [];
  const finals = room.finalPool ?? [];
  totalQuestions += pool.length + finals.length;

  const combos = pool.length >= 3 ? (pool.length * (pool.length - 1) * (pool.length - 2)) / 6 : 0;
  console.log(
    `[${room.id}] ${room.title} — ${room.passage}\n` +
      `  자물쇠 후보 ${pool.length}개 · 마지막 문 후보 ${finals.length}개 · 셋을 뽑는 조합 ${combos}가지`
  );

  if (ids.has(room.id)) bad(`방 id 가 겹친다: ${room.id}`);
  ids.add(room.id);

  if (pool.length < MIN_LOCK_POOL) bad(`자물쇠 후보가 ${MIN_LOCK_POOL}개보다 적다 (${pool.length}개)`);
  if (finals.length < MIN_FINAL_POOL)
    bad(`마지막 문 후보가 ${MIN_FINAL_POOL}개보다 적다 (${finals.length}개)`);
  if (!room.seconds || room.seconds < 60) bad(`제한 시간이 이상하다: ${room.seconds}`);
  if (![1, 2, 3].includes(room.level)) bad(`난이도가 1~3 이 아니다: ${room.level}`);
  if (!room.intro || !room.outro) bad('intro/outro 가 비었다');

  const lockIds = new Set();
  const questions = new Set();

  for (const lock of [...pool, ...finals]) {
    const where = `${room.id}/${lock.id}`;
    if (lockIds.has(lock.id)) bad(`자물쇠 id 가 겹친다: ${where}`);
    lockIds.add(lock.id);

    // 같은 방에서 같은 것을 두 번 묻지 않는다 — 한 판에 둘 다 뽑히면 이상하다
    if (questions.has(lock.question)) bad(`${where}: 같은 문제가 두 번 있다`);
    questions.add(lock.question);

    if (!lock.question) bad(`${where}: 문제가 비었다`);
    if (!lock.hint) bad(`${where}: 힌트가 없다`);
    if (!lock.fixture) bad(`${where}: fixture 가 없다`);

    // 규칙 1 — 모든 정답에 장·절을 단다.
    // "요나 1:17" 과 "요나 1장 2~17절" 둘 다 근거로 친다.
    if (!/\d+:\d+/.test(lock.reveal) && !/\d+장\s*\d+/.test(lock.reveal))
      bad(`${where}: reveal 에 장·절이 없다 -> "${lock.reveal}"`);

    // 화면은 이 글을 그냥 글자로 그린다. 마크다운을 쓰면 별표가 그대로 보인다.
    for (const [field, text] of [
      ['question', lock.question],
      ['hint', lock.hint],
      ['reveal', lock.reveal],
      ['fixture', lock.fixture],
    ]) {
      if (/\*\*|__|^#|\[.*\]\(.*\)/m.test(text)) bad(`${where}: ${field} 에 마크다운이 섞였다`);
    }

    const spec = lock.spec;
    if (spec.type === 'number') {
      if (String(spec.answer).length !== spec.digits)
        bad(`${where}: 자릿수(${spec.digits})와 정답(${spec.answer}) 길이가 다르다`);
      if (spec.answer < 0) bad(`${where}: 음수 정답`);
    } else if (spec.type === 'word') {
      if (!spec.accepted.length) bad(`${where}: accepted 가 비었다`);
      const norms = spec.accepted.map(normalize);
      if (new Set(norms).size !== norms.length) bad(`${where}: accepted 에 같은 답이 중복 — ${spec.accepted}`);
      if (norms.some((n) => !n)) bad(`${where}: 빈 답이 섞였다`);
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

  // 한 방 안에서 자물쇠 종류가 한 가지뿐이면 어느 셋을 뽑아도 단조롭다
  const kinds = new Set(pool.map((l) => l.spec.type));
  if (kinds.size < 2) bad(`${room.id}: 자물쇠 후보가 전부 ${[...kinds][0]} 한 종류다`);
}

// ── 뽑기가 제대로 도는가 ───────────────────────────────────────
//
// 씨앗이 같으면 같은 넷이, 다르면 대체로 다른 넷이 나와야 한다. 앞의 것이
// 무너지면 겨루는 두 사람이 서로 다른 문제를 보게 되고, 뒤의 것이 무너지면
// 문제를 여럿 둔 뜻이 없어진다.
const drawSrc = readFileSync(base + 'draw.ts', 'utf8')
  .replace(/^import .*$/gm, '')
  .replace(/\(seed: number\): \(\) => number/, '(seed)')
  .replace(/\(text: string\): number/, '(text)')
  .replace(/\(\): number/, '()')
  .replace(/<T>\(arr: readonly T\[\], rnd: \(\) => number\): T\[\]/, '(arr, rnd)')
  .replace(/\(room: EscapeRoom, seed: number\): DrawnLocks/, '(room, seed)')
  .replace(/let a = seed >>> 0;/, 'let a = seed >>> 0;');
const draw = await import('data:text/javascript;base64,' + Buffer.from(drawSrc, 'utf8').toString('base64'));

console.log('\n뽑기 검사');
{
  const room = ROOMS[0];
  const a = draw.drawLocks(room, 12345);
  const b = draw.drawLocks(room, 12345);
  const same = a.locks.map((l) => l.id).join(',') === b.locks.map((l) => l.id).join(',') && a.final.id === b.final.id;
  if (!same) bad('같은 씨앗인데 다른 자물쇠가 나온다 — 겨루는 두 사람이 서로 다른 문제를 보게 된다');
  else console.log('  o 같은 씨앗이면 언제나 같은 넷이 나온다');

  // 서로 다른 씨앗 200개로 뽑아 얼마나 다양한지 본다
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const d = draw.drawLocks(room, i * 7919 + 1);
    seen.add(d.locks.map((l) => l.id).join(',') + '|' + d.final.id);
  }
  if (seen.size < 20) bad(`씨앗을 200가지 바꿔도 ${seen.size}가지 조합밖에 안 나온다`);
  else console.log(`  o 씨앗 200가지로 ${seen.size}가지 서로 다른 판이 나온다`);

  // 한 판에 같은 자물쇠가 두 번 들어가면 안 된다
  for (let i = 0; i < 200; i++) {
    const d = draw.drawLocks(ROOMS[i % ROOMS.length], i * 104729 + 3);
    const ids = d.locks.map((l) => l.id);
    if (new Set(ids).size !== ids.length) {
      bad(`한 판에 같은 자물쇠가 두 번 나온다 (${ROOMS[i % ROOMS.length].id})`);
      break;
    }
  }
  console.log('  o 한 판에 같은 자물쇠가 두 번 나오지 않는다');
}

console.log(`\n문제 모두 ${totalQuestions}개`);
console.log(fail === 0 ? '통과 — 문제 없음' : `${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
