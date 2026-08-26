// 대진표 시드 배정을 확인한다.
//
// 0062 마이그레이션의 arena_tournament_start_bracket 안에 있는 알고리즘을 그대로
// 옮겨 와 돌린다. 이게 틀리면 **예선 1위와 2위가 16강에서 만난다** — 대회가
// 열리고 나서야 알게 되고, 그때는 되돌릴 수 없다.
//
//   node scripts/check-bracket-seeding.mjs

/** 0062 의 while 문과 같은 것: [1] 에서 시작해 매번 뒤집어 붙인다. */
function seedOrder(size) {
  let seeds = [1];
  while (seeds.length < size) {
    const m = seeds.length * 2 + 1;
    const next = [];
    for (const s of seeds) {
      next.push(s, m - s);
    }
    seeds = next;
  }
  return seeds;
}

let fail = 0;
const bad = (msg) => {
  console.log('  ✗ ' + msg);
  fail++;
};

/** 상위 시드가 언제나 이긴다고 보고 끝까지 돌린다. */
function simulate(size) {
  const seeds = seedOrder(size);
  const rounds = [];
  let players = seeds;
  while (players.length > 1) {
    const matches = [];
    for (let i = 0; i < players.length; i += 2) matches.push([players[i], players[i + 1]]);
    rounds.push(matches);
    players = matches.map(([a, b]) => Math.min(a, b));
  }
  return { rounds, champion: players[0] };
}

for (const size of [4, 8, 16, 32]) {
  console.log(`\n[${size}명]`);
  const seeds = seedOrder(size);

  // 1) 모든 시드가 한 번씩 들어 있는가
  const sorted = [...seeds].sort((a, b) => a - b);
  const expected = Array.from({ length: size }, (_, i) => i + 1);
  if (JSON.stringify(sorted) !== JSON.stringify(expected)) {
    bad(`시드가 빠지거나 겹쳤다: ${seeds}`);
  }

  // 2) 첫 경기는 언제나 1위 vs 꼴찌
  if (seeds[0] !== 1 || seeds[1] !== size) bad(`첫 경기가 1 vs ${size} 가 아니다: ${seeds[0]} vs ${seeds[1]}`);

  // 3) 모든 첫 라운드 경기에서 두 시드의 합이 size+1 이어야 한다
  //    (1-32, 2-31, … 이 되도록 짝지어졌다는 뜻)
  for (let i = 0; i < seeds.length; i += 2) {
    if (seeds[i] + seeds[i + 1] !== size + 1) {
      bad(`${i / 2 + 1}번 경기의 짝이 어긋났다: ${seeds[i]} vs ${seeds[i + 1]}`);
    }
  }

  const { rounds, champion } = simulate(size);
  console.log(`  1라운드: ${rounds[0].map(([a, b]) => `${a}-${b}`).join(' · ')}`);

  // 4) 상위 시드가 다 이기면 1위가 우승해야 한다
  if (champion !== 1) bad(`상위 시드가 다 이겼는데 우승이 ${champion} 이다`);

  // 5) **결승에 1위와 2위가 만나야 한다** — 이 검사가 이 파일의 존재 이유다
  const final = rounds[rounds.length - 1][0];
  if (!(final.includes(1) && final.includes(2))) {
    bad(`결승이 1 vs 2 가 아니다: ${final[0]} vs ${final[1]}`);
  } else {
    console.log(`  결승: ${final[0]} vs ${final[1]} ✓`);
  }

  // 6) 준결승에는 상위 넷이 있어야 한다
  if (rounds.length >= 2) {
    const semi = rounds[rounds.length - 2].flat().sort((a, b) => a - b);
    const topFour = [1, 2, 3, 4].slice(0, semi.length);
    if (JSON.stringify(semi) !== JSON.stringify(topFour)) {
      bad(`준결승에 상위 넷이 아니라 ${semi} 가 올라왔다`);
    } else {
      console.log(`  준결승: ${semi.join(', ')} ✓`);
    }
  }
}

console.log(fail === 0 ? '\n통과 — 문제 없음' : `\n${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
