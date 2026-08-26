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

// 안내문의 「여기에키」를 실제 키로 안 바꾸고 그대로 돌리는 일이 실제로 있었다.
// 그러면 한글이 HTTP 헤더에 실리려다 fetch 안쪽에서 ByteString 오류로 터지는데,
// 그 오류만 봐서는 무엇이 잘못됐는지 알 수가 없다. 미리 걸러 준다.
if (!/^[\x20-\x7E]+$/.test(SERVICE_KEY)) {
  console.error('SUPABASE_SERVICE_ROLE_KEY 에 영문·숫자가 아닌 글자가 들어 있습니다.');
  console.error('안내문의 「여기에키」를 실제 키로 바꾸셨는지 보세요.');
  console.error('키는 Supabase 대시보드 → Project Settings → API Keys → service_role 에 있습니다.');
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

/**
 * 오류를 알리고 멈춘다.
 *
 * 서버에 붙어 있는 동안 `process.exit` 을 부르면 윈도우에서 libuv 가
 * 「Assertion failed ... UV_HANDLE_CLOSING」을 뱉고 종료 코드가 127 이 된다.
 * 정작 봐야 할 오류 문구가 그 밑에 묻힌다.
 *
 * 그래서 곧장 끄지 않고 **종료 코드만 정해 두고 빠져나온다.** 붙어 있던 것이
 * 정리되면 노드가 알아서 끝난다.
 */
const STOP = Symbol('stop');
function fail(...lines) {
  for (const l of lines) console.error(l);
  process.exitCode = 1;
  throw STOP;
}

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
//
// **파일이 아니라 서버의 한글과 견준다.**
//
// 한때 파일끼리(content/ vs content-en/) 견줬는데, 서버의 한글은 그 뒤에 손을 댄
// 적이 있다 — 단답형 169개를 객관식으로 바꿔 배포했고 그 변경이 파일에는 안
// 돌아왔다. 그래서 파일끼리는 맞는데 화면에서는 한국어로 보면 객관식, 영어로 보면
// 단답형이 되어 있었다. 아무 오류도 안 났다.
//
// 앱이 읽는 것은 서버다. 그러니 짝도 서버와 맞춰야 한다.
const koByKey = new Map(koChapters.map((c) => [`${c.book}:${c.chapter}`, c]));

async function fetchServerKo(chapters) {
  const byKey = new Map();
  for (const c of chapters) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/reading_helper_chapter_content` +
        `?book_id=eq.${c.book}&chapter=eq.${c.chapter}&select=book_id,chapter,questions`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    if (!res.ok) {
      fail(`${c.book}:${c.chapter} 조회 실패 ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    const [row] = await res.json();
    if (row) byKey.set(`${row.book_id}:${row.chapter}`, row);
  }
  return byKey;
}

function buildUpdates(serverKo) {
  const problems = [];
  const updates = [];

  for (const en of enChapters) {
    const key = `${en.book}:${en.chapter}`;
    const koFile = koByKey.get(key);
    const koServer = serverKo.get(key);

    if (!koFile) {
      problems.push(`${key} — 한글 파일에 없는 장입니다.`);
      continue;
    }
    if (!koServer) {
      problems.push(`${key} — 서버에 그 장의 한글이 아직 없습니다. 한글부터 올리세요.`);
      continue;
    }

    const koCount = (koServer.questions ?? []).length;
    const enCount = (en.questions ?? []).length;
    if (koCount !== enCount) {
      problems.push(`${key} — 문항 수가 다릅니다. 서버의 한글 ${koCount}개, 영어 ${enCount}개.`);
      continue;
    }

    // 문제 유형까지 같아야 한다. 한쪽만 객관식이면 두 언어의 난이도가 달라진다 —
    // 퀴즈 점수가 말씀카드를 여는 열쇠라 한쪽이 구조적으로 불리해진다.
    for (let i = 0; i < koCount; i += 1) {
      const koq = koServer.questions[i];
      const enq = en.questions[i];
      if (koq.type !== enq.type) {
        problems.push(
          `${key} — ${i + 1}번 문제 유형이 다릅니다. 서버의 한글 ${koq.type}, 영어 ${enq.type}.`
        );
      }
      if (koq.type === 'choice' && enq.type === 'choice') {
        if (koq.correctIndex !== enq.correctIndex) {
          problems.push(
            `${key} — ${i + 1}번 문제의 정답 위치가 다릅니다. 한글 ${koq.correctIndex}, 영어 ${enq.correctIndex}.`
          );
        }
        if ((koq.choices ?? []).length !== (enq.choices ?? []).length) {
          problems.push(
            `${key} — ${i + 1}번 문제의 보기 수가 다릅니다. 한글 ${koq.choices?.length}개, 영어 ${enq.choices?.length}개.`
          );
        }
      }
    }

    // 암송구절 — 절 번호는 한글 파일이 가진 것을 그대로 쓰고 본문은 bible.db 에서
    // 가져온다. sync-memory-verses.js 와 같은 규칙이라 서로 어긋날 일이 없다.
    let memoryVerseEn = null;
    if (koFile.memoryVerse) {
      const row = verseStmt.get(en.book, en.chapter, koFile.memoryVerse, EN_TRANSLATION);
      if (!row) {
        problems.push(
          `${key} — 영어 암송구절 본문을 찾지 못했습니다(${EN_TRANSLATION} ${en.chapter}:${koFile.memoryVerse}).`
        );
      } else {
        memoryVerseEn = {
          reference: `${BOOK_NAMES_EN[en.book - 1]} ${en.chapter}:${koFile.memoryVerse}`,
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

  return { problems, updates };
}

// ── 올리기 ─────────────────────────────────────────────────────
(async () => {
  const serverKo = await fetchServerKo(enChapters);
  const { problems, updates } = buildUpdates(serverKo);

  if (problems.length > 0) {
    fail('짝이 맞지 않아 올리지 않았습니다:\n', ...problems.map((p) => '  · ' + p));
  }

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
      fail(`${book_id}:${chapter} 실패 ${res.status} ${body.slice(0, 300)}`);
    }
    // PATCH 는 맞는 행이 없어도 200 에 빈 배열을 준다. 조용히 아무것도 안 하는
    // 것을 성공으로 세면, 다 올렸다고 하고서 화면엔 한글이 그대로 남는다.
    if (JSON.parse(body).length === 0) {
      fail(`${book_id}:${chapter} — 그 장의 한글 행이 아직 없습니다. 한글부터 올리세요.`);
    }
    done += 1;
  }
  console.log(`영어 콘텐츠 ${done}장을 올렸습니다.`);
})().catch((e) => {
  // fail() 이 던진 것은 이미 사람이 읽을 말로 알렸다. 그 밖의 것만 그대로 보인다.
  if (e !== STOP) {
    console.error(e);
    process.exitCode = 1;
  }
});
