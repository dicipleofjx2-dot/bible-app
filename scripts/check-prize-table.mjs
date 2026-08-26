// 상금표가 말이 되는지 확인한다.
//
// 셈이 두 곳에 있다 — 0063 마이그레이션의 arena_tournament_prizes 와
// src/lib/arena/prizeMath.ts 의 prizeTable. 두 벌을 둔 이유는 관리자가 대회를
// **만들기 전에** "1등이 얼마 받는지" 미리 봐야 하는데 그때는 DB 에 대회가 아직
// 없어서다. 그러니 **두 셈이 같은 결과를 내야 한다.**
//
//   node scripts/check-prize-table.mjs

import { readFileSync } from 'node:fs';

const src = readFileSync('C:/Users/dicip/Documents/BibleApp/src/lib/arena/prizeMath.ts', 'utf8')
  // 순수한 셈만 있는 파일이라 타입 주석만 걷어내면 그대로 돈다
  .replace(/^export type PrizeRow.*$/m, '')
  .replace(
    /\(size: number, entryFee: number, sponsor: number, actualPool\?: number\): PrizeRow\[\]/,
    '(size, entryFee, sponsor, actualPool)'
  )
  .replace(/\(rows: PrizeRow\[\]\): number/, '(rows)')
  .replace(/\(size: number, entryFee: number, sponsor: number\): boolean/, '(size, entryFee, sponsor)')
  .replace(/\(size: number, entryFee: number\): number/, '(size, entryFee)')
  .replace(/const rows: PrizeRow\[\] = \[\];/, 'const rows = [];');

const mod = await import('data:text/javascript;base64,' + Buffer.from(src, 'utf8').toString('base64'));
const { prizeTable, championTotal, firstWinLosesMoney, minSponsorFor } = mod;

/** 0063 의 plpgsql 을 그대로 옮긴 것. 두 셈이 갈리면 여기서 드러난다. */
function sqlPrizes(size, entryFee, sponsor, actualPool) {
  const pool = actualPool > 0 ? actualPool : entryFee * size + sponsor;
  let rounds = 0;
  let w = size;
  while (w > 1) {
    rounds += 1;
    w = Math.floor(w / 2);
  }
  if (rounds === 0) return [];
  const out = [];
  let round = size;
  for (let r = 1; r <= rounds; r++) {
    const winners = Math.floor(round / 2);
    out.push({ round, winners, perWinner: Math.floor(Math.floor(pool / rounds) / winners) });
    round = Math.floor(round / 2);
  }
  return out;
}

let fail = 0;
const bad = (m) => {
  console.log('  X ' + m);
  fail++;
};

console.log('상금표 검사\n');

// 1) 두 셈이 같은 결과를 내는가
for (const size of [4, 8, 16, 32]) {
  for (const fee of [0, 20, 50, 100]) {
    for (const sponsor of [0, 300, 700, 2000]) {
      const a = prizeTable(size, fee, sponsor);
      const b = sqlPrizes(size, fee, sponsor, 0);
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        bad(`앱과 DB 의 셈이 다르다 (${size}명 · 참가비 ${fee} · 출연 ${sponsor})`);
      }
    }
  }
}
console.log('  o 앱(prizeMath)과 DB(arena_tournament_prizes)가 64가지 조합에서 같은 값');

// 2) 이길수록 상금이 커져야 한다
for (const size of [4, 8, 16, 32]) {
  const rows = prizeTable(size, 20, 700);
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].perWinner <= rows[i - 1].perWinner) {
      bad(`${size}명 대회에서 상금이 안 커진다: ${rows.map((r) => r.perWinner)}`);
    }
  }
}
console.log('  o 라운드가 올라갈수록 1인당 상금이 커진다');

// 3) 나눠 주는 총액이 풀을 넘지 않아야 한다 (넘으면 없는 포인트를 준다)
for (const size of [4, 8, 16, 32]) {
  for (const pair of [
    [20, 700],
    [0, 1000],
    [50, 0],
    [100, 3000],
  ]) {
    const fee = pair[0];
    const sponsor = pair[1];
    const pool = fee * size + sponsor;
    const rows = prizeTable(size, fee, sponsor);
    const paid = rows.reduce((n, r) => n + r.perWinner * r.winners, 0);
    if (paid > pool) bad(`${size}명 · ${fee}/${sponsor}: 풀 ${pool} 인데 ${paid} 을 준다`);
  }
}
console.log('  o 나눠 주는 총액이 상금 풀을 넘지 않는다');

// 4) 권장 출연액을 넣으면 정말 첫 판 승리가 이득이 되는가
//
// 인원이 많을수록 첫 라운드 승자가 많아 1인당이 얇아진다. 32명 · 참가비 20 ·
// 출연 700 이면 첫 판 상금이 16점이라 **이겼는데 4점 손해**다. 이건 셈의
// 성질이라 못 막고, 관리자 화면이 미리 경고하고 최소 출연액을 알려 주는 것으로
// 푼다. 여기서는 그 「최소」가 정말 최소인지만 잰다.
for (const size of [4, 8, 16, 32]) {
  const need = minSponsorFor(size, 20);
  if (firstWinLosesMoney(size, 20, need)) {
    bad(`${size}명: 권장 출연 ${need}점을 넣었는데도 첫 판이 손해다`);
  }
  if (need > 0 && !firstWinLosesMoney(size, 20, need - 1)) {
    bad(`${size}명: 권장 출연이 ${need}점인데 ${need - 1}점으로도 이득이다 (너무 많이 부른다)`);
  }
}
console.log('  o 권장 최소 출연액이 딱 맞는다 (1점만 모자라도 손해가 된다)');

// 5) 실제 숫자를 눈으로
console.log('\n첫 판을 이기면 참가비(20)를 건지는가');
for (const size of [4, 8, 16, 32]) {
  const line = [0, 700, 2000]
    .map((sp) => {
      const rows = prizeTable(size, 20, sp);
      const mark = firstWinLosesMoney(size, 20, sp) ? '손해' : '이득';
      return `출연 ${String(sp).padStart(4)} -> ${String(rows[0].perWinner).padStart(4)}점 ${mark}`;
    })
    .join('   ');
  console.log(`  ${String(size).padStart(2)}명   ${line}`);
  console.log(`         권장 출연 ${minSponsorFor(size, 20)}점 이상`);
}

console.log('\n참가비 20 · 교회 출연 700 일 때 상금표');
for (const size of [8, 16]) {
  const rows = prizeTable(size, 20, 700);
  const pool = 20 * size + 700;
  const champ = championTotal(rows);
  console.log(`\n  [${size}명] 상금 풀 ${pool}점`);
  for (const r of rows) {
    const label = r.round === 2 ? '결승' : r.round === 4 ? '준결승' : `${r.round}강`;
    console.log(
      `    ${label.padEnd(6)} 승자 ${String(r.winners).padStart(2)}명 x ${String(r.perWinner).padStart(4)}점`
    );
  }
  console.log(`    -> 우승자 합계 ${champ}점 (참가비 20 빼면 순이익 ${champ - 20}점)`);
}

console.log(fail === 0 ? '\n통과 — 문제 없음' : `\n${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
