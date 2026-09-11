/**
 * 순수 함수 검사. 이 리포에는 시험 틀이 없어서, 노드로 직접 돌려 눈으로 대조한다.
 * `npm run check` → tsconfig.check.json 으로 컴파일한 뒤 이 파일을 돌린다.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const O = require('../.check/organize.js');
const B = require('../.check/blog.js');
const K = require('../.check/korean.js');

let pass = 0;
let fail = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass += 1; return; }
  fail += 1;
  console.log(`✗ ${name}\n   받음: ${JSON.stringify(got)}\n   기대: ${JSON.stringify(want)}`);
}
function truthy(name, got) {
  if (got) { pass += 1; return; }
  fail += 1;
  console.log(`✗ ${name} — 참이 아님: ${JSON.stringify(got)}`);
}

// ── 문장 나누기 ──────────────────────────────────────────────────────
check('말줄임표는 문장 끝이 아니다', K.sentences('그런데... 그래서 갔습니다.').length, 1);
check('소수점은 문장 끝이 아니다', K.sentences('3.5미터쯤 되는 문이었습니다.').length, 1);

// ── 여러 기록 나누기 (§4) ────────────────────────────────────────────
const two = O.splitSegments(
  '어젯밤에 낯선 길에서 가족을 찾아 헤매는 꿈을 꾸었습니다. 길이 아주 길었고 안개가 자욱했습니다. 아이를 부르는데 소리가 나오지 않았습니다. ' +
  '또 다른 꿈은 교회 마당에 서 있는 것이었습니다. 사람들이 모여 찬양을 하고 있었고 마음이 아주 뜨거웠습니다. 그 자리에서 오래 서 있었습니다.'
);
check('두 기록으로 나뉜다', two.length, 2);
truthy('나눈 이유를 말한다', two[1].why.includes('다른 꿈'));
truthy('나눈 자리의 확신을 숫자로 준다', two[1].confidence > 0.8 && two[1].confidence <= 1);

const short = O.splitSegments(
  '기도 중에 한 장면이 떠올랐습니다. 아주 밝은 빛이 방 안을 가득 채웠고 마음이 평안해졌습니다. 오래 그 자리에 있었습니다. 또 하나는 짧습니다.'
);
check('짧은 토막은 따로 떼지 않는다', short.length, 1);

check('나눌 곳이 없으면 통째로 하나', O.splitSegments('조용한 밤이었습니다. 아무 일도 없었습니다.').length, 1);

// ── 군더더기 덜어내기 (§5) ───────────────────────────────────────────
check('혼자 선 군말만 지운다', O.tidy('어 음 그러니까 저는 그 그 그 문을 보았습니다.'), '저는 그 문을 보았습니다.');
truthy('문장 안의 「그」는 남는다', O.tidy('그 사람이 왔습니다.').includes('그 사람이'));
check('겹친 낱말을 한 번으로', O.tidy('제가 제가 갔습니다.'), '제가 갔습니다.');

// ── 경어체 (§5) ──────────────────────────────────────────────────────
check('문장 끝만 경어체로', O.toPolite('문이 열렸다. 빛이 들어왔다.'), '문이 열렸다. 빛이 들어왔다.');
check('알려진 끝맺음은 바꾼다', O.toPolite('무서웠어'), '무서웠어');
check('「했다」는 「했습니다」로', O.toPolite('기도를 했다.'), '기도를 했습니다.');
check('「있어」는 「있습니다」로', O.toPolite('마음에 평안이 있어.'), '마음에 평안이 있습니다.');

// ── 요약은 고르는 일 (§5·§8) ─────────────────────────────────────────
const long = '어젯밤 꿈에서 낯선 길을 걸었습니다. 길 끝에 큰 문이 있었습니다. 문 앞에서 아이를 불렀습니다. 아이는 대답하지 않았습니다. 다시 길을 걸었습니다. 문이 열렸습니다. 빛이 들어왔습니다.';
const summary = O.summarize(long);
truthy('요약은 3~4문장', summary.length >= 3 && summary.length <= 4);
truthy('요약의 모든 문장이 원문에 그대로 있다', summary.every((s) => long.includes(s)));
truthy('요약은 말한 순서를 지킨다', summary.map((s) => long.indexOf(s)).every((v, i, a) => i === 0 || a[i - 1] < v));

// ── 종류 추천 — 확정하지 않는다 (§8) ─────────────────────────────────
const dream = O.guessKind('어젯밤 꿈에서 큰 문을 보았습니다.');
check('꿈을 첫 후보로', dream[0].kind, 'dream');
truthy('왜 그렇게 보았는지 말한다', dream[0].why.length > 0);
const prophecy = O.guessKind('기도 중에 이 교회를 향한 말씀을 주셨습니다. 돌이키라고 하셨습니다.');
truthy('후보를 하나로 확정하지 않는다', prophecy.length > 1);
check('아무 실마리도 없으면 비워 둔다', O.guessKind('조용한 하루였습니다.').length, 0);

// ── 태그 추천 (§6) ───────────────────────────────────────────────────
const tags = O.extractTags('남편과 함께 교회에서 기도하는데 김철수 씨가 아프다는 소식을 들었습니다. 병원에 입원했다고 합니다. 마음이 무거웠습니다. 요한복음 3:16 말씀이 떠올랐습니다. 빛이 비쳤고 다시 빛이 보였고 그 빛이 방 안을 채웠습니다.');
truthy('관계어를 사람으로', tags.people.includes('남편'));
truthy('「OO 씨」를 사람으로', tags.people.includes('김철수 씨'));
truthy('장소 후보를 찾는다', tags.places.includes('교회') && tags.places.includes('병원'));
truthy('주제를 고른다', tags.topics.includes('교회와 사역') && tags.topics.includes('치유와 건강'));
truthy('감정을 고른다', tags.emotions.includes('무거움'));
check('성경 구절을 찾는다', tags.verses, ['요한복음 3:16']);
truthy('세 번 넘게 나온 낱말을 상징 후보로', tags.symbols.some((s) => s.startsWith('빛')));

check('「시편 23편」도 찾는다', O.findVerses('시편 23편을 읽었습니다.'), ['시편 23장']);
check('「요한복음 3장 16절」도 찾는다', O.findVerses('요한복음 3장 16절'), ['요한복음 3:16']);
check('성경책 이름이 없으면 찾지 않는다', O.findVerses('3시 16분에 깼습니다.'), []);

// ── 없는 말을 보태지 않는다 (§8) ─────────────────────────────────────
const org = O.organize({ text: '어 그러니까 어젯밤에 꿈을 꿨다. 큰 문이 있었다.', confidence: 1, why: 'x' }, { date: '2026-09-11' });
const lettersOf = (s) => s.replace(/[^가-힣]/g, '');
truthy('정리문의 모든 낱말이 원문 안에 있다',
  O.tidy(org.raw).split(' ').every((w) => lettersOf(org.raw).includes(lettersOf(w))));
truthy('제목은 본문에서 따온다', lettersOf(org.raw).includes(lettersOf(org.title).slice(0, 6)));
truthy('원문을 지우지 않는다', org.raw.includes('큰 문이 있었다'));

// ── 확인이 필요한 자리 (§8) ──────────────────────────────────────────
truthy('한글 사이 로마자에 표시', O.markUncertain('그가 hallelu 라고 말했습니다.').includes('[확인 필요]'));
check('물음표 연속을 표시로', O.markUncertain('이름이 ?? 였습니다.'), '이름이 [확인 필요] 였습니다.');
check('멀쩡한 말에는 표시하지 않는다', O.markUncertain('빛이 들어왔습니다.'), '빛이 들어왔습니다.');

// ── 블로그 (§11) ─────────────────────────────────────────────────────
const base = {
  title: '낯선 길에서 가족을 찾는 꿈',
  kind: 'dream',
  recordDate: '2026-09-11',
  received: '낯선 길을 걸었습니다.\n\n문이 열렸습니다.',
  feeling: '마음이 무거웠습니다.',
  status: 'discerning',
  verses: ['요한복음 3:16'],
};
const sections = B.buildSections(base);
check('§11 차례대로 절이 선다', sections.map((s) => s.heading), ['받은 내용', '당시의 느낌과 생각', '현재의 해석 또는 분별 상태', '관련 말씀']);
truthy('해석이 없으면 분별 상태를 그대로 적는다', sections[2].body.includes('기도하며 분별 중입니다'));
truthy('적지 않은 절은 만들지 않는다', !sections.some((s) => s.heading === '당시 상황'));

const omitted = B.buildSections({ ...base, omit: ['당시의 느낌과 생각'] });
truthy('빼기로 한 절은 나가지 않는다', !omitted.some((s) => s.heading === '당시의 느낌과 생각'));

const aliased = B.buildSections({ ...base, received: '김철수 씨와 함께 걸었습니다.', aliases: { '김철수': '남편' } });
truthy('짝지어 준 이름만 바꾼다', aliased[0].body.startsWith('남편 씨와'));

check('안 바꾼 이름을 알린다', B.remainingNames('이영희 씨를 만났습니다.', {}), ['이영희 씨']);
check('바꾼 이름은 알리지 않는다', B.remainingNames('남편과 걸었습니다.', { '김철수': '남편' }), []);

const html = B.blogHtml(base);
truthy('html 에 절 제목이 들어간다', html.includes('<h2>받은 내용</h2>'));
truthy('빈 줄이 문단으로 갈라진다', (html.match(/<p>/g) || []).length >= 3);
truthy('꺾쇠를 그대로 내보내지 않는다', B.blogHtml({ ...base, received: '<script>x</script>' }).includes('&lt;script&gt;'));

const md = B.blogMarkdown(base);
truthy('마크다운에 날짜·종류·상태가 있다', md.includes('2026-09-11 · 꿈 · 기도하며 분별 중'));

truthy('제목 후보를 몇 개 준다', B.titleCandidates(base).length >= 3);
truthy('제목 후보에 원래 제목이 들어간다', B.titleCandidates(base).includes(base.title));

// ── 사람이 직접 나눈 자리 (§9 「새 기록으로 나누기」) ────────────────
const manual = O.splitTranscript('낯선 길을 걸었습니다. 문이 있었습니다.\n\n교회 마당에 서 있었습니다. 찬양 소리가 들렸습니다.');
check('빈 줄로 나눈 자리를 지킨다', manual.length, 2);
check('사람이 나눈 자리는 확신이 1', manual[1].confidence, 1);
truthy('사람이 나눴다고 적는다', manual[1].why.includes('직접'));
truthy('본문에 없던 말이 끼어들지 않는다', !manual.map((m) => m.text).join(' ').includes('다음 기록'));
check('빈 줄이 없으면 규칙으로 나눈다', O.splitTranscript('조용한 밤이었습니다.').length, 1);

// ── 이름을 바꾸면 조사도 따라 바뀐다 (§12) ───────────────────────────
check('받침 없는 이름 뒤의 「를」', B.applyAliases('김철수 씨를 위해 기도했습니다.', { '김철수 씨': '교회 지인' }), '교회 지인을 위해 기도했습니다.');
check('받침 있는 이름 뒤의 「을」', B.applyAliases('김철수 씨을 보았습니다.', { '김철수 씨': '아내' }), '아내를 보았습니다.');
check('「은/는」도 고친다', B.applyAliases('영희 씨는 웃었습니다.', { '영희 씨': '첫째 아이' }), '첫째 아이는 웃었습니다.');
check('「이/가」도 고친다', B.applyAliases('영희 씨가 왔습니다.', { '영희 씨': '남편' }), '남편이 왔습니다.');
check('ㄹ 받침은 「로」', B.fixParticle('서울', '으로'), '로');
check('받침 있으면 「으로」', B.fixParticle('교회당', '로'), '으로');
check('받침 없으면 「로」', B.fixParticle('아버지', '으로'), '로');
check('조사가 없으면 이름만 바꾼다', B.applyAliases('김철수 씨 그리고 나', { '김철수 씨': '남편' }), '남편 그리고 나');
check('짝짓지 않은 이름은 그대로', B.applyAliases('이영희 씨가 왔습니다.', { '김철수': '남편' }), '이영희 씨가 왔습니다.');

// ── 끝 ───────────────────────────────────────────────────────────────
console.log(`\n${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
