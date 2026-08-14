/**
 * 성경통독도우미 콘텐츠를 Supabase(reading_helper_chapter_content)에 올린다.
 *
 * 콘텐츠는 "몇째 날"이 아니라 "성경 몇 장"에 붙는다 — 통독 계획이 주일 5장·평일 3장이라
 * 시작 요일이 다르면 같은 Day가 다른 본문을 가리키기 때문이다(0034 마이그레이션 참고).
 *
 * 암송구절 본문은 저장소에 이미 있는 공개 번역(openbible_ko.json)에서 가져온다.
 * 개역개정은 저작권이 있어 쓰지 않는다.
 *
 * 사용법:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-reading-helper-content.js content/genesis-01-12.js
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://bhqbrkeoiyhnmdgvofvy.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const contentPath = process.argv[2];
if (!contentPath) {
  console.error('콘텐츠 파일 경로를 인자로 주세요.');
  process.exit(1);
}

const { DatabaseSync } = require('node:sqlite');

const BOOK_NAMES = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'bible-source-data/book-names-ko.json'), 'utf8')
);

// 암송구절 본문은 앱이 쓰는 성경 DB에서 그대로 가져온다. 화면에서 읽는 본문과
// 암송하는 본문이 글자 하나까지 같아야 하기 때문이다.
// 참고: node:sqlite는 경로에 따라 열리지 않는 일이 있어 Windows 절대경로로 연다.
const BIBLE_DB_PATH = path.join(__dirname, '..', 'assets', 'bible-data', 'bible.db');
const MEMORY_VERSE_TRANSLATION = process.env.MEMORY_VERSE_TRANSLATION ?? 'krv';
const bibleDb = new DatabaseSync(BIBLE_DB_PATH, { readOnly: true });
const verseStmt = bibleDb.prepare(
  'select text from verses where book_id=? and chapter=? and verse=? and translation=?'
);

function bookName(bookId) {
  // book-names-ko.json이 배열이든 객체든 받아준다
  if (Array.isArray(BOOK_NAMES)) return BOOK_NAMES[bookId - 1];
  return BOOK_NAMES[String(bookId)] ?? BOOK_NAMES[bookId];
}

/** 성경 DB에서 한 구절을 꺼낸다. 없으면 던진다 — 조용히 빈 구절이 올라가면
 * 암송 퍼즐이 빈 화면이 된다. */
function verseText(bookId, chapter, verse) {
  const row = verseStmt.get(bookId, chapter, verse, MEMORY_VERSE_TRANSLATION);
  if (!row?.text) {
    throw new Error(
      `구절을 찾을 수 없습니다: ${bookId}권 ${chapter}장 ${verse}절 (${MEMORY_VERSE_TRANSLATION})`
    );
  }
  return String(row.text).trim();
}

async function main() {
  const entries = require(path.resolve(contentPath));
  const rows = entries.map((entry) => {
    const name = bookName(entry.book);
    if (!name) throw new Error(`책 이름을 찾을 수 없습니다: bookId=${entry.book}`);
    if (!entry.summary?.trim()) throw new Error(`요약이 비었습니다: ${name} ${entry.chapter}장`);

    return {
      book_id: entry.book,
      chapter: entry.chapter,
      book_name: name,
      summary: entry.summary.trim(),
      // 문항 번호는 하루치로 합칠 때 다시 매겨지므로 여기서는 장 안에서만 붙인다
      questions: entry.questions.map((q, i) => ({ ...q, id: i + 1 })),
      memory_verse: entry.memoryVerse
        ? {
            reference: `${name} ${entry.chapter}:${entry.memoryVerse}`,
            text: verseText(entry.book, entry.chapter, entry.memoryVerse),
          }
        : null,
      updated_at: new Date().toISOString(),
    };
  });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/reading_helper_chapter_content`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    console.error('업로드 실패:', res.status, await res.text());
    process.exit(1);
  }

  const totalQuestions = rows.reduce((sum, r) => sum + r.questions.length, 0);
  console.log(`올림: ${rows.length}개 장, 문항 ${totalQuestions}개`);
  for (const r of rows) {
    console.log(
      `  ${r.book_name} ${r.chapter}장 — 문항 ${r.questions.length}, 암송 ${r.memory_verse?.reference ?? '없음'}`
    );
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
