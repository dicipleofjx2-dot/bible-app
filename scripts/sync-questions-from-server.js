/**
 * 서버의 문항을 파일로 **되가져온다**.
 *
 *   node scripts/sync-questions-from-server.js              # 무엇이 바뀌는지만 본다
 *   node scripts/sync-questions-from-server.js --write      # 실제로 파일을 고친다
 *
 * ## 왜 필요한가
 *
 * 콘텐츠는 파일과 서버 두 군데에 있는데 **앱이 읽는 것은 서버**다. 단답형 169개를
 * 객관식으로 바꾼 일이 서버에만 반영되고 파일에는 안 돌아온 적이 있다. 그 상태로
 * `upload-reading-helper-content.js` 를 돌리면 그 개선이 통째로 되돌아가므로,
 * 업로드 쪽에는 멈춰 서는 장치가 들어가 있다(ALLOW_QUESTION_DOWNGRADE).
 *
 * 그 장치는 사고를 막을 뿐 어긋남을 고치지는 않는다. **고치는 쪽이 이 스크립트다** —
 * 서버를 기준으로 삼아 파일을 맞춘다. 방향이 반대인 것에 주의할 것.
 *
 * ## 파일을 통째로 다시 찍지 않는 이유
 *
 * 옛 파일들의 줄바꿈은 규칙적이지 않다(같은 파일 안에서 폭 108 짜리 줄이 인라인으로
 * 남아 있는가 하면 폭 55 에서 줄이 바뀌기도 한다). 규칙을 짐작해 다시 찍으면 손대지
 * 않은 수천 줄까지 diff 에 섞여 **무엇이 실제로 바뀌었는지 사람이 볼 수 없게 된다.**
 * 그래서 바뀌는 문항 덩어리만 글자 단위로 갈아 끼운다. 나머지 바이트는 그대로다.
 *
 * ## 건드리지 않는 것
 *
 * `memoryVerse` 는 파일에만 있는 값이다(서버에는 절 번호가 아니라 구절 본문이
 * 담긴다). 요약(summary)도 이 스크립트는 고치지 않고 **다르면 알려 주기만 한다** —
 * 문항과 달리 어느 쪽이 최신인지 이력으로 알 수 없기 때문이다.
 */
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://bhqbrkeoiyhnmdgvofvy.supabase.co';
const CONTENT_DIRS = { ko: 'content', en: 'content-en' };
const WRITE = process.argv.includes('--write');

// 검사용: 미리 받아 둔 응답(JSON 배열)으로 돌려 본다. 서버를 부르지 않는다.
const fromIdx = process.argv.indexOf('--from');
const FROM_FILE = fromIdx >= 0 ? process.argv[fromIdx + 1] : null;

/* ────────────────────────────────────────────────────────────────
 * 자바스크립트 원본에서 덩어리 찾기
 *
 * 파서를 새로 들이지 않는다. 이 파일들의 문자열에는 따옴표도 역슬래시도 줄바꿈도
 * 들어 있지 않으므로(검사함) 작은 훑개로 충분하다.
 * ──────────────────────────────────────────────────────────────── */

/** `[` 자리를 받아, 그 배열 안 **한 겹 아래** `{ … }` 덩어리들의 [시작, 끝) 을 돌려준다. */
function objectSpans(text, openBracket) {
  if (text[openBracket] !== '[') throw new Error('배열이 시작되는 자리가 아닙니다');
  const spans = [];
  let depth = 0;
  let start = -1;
  for (let i = openBracket + 1; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "'") {
      // 문자열은 통째로 건너뛴다
      i += 1;
      while (i < text.length && text[i] !== "'") i += text[i] === '\\' ? 2 : 1;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      i = text.indexOf('\n', i);
      if (i < 0) break;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i) + 1;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) spans.push([start, i + 1]);
    } else if (ch === ']' && depth === 0) {
      break;
    }
  }
  return spans;
}

/** 파일 안에서 (장 → 문항 덩어리 범위) 를 뽑는다. */
function mapFile(text) {
  const rootOpen = text.indexOf('[', text.indexOf('module.exports'));
  const out = new Map();
  for (const [s, e] of objectSpans(text, rootOpen)) {
    const entry = text.slice(s, e);
    const book = Number(entry.match(/\bbook:\s*(\d+)/)?.[1]);
    const chapter = Number(entry.match(/\bchapter:\s*(\d+)/)?.[1]);
    const qRel = entry.indexOf('questions: [');
    if (!book || !chapter || qRel < 0) throw new Error(`읽지 못한 덩어리가 있습니다 (${book}:${chapter})`);
    const qOpen = s + qRel + 'questions: '.length;
    out.set(`${book}:${chapter}`, objectSpans(text, qOpen));
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────
 * 갈아 끼울 문항 찍기
 * ──────────────────────────────────────────────────────────────── */

function q(s) {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}
/** 줄이 얼마나 넓은가. **한글은 두 칸을 차지한다** — 글자 수로 재면 한글 줄이
 * 실제보다 절반으로 보여, 옆 문항들과 줄바꿈이 어긋난다. */
function width(line) {
  let n = 0;
  for (const ch of line) n += /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/.test(ch) ? 2 : 1;
  return n;
}
const LIMIT = 100;

function field(key, value, indent) {
  const one = `${indent}${key}: ${q(value)},`;
  return width(one) <= LIMIT ? one : `${indent}${key}:\n${indent}  ${q(value)},`;
}
function listField(key, values, indent) {
  const one = `${indent}${key}: [${values.map(q).join(', ')}],`;
  if (width(one) <= LIMIT) return one;
  return [`${indent}${key}: [`, ...values.map((v) => `${indent}  ${q(v)},`), `${indent}],`].join('\n');
}

/** 파일에 쓰이는 칸 차례 그대로 찍는다. 모르는 칸이 있으면 뒤에 붙여 잃지 않는다.
 *
 * 갈아 끼우는 범위는 `{` 부터 시작한다 — 그 앞 들여쓰기는 파일에 그대로 남아 있으므로
 * 첫 줄에는 들여쓰기를 붙이지 않는다. 붙이면 두 번 들어간다. */
function emitQuestion(question, indent) {
  const inner = indent + '  ';
  const lines = ['{', `${inner}type: ${q(question.type)},`, field('question', question.question, inner)];
  if (question.type === 'choice') {
    lines.push(listField('choices', question.choices ?? [], inner));
    lines.push(`${inner}correctIndex: ${question.correctIndex},`);
  } else if (question.acceptedAnswers) {
    lines.push(listField('acceptedAnswers', question.acceptedAnswers, inner));
  }
  lines.push(field('explanation', question.explanation, inner));
  const known = new Set(['id', 'type', 'question', 'choices', 'correctIndex', 'acceptedAnswers', 'explanation']);
  for (const [k, v] of Object.entries(question)) {
    if (!known.has(k)) lines.push(`${inner}${k}: ${JSON.stringify(v)},`);
  }
  lines.push(`${indent}}`);
  return lines.join('\n');
}

/** `id` 는 업로드할 때 붙는 것이라 견줄 때 뺀다. */
function strip(question) {
  const { id, ...rest } = question ?? {};
  return rest;
}
const same = (a, b) => JSON.stringify(strip(a)) === JSON.stringify(strip(b));

/** 그 문항이 어떻게 달라지는지 한 줄로. */
function describe(fileQ, serverQ) {
  if (!fileQ) return '파일에 없던 문항이 생김';
  if (!serverQ) return '서버에 없는 문항 (파일에만 있음 — 건드리지 않음)';
  if (fileQ.type !== serverQ.type) return `${fileQ.type} → ${serverQ.type}`;
  if (fileQ.question !== serverQ.question) return '질문이 다름';
  if (JSON.stringify(fileQ.choices) !== JSON.stringify(serverQ.choices)) return '보기가 다름';
  if (fileQ.correctIndex !== serverQ.correctIndex) return `정답 자리 ${fileQ.correctIndex} → ${serverQ.correctIndex}`;
  return '해설이 다름';
}

/* ──────────────────────────────────────────────────────────────── */

async function serverRows() {
  if (FROM_FILE) return JSON.parse(fs.readFileSync(FROM_FILE, 'utf8'));
  const { serviceKey } = require('./lib/service-key');
  const { key, where } = serviceKey();
  console.log(`키: ${where}\n`);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/reading_helper_chapter_content` +
      `?select=book_id,chapter,summary,summary_en,questions,questions_en&order=book_id,chapter`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) throw new Error(`조회 실패 ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

(async () => {
  const rows = await serverRows();
  const server = new Map(rows.map((r) => [`${r.book_id}:${r.chapter}`, r]));
  console.log(`서버에 있는 장 ${rows.length}개`);

  let changed = 0;
  let touchedFiles = 0;
  const summaryGaps = [];
  const missing = [];

  for (const [lang, dir] of Object.entries(CONTENT_DIRS)) {
    const dirPath = path.join(__dirname, dir);
    for (const file of fs.readdirSync(dirPath).filter((f) => f.endsWith('.js'))) {
      const full = path.join(dirPath, file);
      const text = fs.readFileSync(full, 'utf8');
      const spansByChapter = mapFile(text);
      const entries = require(full);

      // 뒤에서부터 갈아 끼운다 — 앞에서부터 하면 뒤쪽 자리가 밀린다.
      const edits = [];
      for (const entry of entries) {
        const key = `${entry.book}:${entry.chapter}`;
        const row = server.get(key);
        if (!row) {
          missing.push(`${dir}/${file} ${key}`);
          continue;
        }
        const serverQuestions = (lang === 'ko' ? row.questions : row.questions_en) ?? [];
        if (serverQuestions.length === 0) continue; // 서버에 그 말로는 아직 없음 — 남겨 둔다

        const fileSummary = entry.summary;
        const serverSummary = lang === 'ko' ? row.summary : row.summary_en;
        if (serverSummary && fileSummary !== serverSummary) summaryGaps.push(`${dir}/${file} ${key}`);

        const spans = spansByChapter.get(key);
        entry.questions.forEach((fileQ, i) => {
          const serverQ = serverQuestions[i];
          if (!serverQ || same(fileQ, serverQ)) return;
          changed += 1;
          console.log(`  ${dir}/${file} ${key} ${i + 1}번 — ${describe(fileQ, serverQ)}`);
          const [s] = spans[i];
          const indent = text.slice(text.lastIndexOf('\n', s) + 1, s);
          edits.push({ span: spans[i], out: emitQuestion(serverQ, indent) });
        });
        if (serverQuestions.length !== entry.questions.length) {
          console.log(
            `  ${dir}/${file} ${key} — 문항 수가 다릅니다 (파일 ${entry.questions.length} / 서버 ${serverQuestions.length}). 겹치는 데까지만 맞췄습니다.`
          );
        }
      }

      if (edits.length === 0) continue;
      touchedFiles += 1;
      if (!WRITE) continue;
      let next = text;
      for (const { span, out } of edits.sort((a, b) => b.span[0] - a.span[0])) {
        next = next.slice(0, span[0]) + out + next.slice(span[1]);
      }
      fs.writeFileSync(full, next, 'utf8');
    }
  }

  console.log('');
  if (missing.length) console.log(`서버에 없는 장 ${missing.length}개 — ${missing.slice(0, 5).join(', ')}`);
  if (summaryGaps.length)
    console.log(`요약이 서버와 다른 장 ${summaryGaps.length}개 (이 스크립트는 고치지 않습니다) — ${summaryGaps.slice(0, 5).join(', ')}`);
  if (changed === 0) console.log('파일이 서버와 같습니다. 고칠 것이 없습니다.');
  else if (WRITE) console.log(`파일 ${touchedFiles}개에서 문항 ${changed}개를 서버 것으로 바꿨습니다.`);
  else console.log(`문항 ${changed}개가 서버와 다릅니다 (파일 ${touchedFiles}개). 고치려면 --write 를 붙이세요.`);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
