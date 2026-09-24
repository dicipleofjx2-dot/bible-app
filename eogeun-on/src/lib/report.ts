import { addDays, diffDays } from './day.ts';
import type { Cards, DayLog, FailReason, Stage } from './types.ts';

/**
 * 성장 보고서(§5-7·8, §9).
 *
 * 새로 배운 개수보다 **「며칠 뒤에도 혼자 떠올렸는가」**를 앞에 둔다.
 * - 독립 회상률: 그날의 **첫 시도**이면서 힌트 없이 맞힌 비율.
 * - 7일 칸은 처음 본 지 7~29일 된 카드, 30일 칸은 30일 넘은 카드만 센다.
 *   갓 배운 카드의 높은 정답률이 섞이면 숫자가 부풀려진다.
 * - 표본이 적으면 비율 대신 「아직 셀 만큼 쌓이지 않았다」고 쓴다.
 */

export const MIN_SAMPLE = 5;

export interface Rate {
  ok: number;
  total: number;
  /** total 이 MIN_SAMPLE 보다 적으면 null. */
  pct: number | null;
}

function rate(ok: number, total: number): Rate {
  return { ok, total, pct: total >= MIN_SAMPLE ? Math.round((ok / total) * 100) : null };
}

export interface Report {
  recall7: Rate;
  recall30: Rate;
  stageCounts: Record<Stage, number>;
  confusing: { id: string; lapses: number; reason?: FailReason }[];
  reasonCounts: Record<FailReason, number>;
  /** 최근 7일 하루 평균 학습 분. */
  avgMinutes7: number;
  /** 최근 14일 중 공부한 날. */
  activeDays14: number;
  totalMinutes: number;
  streak: number;
  learnedTotal: number;
}

export function buildReport(cards: Cards, logs: DayLog[], day: string): Report {
  let r7 = 0, t7 = 0, r30 = 0, t30 = 0;
  const reasonCounts: Record<FailReason, number> = { meaning: 0, spelling: 0, sound: 0, usage: 0 };
  const stageCounts: Record<Stage, number> = { new: 0, learning: 0, review: 0, stable: 0, long: 0 };

  for (const c of Object.values(cards)) {
    stageCounts[c.stage]++;
    for (const a of c.history) {
      if (!a.ok && a.reason && diffDays(day, a.day) <= 29) reasonCounts[a.reason]++;
      if (!a.first) continue;
      const age = diffDays(a.day, c.firstSeen);
      const indep = a.ok && !a.hinted;
      if (age >= 7 && age < 30) {
        t7++;
        if (indep) r7++;
      } else if (age >= 30) {
        t30++;
        if (indep) r30++;
      }
    }
  }

  const confusing = Object.values(cards)
    .filter((c) => c.lapses > 0)
    .sort((a, b) => b.lapses - a.lapses || (b.history.at(-1)?.day ?? '').localeCompare(a.history.at(-1)?.day ?? ''))
    .slice(0, 10)
    .map((c) => ({ id: c.id, lapses: c.lapses, reason: c.lastFail }));

  const byDay = new Map(logs.map((l) => [l.day, l]));
  let sum7 = 0;
  for (let i = 0; i < 7; i++) sum7 += byDay.get(addDays(day, -i))?.seconds ?? 0;
  let active14 = 0;
  for (let i = 0; i < 14; i++) if ((byDay.get(addDays(day, -i))?.seconds ?? 0) > 0) active14++;

  // 오늘 아직 안 했으면 어제부터 센다 — 아침에 연속 기록이 0 으로 보이면 기운이 빠진다.
  let streak = 0;
  let d = (byDay.get(day)?.seconds ?? 0) > 0 ? day : addDays(day, -1);
  while ((byDay.get(d)?.seconds ?? 0) > 0) {
    streak++;
    d = addDays(d, -1);
  }

  return {
    recall7: rate(r7, t7),
    recall30: rate(r30, t30),
    stageCounts,
    confusing,
    reasonCounts,
    avgMinutes7: Math.round(sum7 / 60 / 7),
    activeDays14: active14,
    totalMinutes: Math.round(logs.reduce((s, l) => s + l.seconds, 0) / 60),
    streak,
    learnedTotal: Object.keys(cards).length,
  };
}

/** 보호자 화면의 한 줄 — 순위나 비교 없이 양과 지속만 본다(§5-8). */
export function loadAdvice(avgMinutes: number, activeDays: number): string {
  if (activeDays === 0) return '최근 2주 동안 기록이 없어요. 하루 5분부터 다시 시작해도 충분해요.';
  if (avgMinutes > 35) return '하루 학습이 권장량(20~30분)보다 길어요. 새 단어는 앱이 알아서 줄이니, 쉬어 가도 괜찮다고 말해 주세요.';
  if (avgMinutes < 10 && activeDays < 7) return '짧게라도 매일 여는 것이 한 번에 오래 하는 것보다 기억에 남아요. 같은 시간에 여는 습관을 함께 만들어 주세요.';
  return '적정한 양으로 꾸준히 하고 있어요. 어려워한 단어를 한두 개 같이 소리 내어 읽어 주면 좋아요.';
}
