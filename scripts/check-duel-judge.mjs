// 겨루기 승패 판정을 확인한다. 두 사람이 실제로 붙어 보기 전에 규칙부터 맞는지
// 재는 것 — 이 판정이 틀리면 상금이 걸린 대결에서 엉뚱한 사람이 이긴다.
//
//   node scripts/check-duel-judge.mjs
import { readFileSync } from 'node:fs';

const src = readFileSync('C:/Users/dicip/Documents/BibleApp/src/lib/arena/duel.ts', 'utf8')
  .replace(/^import .*$/gm, '')
  // 타입과 supabase 를 쓰는 부분은 걷어낸다. 판정 함수만 있으면 된다.
  .replace(/export type [\s\S]*?\n};\n/g, '')
  .replace(/export async function[\s\S]*?\n}\n/g, '')
  .replace(/export type Verdict.*\n/, '')
  // 남은 함수의 타입 주석을 걷어낸다 — judge(s: DuelState): Verdict → judge(s)
  .replace(/\((\w+): \w+\): \w+/g, '($1)')
  .replace(/const (\w+) = s\.(\w+) \?\? 0;/g, 'const $1 = s.$2 ?? 0;');

const mod = await import('data:text/javascript;base64,' + Buffer.from(src, 'utf8').toString('base64'));
const { judge } = mod;

let fail = 0;
function check(name, state, expected) {
  const got = judge(state);
  if (got === expected) {
    console.log(`  ✓ ${name} → ${got}`);
  } else {
    console.log(`  ✗ ${name} → ${got} (${expected} 이어야 함)`);
    fail++;
  }
}

const S = (o) => ({
  my_escaped: null,
  my_seconds_left: null,
  opponent_escaped: null,
  opponent_seconds_left: null,
  my_step: 0,
  opponent_step: 0,
  ...o,
});

console.log('겨루기 승패 판정\n');

check('상대가 아직 안 끝냈다', S({ my_escaped: true, my_seconds_left: 100 }), 'waiting');
check('내가 아직 안 끝냈다', S({ opponent_escaped: true, opponent_seconds_left: 100 }), 'waiting');

check(
  '나만 나왔다',
  S({ my_escaped: true, my_seconds_left: 10, opponent_escaped: false, opponent_seconds_left: 0 }),
  'win'
);
check(
  '상대만 나왔다',
  S({ my_escaped: false, my_seconds_left: 0, opponent_escaped: true, opponent_seconds_left: 1 }),
  'lose'
);

check(
  '둘 다 나왔고 내가 더 남겼다',
  S({ my_escaped: true, my_seconds_left: 120, opponent_escaped: true, opponent_seconds_left: 119 }),
  'win'
);
check(
  '둘 다 나왔고 상대가 더 남겼다',
  S({ my_escaped: true, my_seconds_left: 118, opponent_escaped: true, opponent_seconds_left: 119 }),
  'lose'
);
check(
  '둘 다 나왔고 초까지 같다',
  S({ my_escaped: true, my_seconds_left: 100, opponent_escaped: true, opponent_seconds_left: 100 }),
  'draw'
);

check(
  '둘 다 못 나왔고 내가 더 갔다',
  S({ my_escaped: false, opponent_escaped: false, my_step: 3, opponent_step: 1 }),
  'win'
);
check(
  '둘 다 못 나왔고 상대가 더 갔다',
  S({ my_escaped: false, opponent_escaped: false, my_step: 0, opponent_step: 2 }),
  'lose'
);
check(
  '둘 다 못 나왔고 같은 데서 멈췄다',
  S({ my_escaped: false, opponent_escaped: false, my_step: 2, opponent_step: 2 }),
  'draw'
);

// 탈출 실패는 0점으로 저장되므로 seconds_left 가 남아 있어도 「못 나온 것」이다
check(
  '실패한 판의 남은 시간은 승부에 못 쓴다',
  S({ my_escaped: false, my_seconds_left: 200, opponent_escaped: true, opponent_seconds_left: 1 }),
  'lose'
);

console.log(fail === 0 ? '\n통과 — 문제 없음' : `\n${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
