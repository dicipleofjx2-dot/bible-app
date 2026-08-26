/** 상금표 셈. **0063 마이그레이션의 `arena_tournament_prizes` 와 같아야 한다.**
 *
 * 앱에도 한 벌을 두는 이유는 하나뿐이다 — 관리자가 대회를 **만들기 전에**
 * "이렇게 열면 1등이 얼마를 받는지" 미리 봐야 하는데, 그때는 DB 에 대회가
 * 아직 없어서 물어볼 데가 없다. 대회가 생긴 뒤에는 DB 가 준 값을 쓴다.
 *
 * 두 셈이 같은지는 `node scripts/check-prize-table.mjs` 가 잰다. 이 파일을
 * 따로 뗀 것도 그 검사 때문이다 — 순수한 셈만 있어야 검사가 안정적으로 읽는다.
 *
 * ## 나누는 법
 *
 * 라운드마다 **똑같은 총액**(풀 ÷ 라운드 수)을 그 라운드 승자들이 나눈다.
 * 올라갈수록 사람이 절반씩 줄므로 1인당 상금은 저절로 두 배씩 커진다.
 * 비율을 따로 정하지 않아도 「이길수록 커진다」가 된다. */

export type PrizeRow = { round: number; winners: number; perWinner: number };

export function prizeTable(size: number, entryFee: number, sponsor: number, actualPool?: number): PrizeRow[] {
  const pool = actualPool && actualPool > 0 ? actualPool : entryFee * size + sponsor;
  const rounds = Math.round(Math.log2(size));
  if (rounds < 1) return [];
  const rows: PrizeRow[] = [];
  let round = size;
  for (let r = 0; r < rounds; r++) {
    const winners = round / 2;
    // PostgreSQL 의 정수 나눗셈과 같게 두 번 버린다
    rows.push({ round, winners, perWinner: Math.floor(Math.floor(pool / rounds) / winners) });
    round /= 2;
  }
  return rows;
}

/** 우승자가 받는 합계. 「1등 하면 얼마」를 이 숫자로 보여 준다. */
export function championTotal(rows: PrizeRow[]): number {
  return rows.reduce((n, r) => n + r.perWinner, 0);
}

/** 첫 판을 이기고도 참가비를 못 건지게 되는 설정인가.
 *
 * 32명·참가비 20·출연 700 이면 첫 판 상금이 16점이다 — **이겼는데 4점 손해**다.
 * 사람이 가장 먼저 겪는 것이 첫 판이라 여기서 손해가 나면 대회 전체가 이상하게
 * 느껴진다. 인원이 많을수록 첫 라운드 승자가 많아 1인당이 얇아지기 때문이다. */
export function firstWinLosesMoney(size: number, entryFee: number, sponsor: number): boolean {
  const rows = prizeTable(size, entryFee, sponsor);
  return rows.length > 0 && rows[0].perWinner <= entryFee;
}

/** 첫 판 승리가 참가비를 넘게 하는 **최소 출연 포인트**.
 * 관리자 화면이 "이만큼은 보태셔야 합니다"라고 알려 줄 때 쓴다. */
export function minSponsorFor(size: number, entryFee: number): number {
  if (entryFee <= 0) return 0;
  const rounds = Math.round(Math.log2(size));
  const firstWinners = size / 2;
  // pool / rounds / firstWinners > entryFee 가 되는 가장 작은 pool
  const needPool = (entryFee + 1) * firstWinners * rounds;
  return Math.max(0, needPool - entryFee * size);
}
