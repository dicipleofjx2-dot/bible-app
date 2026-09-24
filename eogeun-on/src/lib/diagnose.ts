import { knownCard } from './srs.ts';
import type { Cards, Grade, Profile, Word } from './types.ts';

/**
 * 첫 진단(§5-2). 고른 학년의 난도 1·2·3 에서 네 개씩, 모두 12문항.
 * 맞힌 단어는 「이미 앎」으로 넘겨 가르치지 않고 사흘 뒤 한 번 확인한다
 * (지나치게 쉬운 단어는 통과).
 *
 * 난도별 정답률로 새 단어를 꺼내기 시작할 난도를 정한다 — 한 난도를
 * 거의 다(3/4 이상) 맞히면 그 위부터.
 */

export const PER_LEVEL = 4;

export function pickDiagnostic(words: readonly Word[], grade: Grade, rnd: () => number): Word[] {
  const out: Word[] = [];
  for (const level of [1, 2, 3] as const) {
    const pool = words.filter((w) => w.grade === grade && w.level === level && !w.base);
    const a = [...pool];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    out.push(...a.slice(0, PER_LEVEL));
  }
  return out;
}

export function startLevelFrom(results: { word: Word; ok: boolean }[]): 1 | 2 | 3 {
  let start: 1 | 2 | 3 = 1;
  for (const level of [1, 2] as const) {
    const r = results.filter((x) => x.word.level === level);
    const ok = r.filter((x) => x.ok).length;
    if (r.length && ok / r.length >= 0.75) start = (level + 1) as 2 | 3;
    else break;
  }
  return start;
}

export function applyDiagnosis(
  grade: Grade,
  results: { word: Word; ok: boolean }[],
  cards: Cards,
  day: string,
): { profile: Profile; cards: Cards } {
  const next: Cards = { ...cards };
  for (const r of results) if (r.ok && !next[r.word.id]) next[r.word.id] = knownCard(r.word.id, day);
  return { profile: { grade, startLevel: startLevelFrom(results), newAdjust: 0, diagnosedAt: day }, cards: next };
}

/**
 * 주말 점검 뒤 다음 주 새 단어 수 조정(§6 「다음 주 난도 조정」).
 * 그 주 첫 시도 정답률이 90% 이상이면 하나 늘리고, 70% 미만이면 하나 줄인다.
 */
export function weeklyAdjust(profile: Profile, cards: Cards, weekKey: string, since: string): Profile {
  if (profile.lastAdjustWeek === weekKey) return profile;
  let ok = 0, total = 0;
  for (const c of Object.values(cards))
    for (const a of c.history)
      if (a.first && a.day >= since) {
        total++;
        if (a.ok && !a.hinted) ok++;
      }
  let adj = profile.newAdjust;
  if (total >= 10) {
    const p = ok / total;
    if (p >= 0.9) adj = Math.min(2, adj + 1);
    else if (p < 0.7) adj = Math.max(-2, adj - 1);
  }
  return { ...profile, newAdjust: adj, lastAdjustWeek: weekKey };
}
