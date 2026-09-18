#!/usr/bin/env node
/**
 * 마이그레이션 한 개를 Supabase 에 실행한다.
 *
 * 지금까지는 SQL Editor 에 사람이 손으로 붙여 넣었다. 0084 는 580줄이라
 * 붙여 넣다 한 줄이 잘리면 표 하나가 빠진 채로 돌아간다 — 그래서 파일을
 * 그대로 보내는 길을 만들었다.
 *
 * **Supabase Management API 를 쓴다**(HTTPS 하나, 새 묶음 없음). Postgres 로
 * 바로 붙는 길(psql, pg)은 5432 포트가 막힌 곳이 많고 라이브러리도 새로
 * 깔아야 한다. 여기 쓰는 `/database/query` 는 여러 문장을 한 번에 받으므로
 * 문장을 쪼갤 필요도 없다 — 쪼개다 `$$ ... $$` 안의 세미콜론에서 틀어지는
 * 사고를 애초에 안 만든다.
 *
 * 쓰는 법 — 두 가지 (프로젝트 뿌리에서)
 *
 * ① 내 컴퓨터에서 (토큰을 내가 들고 있는 경우)
 *   1) https://supabase.com/dashboard/account/tokens 에서 토큰을 하나 만든다
 *   2) .env 에 한 줄 더한다 (이 파일은 git 에 안 올라간다)
 *        SUPABASE_ACCESS_TOKEN=sbp_...
 *   3) node scripts/apply-migration.mjs 0084_growth_school.sql
 *   끝나면 토큰은 지워도 된다(2번 줄을 지우고 대시보드에서 revoke).
 *
 * ② 클라우드 세션(Claude)이 대신 실행하는 경우 — `--proxy-auth`
 *   토큰을 세션에 주지 않는다. claude.ai/code 의 환경 설정에 API 자격증명으로
 *   걸어 두면, 프록시가 요청이 VM 을 떠난 뒤에 Authorization 헤더를 붙인다.
 *   **세션은 토큰을 한 번도 보지 못한다** — 그래서 대화 기록에도, 파일에도,
 *   환경 변수에도 남지 않는다. 그때는 이렇게 부른다:
 *
 *        node scripts/apply-migration.mjs 0084_growth_school.sql --proxy-auth --yes
 *
 *   `SUPABASE_PROJECT_REF` 만 있으면 된다(또는 EXPO_PUBLIC_SUPABASE_URL).
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const ROOT = path.resolve(import.meta.dirname, '..');

/** .env 를 읽는다. dotenv 를 새로 깔지 않으려고 직접 읽는다(형식이 단순하다). */
function readEnv() {
  const out = { ...process.env };
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // 이미 환경에 있는 값이 이긴다 — 한 번만 다른 프로젝트에 쏘고 싶을 때가 있다.
    if (!(key in out)) out[key] = value;
  }
  return out;
}

/**
 * 데이빗바이블의 Supabase 프로젝트.
 *
 * 비밀이 아니다 — 이 주소는 이미 배포된 웹 번들 안에 anon 키와 함께 들어 있다
 * (열쇠는 RLS 뒤에 있으므로 주소를 안다고 열리지 않는다). 여기 적어 두는 것은
 * `.env` 가 없는 곳(새로 뜬 클라우드 세션)에서도 명령 한 줄로 돌리기 위해서다.
 */
const DEFAULT_REF = 'bhqbrkeoiyhnmdgvofvy';

function projectRef(env, argv) {
  const flag = argv.find((a) => a.startsWith('--project='));
  if (flag) return flag.slice('--project='.length);
  if (env.SUPABASE_PROJECT_REF) return env.SUPABASE_PROJECT_REF;
  const url = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const m = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m ? m[1] : DEFAULT_REF;
}

async function query(ref, token, sql) {
  // token 이 null 이면 헤더를 아예 넣지 않는다 — 프록시가 붙여 준다(--proxy-auth).
  // 빈 문자열이라도 넣으면 프록시가 「이미 있다」고 보고 그냥 흘려보내, 401 이
  // 나면서 원인이 안 보인다.
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      detail = JSON.parse(text).message ?? text;
    } catch {}
    throw new Error(`${res.status} ${detail}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

async function main() {
  const args = process.argv.slice(2);
  const yes = args.includes('--yes');
  const proxyAuth = args.includes('--proxy-auth');
  const name = args.find((a) => !a.startsWith('--'));

  if (!name) {
    console.error('쓰는 법: node scripts/apply-migration.mjs 0084_growth_school.sql [--yes] [--proxy-auth] [--project=<ref>]');
    process.exit(1);
  }

  const env = readEnv();
  const token = proxyAuth ? null : env.SUPABASE_ACCESS_TOKEN;
  const ref = projectRef(env, args);

  if (!proxyAuth && !token) {
    console.error('SUPABASE_ACCESS_TOKEN 이 없습니다.');
    console.error('  1) https://supabase.com/dashboard/account/tokens 에서 토큰을 만들고');
    console.error('  2) .env 에  SUPABASE_ACCESS_TOKEN=sbp_...  한 줄을 더하세요.');
    process.exit(1);
  }
  if (!ref) {
    console.error('프로젝트를 알 수 없습니다. .env 의 EXPO_PUBLIC_SUPABASE_URL 또는 SUPABASE_PROJECT_REF 를 확인하세요.');
    process.exit(1);
  }

  const file = path.join(ROOT, 'supabase', 'migrations', name.endsWith('.sql') ? name : `${name}.sql`);
  if (!fs.existsSync(file)) {
    console.error(`파일이 없습니다: ${file}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(file, 'utf8');

  console.log(`프로젝트 : ${ref}`);
  console.log(`인증     : ${proxyAuth ? '프록시가 붙임 (이 세션은 토큰을 모른다)' : '.env 의 토큰'}`);
  console.log(`파일     : ${path.basename(file)} (${sql.split('\n').length}줄)`);

  if (!yes) {
    const answer = await ask('이 SQL 을 실행합니다. 계속할까요? (y/N) ');
    if (answer.toLowerCase() !== 'y') {
      console.log('그만두었습니다.');
      process.exit(0);
    }
  }

  try {
    await query(ref, token, sql);
    console.log('실행했습니다.');
  } catch (e) {
    console.error('실행하지 못했습니다:', e.message);
    process.exit(1);
  }

  // 정말 섰는지 되묻는다. 「실행됐다」는 말만 믿고 넘어가면, 권한이 모자라
  // 조용히 아무것도 안 만들어진 경우를 못 잡는다.
  const prefix = path.basename(file).replace(/^\d+_/, '').replace(/\.sql$/, '').split('_')[0];
  const rows = await query(
    ref,
    token,
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_name like '${prefix}%'
      order by table_name;`,
  );
  if (Array.isArray(rows) && rows.length) {
    console.log(`선 표 ${rows.length}개: ${rows.map((r) => r.table_name).join(', ')}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
