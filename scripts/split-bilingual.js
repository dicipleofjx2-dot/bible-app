/**
 * 두 언어를 함께 적은 원고를 `content/` 와 `content-en/` 두 파일로 쪼갠다.
 *
 *   node scripts/split-bilingual.js scripts/bilingual/leviticus-12-27.js
 *
 * ## 왜 함께 적는가
 *
 * 한글 파일과 영어 파일을 따로 쓰면 **자리가 어긋난다.** 문항 수, 문제 유형,
 * 객관식 정답 자리가 두 파일에서 같아야 앱이 짝지어 쓸 수 있는데, 사람이 두 번
 * 적으면 언젠가 한 군데가 틀린다. 실제로 169문항이 한국어는 객관식, 영어는
 * 단답형인 채로 한동안 서 있었다.
 *
 * 한 곳에 적고 쪼개면 어긋날 자리가 없다.
 *
 * ## 원고 모양
 *
 *   module.exports = [
 *     {
 *       book: 3, chapter: 12, memoryVerse: 8,   // 암송 안 맞으면 null
 *       summary: { ko: '...', en: '...' },
 *       questions: [
 *         {
 *           question: { ko: '...', en: '...' },
 *           choices: [ { ko: '...', en: '...' }, ... ],   // 첫 번째가 정답
 *           explanation: { ko: '...', en: '...' },
 *         },
 *       ],
 *     },
 *   ]
 *
 * 정답은 늘 **첫 자리**에 둔다. 화면에서 보여 줄 때 앱이 섞으므로(shuffleChoices)
 * 정답이 1번에 몰리지 않는다.
 */
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) {
  console.error('원고 파일 경로를 인자로 주세요. (예: scripts/bilingual/leviticus-12-27.js)');
  process.exit(1);
}

const full = path.resolve(src);
const name = path.basename(full, '.js');
const chapters = require(full);

const problems = [];
for (const c of chapters) {
  const at = `${c.book}:${c.chapter}`;
  if (!c.summary?.ko || !c.summary?.en) problems.push(`${at} 요약이 한쪽 비었습니다.`);
  if (c.questions.length !== 7) problems.push(`${at} 문항이 ${c.questions.length}개입니다(7개여야 합니다).`);
  c.questions.forEach((q, i) => {
    const no = `${at} ${i + 1}번`;
    if (!q.question?.ko || !q.question?.en) problems.push(`${no} 질문이 한쪽 비었습니다.`);
    if (!q.explanation?.ko || !q.explanation?.en) problems.push(`${no} 해설이 한쪽 비었습니다.`);
    if (!Array.isArray(q.choices) || q.choices.length !== 4) problems.push(`${no} 보기가 4개가 아닙니다.`);
    (q.choices ?? []).forEach((ch, j) => {
      if (!ch?.ko || !ch?.en) problems.push(`${no} 보기 ${j + 1}이 한쪽 비었습니다.`);
    });
  });
}
if (problems.length) {
  console.error('원고에 빠진 것이 있어 쪼개지 않았습니다:\n');
  for (const p of problems) console.error('  ·', p);
  process.exit(1);
}

function q(s) {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}
function longField(field, value, indent) {
  const one = `${indent}${field}: ${q(value)},`;
  return one.length <= 110 ? one : `${indent}${field}:\n${indent}  ${q(value)},`;
}

function build(lang) {
  const out = [];
  const isKo = lang === 'ko';
  out.push('/**');
  out.push(` * 성경통독도우미 콘텐츠${isKo ? '' : ' (English)'} — ${name}`);
  out.push(' *');
  out.push(' * scripts/bilingual/ 의 원고에서 자동으로 만들어진 파일이다.');
  out.push(' * **여기를 고치지 말고 원고를 고쳐서 다시 쪼갤 것** — 두 언어의 자리가 어긋난다.');
  if (!isKo) {
    out.push(' *');
    out.push(' * memoryVerse 는 한글 파일에만 있다. 영어 본문은 앱이 쓰는 성경(open_en)에서');
    out.push(' * 그대로 가져오므로 여기서 옮기지 않는다.');
  }
  out.push(' */');
  out.push('');
  out.push('module.exports = [');
  for (const c of chapters) {
    out.push('  {');
    out.push(`    book: ${c.book},`);
    out.push(`    chapter: ${c.chapter},`);
    out.push(longField('summary', c.summary[lang], '    '));
    if (isKo) out.push(`    memoryVerse: ${c.memoryVerse ?? null},`);
    out.push('    questions: [');
    for (const qq of c.questions) {
      out.push('      {');
      out.push("        type: 'choice',");
      out.push(longField('question', qq.question[lang], '        '));
      const inline = `        choices: [${qq.choices.map((ch) => q(ch[lang])).join(', ')}],`;
      if (inline.length <= 110) out.push(inline);
      else {
        out.push('        choices: [');
        for (const ch of qq.choices) out.push(`          ${q(ch[lang])},`);
        out.push('        ],');
      }
      out.push('        correctIndex: 0,');
      out.push(longField('explanation', qq.explanation[lang], '        '));
      out.push('      },');
    }
    out.push('    ],');
    out.push('  },');
  }
  out.push('];');
  return out.join('\n') + '\n';
}

const koPath = path.join(__dirname, 'content', name + '.js');
const enPath = path.join(__dirname, 'content-en', name + '.js');
fs.writeFileSync(koPath, build('ko'), 'utf8');
fs.writeFileSync(enPath, build('en'), 'utf8');

const verses = chapters.filter((c) => c.memoryVerse).length;
console.log(`${name} — ${chapters.length}장, 문항 ${chapters.length * 7}개, 암송구절 ${verses}장`);
console.log(`  ${path.relative(process.cwd(), koPath)}`);
console.log(`  ${path.relative(process.cwd(), enPath)}`);
