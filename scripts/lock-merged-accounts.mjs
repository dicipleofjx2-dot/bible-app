// 합쳐서 비운 옛 계정의 **로그인을 막는다**.
//
// ── 왜 필요한가 ─────────────────────────────────────────────────────
// 계정을 합치면 기록은 새 계정으로 가지만, 옛 계정에 **이미 로그인돼 있던
// 휴대폰은 그대로 살아 있다.** 다시 로그인할 필요가 없으므로 `last_sign_in_at`
// 도 안 바뀌어, 겉으로는 아무도 안 쓰는 것처럼 보인다.
//
// 그 휴대폰에서 앱을 열면 그 계정에는 기록이 하나도 없으니 앱이 **처음 온
// 사람으로 보고 통독 진도를 새로 만든다.** 본인 화면에는 포인트 0, 1일차로
// 보인다. 실제로 2026-09-02 에 네 분(김지혜·김희원·은성·김기쁨)이 그렇게 됐다.
//
// 옛 계정은 모두 이메일 전용이고 살아 있는 계정은 카카오다. 그래서 옛 쪽 로그인을
// 막으면 그 휴대폰은 다음에 열 때 로그인 화면으로 떨어지고, 카카오로 들어가면
// 제 기록이 있는 계정에 붙는다.
//
// ── 지우지 않고 막는 이유 ───────────────────────────────────────────
// auth 사용자를 지우면 외래키에 걸려 조용히 실패하기도 하고, 짝을 잘못 지었을 때
// 되돌릴 자리가 없어진다. 막는 것은 한 줄로 되돌릴 수 있다.
//
// 쓰는 법:
//   node scripts/lock-merged-accounts.mjs           # 미리보기
//   node scripts/lock-merged-accounts.mjs --apply   # 실제로 막기
//   node scripts/lock-merged-accounts.mjs --unlock --apply   # 되돌리기
import fs from 'node:fs';

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes('--apply');
const UNLOCK = process.argv.includes('--unlock');
const PLAN_DIR = 'C:/Users/dicip/Documents/_supabase-backup';

if (!BASE || !KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.');
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

// 짝 파일(합칠 때 쓴 것)에서 「비운 쪽」을 읽는다.
const plans = fs.readdirSync(PLAN_DIR)
  .filter((f) => f.startsWith('merge-accounts.plan-') && f.endsWith('.json'))
  .flatMap((f) => JSON.parse(fs.readFileSync(`${PLAN_DIR}/${f}`, 'utf8')));

const targets = plans.flatMap((g) => g.old.map((id) => ({ id, name: g.name, keep: g.keep })));
if (targets.length === 0) {
  console.error('짝 파일을 못 찾았습니다:', PLAN_DIR);
  process.exit(1);
}

const users = (await (await fetch(`${BASE}/auth/v1/admin/users?per_page=200`, { headers: H })).json()).users;
const byId = new Map(users.map((u) => [u.id, u]));

console.log(`${UNLOCK ? '풀' : '막을'} 계정 ${targets.length}개\n`);
let done = 0;
for (const t of targets) {
  const u = byId.get(t.id);
  if (!u) { console.log(`   ? ${t.name} — 계정을 못 찾음 (${t.id})`); continue; }

  const already = Boolean(u.banned_until && new Date(u.banned_until) > new Date());
  const label = `${t.name.padEnd(8)} ${(u.email ?? '').padEnd(34)} → 살릴 계정 ${t.keep}`;

  if (!APPLY) { console.log(`   ${already ? '이미 막힘' : '막을 것 '} ${label}`); continue; }
  if (UNLOCK === already) {
    // 막으려는데 이미 막혔거나, 풀려는데 이미 풀렸으면 건드리지 않는다.
    if (!UNLOCK && already) { console.log(`   그대로 ${label}`); continue; }
  }

  const r = await fetch(`${BASE}/auth/v1/admin/users/${t.id}`, {
    method: 'PUT', headers: H,
    // 100년. GoTrue 는 기간으로만 받는다. 'none' 이면 풀린다.
    body: JSON.stringify({ ban_duration: UNLOCK ? 'none' : '876000h' }),
  });
  if (r.ok) { done++; console.log(`   ${UNLOCK ? '품' : '막음'}  ${label}`); }
  else console.log(`   ✗ ${label} — ${r.status} ${(await r.text()).slice(0, 120)}`);
}

console.log(APPLY ? `\n${UNLOCK ? '푼' : '막은'} 계정 ${done}개` : '\n미리보기 — 실제로 하려면 --apply');
