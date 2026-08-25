/**
 * 통독도우미 콘텐츠의 **영어판**을 올린다(summary_en / questions_en / memory_verse_en).
 *
 * 한글판(scripts/content/*.js)은 이미 올라가 있고, 이 스크립트는 그 행에
 * 영어 칸만 채워 넣는다. 행을 새로 만들지 않는다 — 없는 장을 만나면 건너뛰고
 * 알려 준다. 한글 없이 영어만 있는 장이 생기면 한국어로 보는 분에게 빈 화면이
 * 된다.
 *
 * ## 문항은 짝이 맞아야 한다
 *
 * 앱은 한글·영어 문항을 **자리(index)로** 짝지어 쓴다. 개수가 다르면 그대로
 * 멈춘다 — 조용히 올리면 3번 문제의 해설이 4번 문제에 붙는다.
 *
 * ## 암송구절은 번역하지 않는다
 *
 * 성경 본문이라 사람이 옮길 것이 아니다. 앱이 쓰는 성경 DB 에서 **오픈성경
 * 영어(open_en)** 를 그대로 가져온다. 화면에서 읽는 영어 본문과 암송하는 본문이
 * 글자 하나까지 같아야 하기 때문이다(한글판이 krv 를 쓰는 것과 같은 이유).
 *
 * 사용법:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-reading-helper-content-en.js content-en/genesis-01-12.js
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const SUPABASE_URL = 'https://bhqbrkeoiyhnmdgvofvy.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const enPath = process.argv[2];
if (!enPath) {
  console.error('영어 콘텐츠 파일 경로를 인자로 주세요. (예: content-en/genesis-01-12.js)');
  process.exit(1);
}

const enFull = path.resolve(__dirname, enPath);
const koFull = enFull.replace(
  path.sep + 'content-en' + path.sep,
  path.sep + 'content' + path.sep
);

if (!fs.existsSync(koFull)) {
  console.error('짝이 되는 한글 파일이 없습니다:', koFull);
  process.exit(1);
}

const enChapters = require(enFull);
const koChapters = require(koFull);

// ── 영어 성경 본문 ─────────────────────────────────────────────
const BIBLE_DB_PATH = path.join(__dirname, '..', 'assets', 'bible-data', 'bible.db');
const EN_TRANSLATION = process.env.MEMORY_VERSE_TRANSLATION_EN ?? 'open_en';
const bibleDb = new DatabaseSync(BIBLE_DB_PATH, { readOnly: true });
const verseStmt = bibleDb.prepare(
  'select text from verses where book_id=? and chapter=? and verse=? and translation=?'
);

const BOOK_NAMES_EN = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah',
  'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians',
  '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians',
  '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

// ── 짝 맞추기 ──────────────────────────────────────────────────
const koByKey = new Map(koChapters.map((c) => [`${c.book}:${c.chapter}`, c]));

const problems = [];
const updates = [];

for (const en of enChapters) {
  const key = `${en.book}:${en.chapter}`;
  const ko = koByKey.get(key);

  if (!ko) {
    problems.push(`${key} — 한글 쪽에 없는 장입니다.`);
    continue;
  }

  const koCount = (ko.questions ?? []).length;
  const enCount = (en.questions ?? []).length;
  if (koCount !== enCount) {
    problems.push(`${key} — 문항 수가 다릅니다. 한글 ${koCount}개, 영어 ${enCount}개.`);
    continue;
  }

  // 문제 유형까지 같아야 한다. 객관식이 단답형으로 바뀌면 앱이 다른 화면을 그린다.
  for (let i = 0; i < koCount; i += 1) {
    if (ko.questions[i].type !== en.questions[i].type) {
      problems.push(
        `${key} — ${i + 1}번 문제 유형이 다릅니다. 한글 ${ko.questions[i].type}, 영어 ${en.questions[i].type}.`
      );
    }
    if (
      ko.questions[i].type === 'choice' &&
      ko.questions[i].correctIndex !== en.questions[i].correctIndex
    ) {
      problems.push(
        `${key} — ${i + 1}번 문제의 정답 위치가 다릅니다. 한글 ${ko.questions[i].correctIndex}, 영어 ${en.questions[i].correctIndex}.`
      );
    }
  }

  // 암송구절 — 절 번호는 한글 쪽이 가진 것을 그대로 쓴다. 두 군데 적으면 어긋난다.
  let memoryVerseEn = null;
  if (ko.memoryVerse) {
    const row = verseStmt.get(en.book, en.chapter, ko.memoryVerse, EN_TRANSLATION);
    if (!row) {
      problems.push(
        `${key} — 영어 암송구절 본문을 찾지 못했습니다(${EN_TRANSLATION} ${en.chapter}:${ko.memoryVerse}).`
      );
    } else {
      memoryVerseEn = {
        reference: `${BOOK_NAMES_EN[en.book - 1]} ${en.chapter}:${ko.memoryVerse}`,
        text: row.text,
      };
    }
  }

  updates.push({
    book_id: en.book,
    chapter: en.chapter,
    summary_en: en.summary,
    // id 는 앱이 화면에서 다시 매긴다. 여기서는 한글과 같은 자리에만 두면 된다.
    questions_en: en.questions.map((q, i) => ({ ...q, id: i + 1 })),
    memory_verse_en: memoryVerseEn,
  });
}

if (problems.length > 0) {
  console.error('짝이 맞지 않아 올리지 않았습니다:\n');
  for (const p of problems) console.error('  ·', p);
  process.exit(1);
}

// ── 올리기 ─────────────────────────────────────────────────────
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
    // PATCH 는 맞는 행이 없어도 200 에 빈 배열을 준다. 조용히 아무것도 안 하는
    // 것을 성공으로 세면, 다 올렸다고 하고서 화면엔 한글이 그대로 남는다.
    if (JSON.parse(body).length === 0) {
      console.error(`${book_id}:${chapter} — 그 장의 한글 행이 아직 없습니다. 한글부터 올리세요.`);
      process.exit(1);
    }
    done += 1;
  }
  console.log(`영어 콘텐츠 ${done}장을 올렸습니다.`);
})();
