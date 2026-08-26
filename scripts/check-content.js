/**
 * 통독도우미 콘텐츠가 성한지 한 번에 본다.
 *
 *   node scripts/check-content.js
 *
 * 콘텐츠는 세 군데에 흩어져 있다 — 한글 파일, 영어 파일, 그리고 **서버**. 앱이
 * 읽는 것은 서버다. 그래서 눈으로 확인할 수 없는 어긋남이 조용히 생긴다:
 *
 *  · 한글은 올렸는데 영어를 안 올린 장
 *  · 한국어로는 객관식인데 영어로는 단답형인 문항 (실제로 169개 있었다)
 *  · 암송구절이 연달아 비어 그 사흘이 통째로 하루가 되는 날
 *  · 파일이 서버보다 뒤처져, 다시 올리면 개선이 되돌아가는 상태
 *
 * 콘텐츠를 채우거나 고친 뒤에는 이것부터 돌린다.
 */
const fs = require('fs');
const path = require('path');
const { serviceKey } = require('./lib/service-key');

const SUPABASE_URL = 'https://bhqbrkeoiyhnmdgvofvy.supabase.co';
const { key: SERVICE_KEY, where } = serviceKey();
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

const CONTENT_DIR = path.join(__dirname, 'content');
const EN_DIR = path.join(__dirname, 'content-en');
const { BIBLE_BOOKS } = (() => {
  // bibleBooks.ts 는 TypeScript 라 require 할 수 없다. 장수만 뽑아 쓴다.
  const src = fs.readFileSync(path.join(__dirname, '..', 'src/lib/readingHelper/bibleBooks.ts'), 'utf8');
  const books = [...src.matchAll(/\{\s*id:\s*(\d+),\s*name:\s*'([^']+)',[^}]*chapters:\s*(\d+)/g)].map((m) => ({
    id: Number(m[1]),
    name: m[2],
    chapters: Number(m[3]),
  }));
  return { BIBLE_BOOKS: books };
})();

const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.js'));
let bad = 0;
const problem = (m) => { console.log('  · ' + m); bad += 1; };

(async () => {
  // ── 서버에 무엇이 있는가 ────────────────────────────────────
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/reading_helper_chapter_content` +
      `?select=book_id,chapter,summary,summary_en,questions,questions_en,memory_verse,memory_verse_en` +
      `&order=book_id,chapter`,
    { headers: H }
  );
  if (!res.ok) {
    console.error('조회 실패', res.status, (await res.text()).slice(0, 200));
    process.exitCode = 1;
    return;
  }
  const rows = await res.json();
  const server = new Map(rows.map((r) => [`${r.book_id}:${r.chapter}`, r]));
  console.log(`키: ${where}`);
  console.log(`서버에 있는 장 ${rows.length}개\n`);

  // ── 1. 영어가 빠진 장 ───────────────────────────────────────
  console.log('■ 영어');
  const noEn = rows.filter((r) => !r.summary_en || !(r.questions_en ?? []).length);
  if (noEn.length) {
    problem(`영어가 없는 장 ${noEn.length}개 — ${noEn.slice(0, 8).map((r) => r.book_id + ':' + r.chapter).join(', ')}${noEn.length > 8 ? ' …' : ''}`);
  } else {
    console.log(`  모든 장에 영어가 있습니다 (${rows.length}장)`);
  }

  // ── 2. 한글·영어 문항이 같은 문제인가 ───────────────────────
  const typeGaps = [];
  for (const r of rows) {
    const ko = r.questions ?? [], en = r.questions_en ?? [];
    if (!en.length) continue;
    if (ko.length !== en.length) { typeGaps.push(`${r.book_id}:${r.chapter} 문항 수 ${ko.length}↔${en.length}`); continue; }
    ko.forEach((q, i) => {
      if (q.type !== en[i].type) typeGaps.push(`${r.book_id}:${r.chapter} ${i + 1}번 ${q.type}↔${en[i].type}`);
      else if (q.type === 'choice' && q.correctIndex !== en[i].correctIndex)
        typeGaps.push(`${r.book_id}:${r.chapter} ${i + 1}번 정답자리 ${q.correctIndex}↔${en[i].correctIndex}`);
    });
  }
  if (typeGaps.length) problem(`한글과 영어가 다른 문항 ${typeGaps.length}개 — ${typeGaps.slice(0, 5).join(' / ')}${typeGaps.length > 5 ? ' …' : ''}`);
  else console.log('  한글과 영어가 같은 문제입니다 (유형·정답 자리)');

  // ── 3. 파일이 서버보다 뒤처졌는가 ───────────────────────────
  console.log('\n■ 파일 ↔ 서버');
  const stale = [];
  for (const f of files) {
    for (const c of require(path.join(CONTENT_DIR, f))) {
      const r = server.get(`${c.book}:${c.chapter}`);
      if (!r) continue;
      (r.questions ?? []).forEach((q, i) => {
        const mine = c.questions[i];
        if (q?.type === 'choice' && mine?.type === 'short') stale.push(`${c.book}:${c.chapter} ${i + 1}번`);
      });
    }
  }
  if (stale.length) {
    console.log(`  한글 파일이 서버보다 뒤처진 문항 ${stale.length}개 (서버는 객관식, 파일은 단답형)`);
    console.log('    → 한글을 다시 올리면 스크립트가 멈춥니다. 그게 맞습니다.');
  } else {
    console.log('  한글 파일과 서버가 같습니다');
  }

  // ── 4. 암송구절이 통째로 빈 날 ──────────────────────────────
  console.log('\n■ 암송구절');
  const hasVerse = new Set(rows.filter((r) => r.memory_verse?.text).map((r) => `${r.book_id}:${r.chapter}`));
  const noEnVerse = rows.filter((r) => r.memory_verse?.text && !r.memory_verse_en?.text);
  if (noEnVerse.length) problem(`한글은 있는데 영어가 없는 암송구절 ${noEnVerse.length}개 → node scripts/sync-memory-verses.js`);

  const all = [];
  for (const b of BIBLE_BOOKS) for (let c = 1; c <= b.chapters; c += 1) all.push(`${b.id}:${c}`);
  const covered = new Set(server.keys());
  const emptyDays = new Set();
  for (let startWeekday = 0; startWeekday < 7; startWeekday += 1) {
    let idx = 0;
    for (let day = 1; idx < all.length; day += 1) {
      const isSunday = (startWeekday + day - 1) % 7 === 0;
      const chapters = all.slice(idx, idx + (isSunday ? 5 : 3));
      idx += chapters.length;
      if (!chapters.every((c) => covered.has(c))) continue;
      if (chapters.some((c) => hasVerse.has(c))) continue;
      emptyDays.add(chapters.join(' '));
    }
  }
  if (emptyDays.size) problem(`암송구절이 통째로 비는 날 ${emptyDays.size}가지 — ${[...emptyDays].slice(0, 3).join(' | ')}`);
  else console.log(`  빈 날 없음 (구절이 있는 장 ${hasVerse.size}개)`);

  // ── 5. 선두 독자보다 얼마나 앞서 있는가 ─────────────────────
  console.log('\n■ 여유');
  const pr = await fetch(`${SUPABASE_URL}/rest/v1/reading_helper_progress?select=start_date&order=start_date&limit=1`, { headers: H });
  if (!pr.ok) {
    console.log('  진도를 읽지 못했습니다 (' + pr.status + ')');
  } else {
    const [first] = await pr.json();
    if (!first) console.log('  아직 통독을 시작한 사람이 없습니다');
    else {
      // 연속으로 채워진 마지막 지점까지가 실제로 쓸 수 있는 분량이다.
      let filled = 0;
      for (const k of all) { if (!covered.has(k)) break; filled += 1; }

      const start = new Date(first.start_date + 'T00:00:00');
      const today = new Date();
      let read = 0;
      for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) read += d.getDay() === 0 ? 5 : 3;

      const ahead = filled - read;
      console.log(`  선두 독자 시작 ${first.start_date} · 오늘까지 ${read}장`);
      console.log(`  연속으로 채워진 장 ${filled}개 → ${ahead}장 앞서 있습니다 (약 ${Math.floor(ahead / 3.3)}일치)`);
      if (ahead < 23) problem('한 주치(23장)도 안 남았습니다. 콘텐츠를 채우세요.');
    }
  }

  console.log('');
  console.log(bad === 0 ? '이상 없음' : `살펴볼 것 ${bad}건`);
  if (bad > 0) process.exitCode = 1;
})();
