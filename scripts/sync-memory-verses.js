/**
 * 암송구절만 서버에 맞춰 넣는다 — 한글(krv)과 영어(open_en) 둘 다.
 *
 * ## 왜 전체 업로드 스크립트를 쓰지 않는가
 *
 * 서버의 한글 문항은 파일과 다르다. 단답형 169개를 객관식으로 바꾼 일이 서버에만
 * 반영되어 있고 파일에는 안 돌아왔다. 그래서 `upload-reading-helper-content.js` 로
 * 다시 올리면 **그 개선이 통째로 되돌아간다.** 암송구절 하나 고치자고 그럴 수는 없다.
 *
 * 이 스크립트는 `memory_verse` 와 `memory_verse_en` **두 칸만** 건드린다.
 * 요약도 문항도 손대지 않는다.
 *
 * ## 본문은 사람이 옮기지 않는다
 *
 * 절 번호만 한글 콘텐츠 파일에서 읽고, 본문은 앱이 쓰는 bible.db 에서 그대로
 * 가져온다(한글 krv, 영어 open_en). 화면에서 읽는 본문과 암송하는 본문이 글자
 * 하나까지 같아야 하기 때문이다.
 *
 * 사용법:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-memory-verses.js
 */

const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const SUPABASE_URL = 'https://bhqbrkeoiyhnmdgvofvy.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}
if (!/^[\x20-\x7E]+$/.test(SERVICE_KEY)) {
  console.error('SUPABASE_SERVICE_ROLE_KEY 에 영문·숫자가 아닌 글자가 들어 있습니다.');
  console.error('안내문의 「여기에키」를 실제 키로 바꾸셨는지 보세요.');
  process.exit(1);
}

const FILES = [
  'genesis-01-12', 'genesis-13-29', 'genesis-30-40', 'genesis-41-50',
  'exodus-01-20', 'exodus-21-40', 'leviticus-01-11',
];

const BIBLE_DB_PATH = path.join(__dirname, '..', 'assets', 'bible-data', 'bible.db');
const bibleDb = new DatabaseSync(BIBLE_DB_PATH, { readOnly: true });
const verseStmt = bibleDb.prepare(
  'select text from verses where book_id=? and chapter=? and verse=? and translation=?'
);

const BOOK_NAMES_KO = ['창세기', '출애굽기', '레위기'];
const BOOK_NAMES_EN = ['Genesis', 'Exodus', 'Leviticus'];

const updates = [];
const problems = [];

for (const name of FILES) {
  for (const c of require('./content/' + name + '.js')) {
    if (!c.memoryVerse) continue;
    const ko = verseStmt.get(c.book, c.chapter, c.memoryVerse, 'krv');
    const en = verseStmt.get(c.book, c.chapter, c.memoryVerse, 'open_en');
    if (!ko || !en) {
      problems.push(`${c.book}:${c.chapter}:${c.memoryVerse} — ${!ko ? '한글' : '영어'} 본문을 못 찾았습니다.`);
      continue;
    }
    updates.push({
      book_id: c.book,
      chapter: c.chapter,
      memory_verse: {
        reference: `${BOOK_NAMES_KO[c.book - 1]} ${c.chapter}:${c.memoryVerse}`,
        text: ko.text,
      },
      memory_verse_en: {
        reference: `${BOOK_NAMES_EN[c.book - 1]} ${c.chapter}:${c.memoryVerse}`,
        text: en.text,
      },
    });
  }
}

if (problems.length > 0) {
  console.error('본문을 못 찾아 올리지 않았습니다:\n');
  for (const p of problems) console.error('  ·', p);
  process.exit(1);
}

(async () => {
  let done = 0;
  for (const u of updates) {
    const { book_id, chapter, ...patch } = u;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/reading_helper_chapter_content` +
        `?book_id=eq.${book_id}&chapter=eq.${chapter}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(patch),
      }
    );
    const body = await res.text();
    if (!res.ok) {
      console.error(`${book_id}:${chapter} 실패 ${res.status}`, body.slice(0, 300));
      process.exit(1);
    }
    // PATCH 는 맞는 행이 없어도 200 에 빈 배열을 준다. 조용히 아무것도 안 하는 것을
    // 성공으로 세면, 다 넣었다고 하고서 화면엔 여전히 암송구절이 없다.
    if (JSON.parse(body).length === 0) {
      console.error(`${book_id}:${chapter} — 그 장의 행이 아직 없습니다. 한글 콘텐츠부터 올리세요.`);
      process.exit(1);
    }
    done += 1;
  }
  console.log(`암송구절 ${done}장을 한글·영어 둘 다 맞췄습니다.`);
})();
