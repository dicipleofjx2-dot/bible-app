// 데이빗바이블 중복 계정 합치기.
//
// ── 왜 필요한가 ─────────────────────────────────────────────────────
// 이메일 가입을 닫고 카카오로 모았는데, Supabase 는 **이메일이 같을 때만**
// 카카오를 기존 계정에 붙여 준다. 카카오에 걸린 이메일이 예전 가입 이메일과
// 다르면 같은 사람인 줄 모르고 새 계정이 생긴다. 그래서 한 사람이 계정을
// 둘·셋씩 갖게 되고, 통독 기록과 포인트가 갈라진다.
//
// 0067_claim_previous_account.sql 은 **본인이 직접** 잇는 길이다(예전 계정으로
// 로그인해야 한다). 이 스크립트는 관리자가 뒤늦게 정리하는 길이다.
//
// ── 지키는 규칙 ─────────────────────────────────────────────────────
// 1. **남기는 쪽은 언제나 카카오 계정.** 이메일 가입은 닫혔으므로 앞으로 쓸
//    계정은 카카오 쪽이다.
// 2. **되돌릴 수 있게 한다.** 옮기기 전에 「어느 줄이 원래 누구 것이었는지」를
//    통째로 파일에 남긴다. 짝을 잘못 지었어도 그 파일로 되돌린다.
// 3. **교인(members)은 절대 안 지운다.** 교적이라 한 줄이 사라지면 사람이
//    사라진다. 부딪히면 건너뛰고 알린다.
// 4. **날짜가 열쇠인 표는 새 계정 것이 이긴다**(0067 과 같은 규칙). 통독
//    시작일만은 **이른 쪽**을 살린다 — 안 그러면 기록만 넘어오고 진도는
//    오늘부터 새로 잡혀 본인은 여전히 첫날을 본다.
//
// 쓰는 법:
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... //     node scripts/merge-accounts.mjs            # 미리보기(아무것도 안 바꾼다)
//   ... node scripts/merge-accounts.mjs --apply  # 실제로 옮긴다
//
// 짝은 scripts/merge-accounts.plan.json 에 적는다(모양은 .example.json 참고).
// **그 파일은 git 에 안 올린다** — 교인들의 이메일이 그대로 들어 있다.
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes('--apply');
// 되돌리기 파일은 개인 기록이 통째로 들어 있으므로 **리포 밖**에 쓴다.
const BACKUP_DIR = 'C:/Users/dicip/Documents/_supabase-backup';

if (!BASE || !KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.');
  process.exit(1);
}

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

// 표 → 사람을 가리키는 칸 → 행 하나를 집는 열쇠(기본키).
// PostgREST 의 OpenAPI(/rest/v1/)가 알려 준 기본키를 그대로 적었다. id 가 없는
// 표가 여럿이라(reading_helper_day_records 등) id 로만 집으면 조용히 빗나간다.
const TABLES = [
  ['verse_marks', 'user_id', ['id']],
  ['room_activity', 'user_id', ['id']],
  ['qt_saved_words', 'user_id', ['id']],
  ['purchases', 'user_id', ['id']],
  ['push_subscriptions', 'user_id', ['id']],
  ['app_push_subscriptions', 'user_id', ['id']],
  ['prayer_requests', 'user_id', ['id']],
  ['prayer_comments', 'user_id', ['id']],
  ['prayer_logs', 'user_id', ['id']],
  ['reading_plan_progress', 'user_id', ['id']],
  ['arena_point_ledger', 'user_id', ['id']],
  ['arena_escape_records', 'user_id', ['id']],
  ['arena_tournament_entrants', 'user_id', ['tournament_id', 'user_id']],
  ['reading_helper_day_records', 'user_id', ['user_id', 'date']],
  ['r2m_daily_checkins', 'user_id', ['user_id', 'date']],
  ['r2m_enrollments', 'user_id', ['id']],
  ['r2m_leaders', 'user_id', ['user_id']],
  ['room_messages', 'user_id', ['id']],
  ['room_members', 'user_id', ['id']],
  ['shop_purchases', 'user_id', ['user_id', 'item_id']],
  ['comments', 'user_id', ['id']],
  ['posts', 'user_id', ['id']],
  ['subscriptions', 'user_id', ['id']],
  ['cell_message_cheers', 'user_id', ['message_id', 'user_id']],
  ['cell_messages', 'author_id', ['id']],
  ['cell_reports', 'author_id', ['id']],
  ['cell_notices', 'author_id', ['id']],
  ['board_posts', 'author_id', ['id']],
  ['hub_seen', 'user_id', ['user_id', 'church_id', 'area']],
  ['community_seen', 'user_id', ['user_id']],
  ['reading_helper_progress', 'user_id', ['user_id']],
  ['qt_records', 'user_id', ['id']],
  ['church_join_requests', 'user_id', ['id']],
  ['church_memberships', 'user_id', ['id']],
  ['members', 'user_id', ['id']],
];

const NEVER_DELETE = new Set(['members']);

const plan = JSON.parse(fs.readFileSync(new URL('./merge-accounts.plan.json', import.meta.url), 'utf8'));

async function req(method, url, body) {
  const r = await fetch(`${BASE}/rest/v1/${url}`, {
    method,
    headers: { ...H, Prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* JSON 이 아닐 수 있다 */ }
  return { ok: r.ok, status: r.status, json, text };
}

const eq = (v) => `eq.${encodeURIComponent(v)}`;
const rowFilter = (pk, row) => pk.map((c) => `${c}=${eq(row[c])}`).join('&');

const snapshot = [];
const log = [];

for (const g of plan) {
  let moved = 0, dropped = 0;
  const skipped = [];

  for (const oldId of g.old) {
    for (const [table, col, pk] of TABLES) {
      const got = await req('GET', `${table}?select=*&${col}=${eq(oldId)}`);
      if (!got.ok) { log.push(`  ! ${table} 조회 실패 ${got.status}`); continue; }
      for (const row of got.json ?? []) {
        snapshot.push({ table, pk, col, oldId, newId: g.newId, row });
        if (!APPLY) { moved++; continue; }

        // 통독 시작일 — 이른 쪽을 살린다.
        if (table === 'reading_helper_progress') {
          const cur = await req('GET', `reading_helper_progress?select=*&user_id=${eq(g.newId)}`);
          const mine = cur.json?.[0];
          if (mine) {
            const earliest = [mine.start_date, row.start_date].filter(Boolean).sort()[0];
            if (earliest && earliest !== mine.start_date)
              await req('PATCH', `reading_helper_progress?user_id=${eq(g.newId)}`, { start_date: earliest });
            if ((await req('DELETE', `reading_helper_progress?user_id=${eq(oldId)}`)).ok) dropped++;
            continue;
          }
        }

        const patched = await req('PATCH', `${table}?${rowFilter(pk, row)}`, { [col]: g.newId });
        if (patched.ok) { moved++; continue; }

        const duplicate = patched.status === 409 || /duplicate key|23505/.test(patched.text);
        if (duplicate && !NEVER_DELETE.has(table)) {
          const del = await req('DELETE', `${table}?${rowFilter(pk, row)}`);
          if (del.ok) dropped++;
          else log.push(`  ! ${table} 지우기 실패 ${del.status} ${del.text.slice(0, 120)}`);
        } else {
          skipped.push(`${table}(${patched.status})`);
          log.push(`  ! ${table} 옮기기 실패 ${patched.status} ${patched.text.slice(0, 160)}`);
        }
      }
    }
  }
  log.push(
    `${g.name.padEnd(8)} ${APPLY ? '옮김' : '옮길 것'} ${String(moved).padStart(3)}행` +
    ` · 겹쳐서 버림 ${dropped}행${skipped.length ? ' · 건너뜀 ' + [...new Set(skipped)].join(',') : ''}`,
  );
}

console.log(log.join('\n'));

if (APPLY) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  // **덮어쓰면 안 된다.** 처음에는 날짜만 붙였다가, 같은 날 두 번째로 돌렸을 때
  // 첫 번째 되돌리기 자료(213행)를 30행짜리로 통째로 덮어 버렸다. 되돌릴 자료를
  // 되돌릴 수 없게 만드는 것이 이 스크립트가 할 수 있는 가장 나쁜 짓이다.
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  let file = path.join(BACKUP_DIR, `merge-accounts-rollback-${stamp}.json`);
  for (let n = 2; fs.existsSync(file); n++)
    file = path.join(BACKUP_DIR, `merge-accounts-rollback-${stamp}-${n}.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 1), 'utf8');
  console.log(`\n되돌리기 자료: ${file} (행 ${snapshot.length}개)`);
} else {
  console.log(`\n미리보기 — 옮길 행 ${snapshot.length}개. 실제로 하려면 --apply 를 붙이세요.`);
}
