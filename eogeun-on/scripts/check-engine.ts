/**
 * 엔진 검사 — 화면 없이 노드로 돌린다(`npm test`).
 * 기획서의 규칙 하나하나가 코드에서 그대로 지켜지는지 본다.
 */
import { WORDS, WORD_BY_ID } from '../src/content/words.ts';
import { addDays, nextSaturday } from '../src/lib/day.ts';
import { applyDiagnosis, startLevelFrom, weeklyAdjust } from '../src/lib/diagnose.ts';
import { buildPlan, pickNewWords, REVIEW_CAP } from '../src/lib/plan.ts';
import { grade, makeQuestion, seeded, clozeForm } from '../src/lib/questions.ts';
import { buildReport } from '../src/lib/report.ts';
import { buildFamilies } from '../src/lib/roots.ts';
import { current, makeCtx, onAnswer, onProbe, onTaught, startSession, summarize } from '../src/lib/session.ts';
import { applyAttempt, newCard } from '../src/lib/srs.ts';
import type { Cards, Profile } from '../src/lib/types.ts';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) pass++;
  else {
    fail++;
    console.log('✗', name, detail ?? '');
  }
}

const MON = '2026-09-21'; // 월요일
const good = { kind: 'ko2en' as const, ok: true, hinted: false, ms: 3000, slow: false };
const bad = { ...good, ok: false, reason: 'spelling' as const };

// ── 콘텐츠 ──
check('단어 수 200 이상', WORDS.length >= 200, WORDS.length);
check('id 중복 없음', new Set(WORDS.map((w) => w.id)).size === WORDS.length);
for (const w of WORDS) {
  const n = (w.example.match(/\[/g) ?? []).length;
  if (n !== 1) check(`예문 빈칸 1개: ${w.id}`, false, w.example);
  if (!w.example.toLowerCase().includes(`[${clozeForm(w).toLowerCase()}]`)) check(`빈칸 형태: ${w.id}`, false);
  for (const m of w.morph ?? []) if (!m.meaning) check(`형태소 뜻: ${w.id}`, false, m);
}
check('rewrite 의 바탕은 write', WORD_BY_ID.rewrite.base === 'write');
check('return 은 쪼개지 않음', !WORD_BY_ID.return.morph);
for (const g of ['e34', 'e56', 'm13'] as const)
  for (const l of [1, 2, 3]) check(`${g} 난도${l} 4개 이상`, WORDS.filter((w) => w.grade === g && w.level === l && !w.base).length >= 4);

// ── 복습 예약 ──
let c = newCard('write', MON);
check('새 카드는 내일', c.due === addDays(MON, 1));
c = applyAttempt(c, addDays(MON, 1), good, true);
check('1회 성공 → +1', c.due === addDays(MON, 2) && c.step === 1, c);
c = applyAttempt(c, c.due, good, true);
check('2회 성공 → +3', c.due === addDays(MON, 5), c.due);
const before = c.due;
c = applyAttempt(c, before, good, true);
check('3회 성공 → 주말 점검', c.due === nextSaturday(before), c.due);
const lapsed = applyAttempt(c, c.due, bad, true);
check('복습 오답 → 다음 날, 첫 칸, 까닭', lapsed.due === addDays(c.due, 1) && lapsed.step === 0 && lapsed.lastFail === 'spelling' && lapsed.lapses === 1);
const retry = applyAttempt(lapsed, c.due, good, false);
check('같은 날 재시험 성공은 예약을 안 바꿈', retry.due === lapsed.due && retry.step === 0);
const hinted = applyAttempt(c, c.due, { ...good, hinted: true }, true);
check('힌트 보고 맞힘 → 칸 유지', hinted.step === c.step && hinted.due > c.due);

// ── 채점 ──
const r = seeded(7);
const q1 = makeQuestion(WORD_BY_ID.neighbor, 'ko2en', 'm13', [...WORDS], r);
check('영국식 철자 허용', grade(q1, WORD_BY_ID.neighbor, 'Neighbour ').ok);
check('한 글자 틀림 → 철자', grade(q1, WORD_BY_ID.neighbor, 'nieghbor').reason === 'spelling');
const q2 = makeQuestion(WORD_BY_ID.play, 'cloze', 'm13', [...WORDS], r);
check('빈칸에 원형 → 문장 사용', grade(q2, WORD_BY_ID.play, 'play').reason === 'usage');
check('빈칸 정답 played', grade(q2, WORD_BY_ID.play, 'played').ok);
const q3 = makeQuestion(WORD_BY_ID.teacher, 'en2ko', 'e34', [...WORDS], r);
check('보기 4개, 중복 없음, 정답 포함', q3.options?.length === 4 && new Set(q3.options).size === 4 && q3.options.includes(q3.answer), q3.options);

// ── 진단 ──
const res = (lv: number, ok: number) => WORDS.filter((w) => w.grade === 'm13' && w.level === lv).slice(0, 4).map((word, i) => ({ word, ok: i < ok }));
check('난도1 3/4 → 2부터', startLevelFrom([...res(1, 3), ...res(2, 1)]) === 2);
check('난도1·2 다 맞힘 → 3부터', startLevelFrom([...res(1, 4), ...res(2, 4)]) === 3);
check('난도1 절반 → 1부터', startLevelFrom([...res(1, 2), ...res(2, 4)]) === 1);
const dx = applyDiagnosis('m13', res(1, 2), {}, MON);
check('진단 맞힌 단어는 사흘 뒤 확인', Object.keys(dx.cards).length === 2 && Object.values(dx.cards).every((x) => x.due === addDays(MON, 3)));

// ── 일일 계획 ──
const prof: Profile = { grade: 'e56', startLevel: 1, newAdjust: 0, diagnosedAt: MON };
const p0 = buildPlan(MON, [...WORDS], {}, prof);
check('복습 없으면 새 단어 최대', p0.newIds.length === 9, p0.newIds.length);
const picks = pickNewWords([...WORDS], { rewrite: newCard('rewrite', MON) }, { ...prof, startLevel: 2 }, 9);
check('파생어 앞에 바탕 단어', picks.every((id) => { const b = WORD_BY_ID[id].base; return !b || !WORD_BY_ID[b] || WORD_BY_ID[b].grade !== 'e56' || picks.indexOf(b) < picks.indexOf(id) || false; }), picks);
const many: Cards = {};
for (const w of WORDS.slice(0, 60)) many[w.id] = { ...newCard(w.id, '2026-09-01'), due: '2026-09-10' };
const p1 = buildPlan(MON, [...WORDS], many, prof);
check('밀린 복습은 상한만큼, 새 단어 줄어듦', p1.reviewIds.length === REVIEW_CAP && p1.backlog === 60 - REVIEW_CAP && p1.newIds.length < 9, p1);
const p2 = buildPlan('2026-09-26', [...WORDS], many, prof);
check('토요일은 새 단어 없음', p2.weekend && p2.newIds.length === 0);

// ── 세션 흐름 ──
const ctx = makeCtx([...WORDS], {});
const plan = { day: MON, weekend: false, reviewIds: [], newIds: ['write', 'rewrite', 'play'], minutes: 5, backlog: 0 };
let s = startSession(plan, 'e56', ctx, 42);
check('새 단어로 시작 → learn', s.phase === 'learn' && current(s)?.t === 'probe');
s = onProbe(s, ctx, true); // write: 안다 → 확인 문제
check('안다 → 설명보다 회상 문제 먼저', current(s)?.t === 'ask' && (current(s) as { purpose: string }).purpose === 'check');
s = onAnswer(s, ctx, true); // 맞힘 → known
s = onProbe(s, ctx, false); // rewrite: 모른다 → 카드
check('모른다 → 카드', current(s)?.t === 'teach');
s = onTaught(s, ctx);
s = onProbe(s, ctx, true); // play: 안다 → 틀림
s = onAnswer(s, ctx, false, 'meaning');
check('안다고 했는데 틀림 → 그 자리에서 설명', current(s)?.t === 'teach');
s = onTaught(s, ctx);
check('집중 회상은 아는 단어 제외', s.phase === 'recall' && s.queue.length === 2 && s.queue.every((x) => x.t === 'ask' && x.id !== 'write' && x.q.kind !== 'en2ko'), s.queue);
s = onAnswer(s, ctx, true);
s = onAnswer(s, ctx, false, 'spelling');
check('약점 재학습 = 설명 먼저, 재시험은 다른 방향', s.phase === 'relearn' && s.queue[0].t === 'teach');
const failedKind = s.lastKind;
while (s.phase === 'relearn') {
  const st = current(s)!;
  if (st.t === 'teach') s = onTaught(s, ctx);
  else if (st.t === 'ask') s = onAnswer(s, ctx, true);
  else break;
}
check('재학습 뒤 활용', s.phase === 'apply' && s.queue.every((x) => x.t === 'ask' && x.q.kind === 'cloze'));
while (s.phase !== 'done') s = onAnswer(s, ctx, true);
const sum = summarize(s);
check('요약: 틀린 play 가 약점에, 까닭 모음', sum.weak.some((x) => x.id === 'play' && x.reasons.includes('meaning')), sum.weak);
void failedKind;

// ── 보고서 ──
const aged: Cards = { a: { ...newCard('a', '2026-08-01'), history: [
  ...Array.from({ length: 6 }, (_, i) => ({ day: addDays('2026-08-01', 8 + i), kind: 'ko2en' as const, ok: i !== 0, hinted: false, ms: 1, first: true })),
  { day: '2026-08-02', kind: 'ko2en', ok: true, hinted: false, ms: 1, first: true },
] } };
const rep = buildReport(aged, [{ day: MON, seconds: 1200, newCount: 5, reviewCount: 10 }, { day: addDays(MON, -1), seconds: 600, newCount: 0, reviewCount: 5 }], MON);
check('7일 회상률은 7~29일 된 시도만(5/6)', rep.recall7.total === 6 && rep.recall7.pct === 83, rep.recall7);
check('표본 부족하면 비율 없음', rep.recall30.pct === null);
check('연속 학습 2일', rep.streak === 2);

// ── 주간 조정 ──
const wk: Cards = { x: { ...newCard('x', MON), history: Array.from({ length: 10 }, () => ({ day: MON, kind: 'ko2en' as const, ok: true, hinted: false, ms: 1, first: true })) } };
const adj = weeklyAdjust(prof, wk, '2026-09-26', MON);
check('주간 정답 90%↑ → +1', adj.newAdjust === 1);
check('같은 주 두 번 조정 안 함', weeklyAdjust(adj, wk, '2026-09-26', MON).newAdjust === 1);

// ── 어근 지도 ──
const fam = buildFamilies(WORDS);
const re = fam.find((f) => f.key.startsWith('prefix:re-:'));
check('re- 가족에 rewrite·reuse·recycle, return 없음', !!re && ['rewrite', 'reuse', 'recycle'].every((x) => re.ids.includes(x)) && !re.ids.includes('return'));
const port = fam.find((f) => f.key.startsWith('root:port:'));
check('port 가족 4개', port?.ids.length === 4, port);

const notIm = fam.find((f) => f.key === 'prefix:im-:~이 아닌');
check('im-(~이 아닌) 가족에 import 없음', !!notIm && !notIm.ids.includes('import'), notIm);

console.log(`\n${pass} 통과, ${fail} 실패`);
if (fail) process.exit(1);
