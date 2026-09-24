import { GRADES } from './grades.ts';
import type { AnswerMode, FailReason, Grade, QKind, Word } from './types.ts';

/**
 * 문항 만들기와 채점(§4.2).
 *
 * - 같은 카드를 지난번과 **다른 방향**으로 묻는다(다양한 단서 회상).
 * - 영어→뜻은 보기를 바로 보여 주지 않는다. 먼저 떠올리고 「보기 열기」를
 *   눌러야 보기가 나온다 — 보기부터 보면 회상이 아니라 알아보기가 된다.
 * - 철자 채점은 대소문자·앞뒤 공백·끝 마침표만 봐 준다. 한 글자 차이는
 *   「철자」로 틀림 처리하고 그렇다고 알려 준다 — 뜻을 몰라 틀린 것과 다르다.
 */

export interface Question {
  id: string;
  kind: QKind;
  mode: AnswerMode;
  /** 화면에 크게 보이는 단서. listen 이면 비어 있고 소리로만 준다. */
  prompt: string;
  /** 빈칸 문항의 해석 등 보조 단서(힌트로 연다). */
  hint?: string;
  /** 보기(choice 일 때). */
  options?: string[];
  answer: string;
  accept: string[];
}

export function stripBrackets(s: string): string {
  return s.replace(/\[|\]/g, '');
}

/** 예문에서 빈칸 자리의 실제 형태(`[played]` → played). 없으면 표제어. */
export function clozeForm(w: Word): string {
  const m = w.example.match(/\[([^\]]+)\]/);
  return m ? m[1] : w.en;
}

export function clozeText(w: Word): string {
  return w.example.replace(/\[[^\]]+\]/, '_____');
}

export function firstMeaning(w: Word): string {
  return w.ko.split(';')[0].trim();
}

function shuffle<T>(xs: T[], rnd: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 보기 셋을 같은 학년·같은 품사에서 먼저 고른다 — 품사가 다르면 문장만 보고도 지워진다. */
function distractors(w: Word, pool: Word[], pick: (x: Word) => string, rnd: () => number): string[] {
  const own = pick(w);
  const seen = new Set([own]);
  const tiers = [
    pool.filter((x) => x.grade === w.grade && x.pos === w.pos),
    pool.filter((x) => x.pos === w.pos),
    pool,
  ];
  const out: string[] = [];
  for (const tier of tiers) {
    for (const x of shuffle(tier, rnd)) {
      if (out.length >= 3) return out;
      const v = pick(x);
      if (x.id === w.id || seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

export function chooseKind(grade: Grade, last: QKind | undefined, w: Word, rnd: () => number, exclude: QKind[] = []): QKind {
  const weights = { ...GRADES[grade].weights };
  if (!w.example.includes('[')) weights.cloze = 0;
  for (const k of exclude) weights[k] = 0;
  if (last && Object.values(weights).filter((x) => x > 0).length > 1) weights[last] = 0;
  const entries = (Object.entries(weights) as [QKind, number][]).filter(([, v]) => v > 0);
  if (!entries.length) return 'en2ko';
  let r = rnd() * entries.reduce((s, [, v]) => s + v, 0);
  for (const [k, v] of entries) {
    r -= v;
    if (r < 0) return k;
  }
  return entries[entries.length - 1][0];
}

export function makeQuestion(w: Word, kind: QKind, grade: Grade, pool: Word[], rnd: () => number): Question {
  const mode = kind === 'en2ko' ? 'choice' : GRADES[grade].modes[kind];
  const base = { id: w.id, kind, mode };
  switch (kind) {
    case 'en2ko': {
      const answer = firstMeaning(w);
      return { ...base, prompt: w.en, hint: stripBrackets(w.example), answer, accept: [answer], options: shuffle([answer, ...distractors(w, pool, firstMeaning, rnd)], rnd) };
    }
    case 'ko2en':
    case 'listen': {
      const answer = w.en;
      const q: Question = {
        ...base,
        prompt: kind === 'ko2en' ? w.ko.replace(/;/g, ',') : '',
        hint: kind === 'ko2en' ? `${w.en[0]}${'_'.repeat(Math.max(0, w.en.length - 1))}` : firstMeaning(w),
        answer,
        accept: [w.en, ...(w.accept ?? [])],
      };
      if (mode === 'choice') q.options = shuffle([answer, ...distractors(w, pool, (x) => x.en, rnd)], rnd);
      return q;
    }
    case 'cloze': {
      const answer = clozeForm(w);
      const q: Question = { ...base, prompt: clozeText(w), hint: w.exampleKo, answer, accept: [answer] };
      if (mode === 'choice') q.options = shuffle([answer, ...distractors(w, pool, clozeForm, rnd)], rnd);
      return q;
    }
  }
}

export function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[’']/g, "'").replace(/[.!?]+$/, '').replace(/\s+/g, ' ');
}

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

export interface Grading {
  ok: boolean;
  reason?: FailReason;
  /** 틀린 까닭을 한 줄로. */
  note?: string;
}

export function grade(q: Question, w: Word, given: string): Grading {
  const g = normalize(given);
  if (q.accept.some((a) => normalize(a) === g)) return { ok: true };
  if (!g) return { ok: false, reason: q.kind === 'listen' ? 'sound' : 'meaning' };

  if (q.mode === 'type') {
    // 빈칸에 원형을 쓴 경우 — 뜻은 알지만 문장에 맞게 못 바꾼 것.
    if (q.kind === 'cloze' && normalize(w.en) === g) {
      return { ok: false, reason: 'usage', note: `문장에 맞게 형태를 바꿔요: ${q.answer}` };
    }
    const near = q.accept.some((a) => editDistance(normalize(a), g) <= (a.length >= 7 ? 2 : 1));
    if (near) return { ok: false, reason: 'spelling', note: `철자를 확인해요: ${q.answer}` };
  }
  const reason: FailReason = q.kind === 'listen' ? 'sound' : q.kind === 'cloze' ? 'usage' : 'meaning';
  return { ok: false, reason };
}

/** 시드가 있는 난수 — 검사에서 같은 문항이 나오게. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}
