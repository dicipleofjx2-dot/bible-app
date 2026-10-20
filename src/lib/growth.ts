/**
 * 데이빗스톤 성장ON — 셈하는 자리.
 *
 * 화면도 서버도 부르지 않는 순수 함수만 둔다. 이 앱에는 자동 검사가 없어서
 * (HANDOFF 참고), 규칙이 든 자리를 이렇게 갈라 두어야 노드로 돌려 대조할 수
 * 있다. 사명기록관(`missionArchive.ts`)과 같은 방식이다.
 *
 * ── 왜 언어모델을 부르지 않는가 (기획서 §8) ────────────────────────
 * 기획서는 AI 요약을 말하지만, 여기 쌓이는 것은 **미성년 20명의 학습·건강·
 * 관계 기록**이다. 그것을 통째로 밖으로 보내는 일은 §10(아동 보호)과 정면으로
 * 부딪힌다. 그래서 월간보고서 초안은 **기록을 엮는 규칙**으로 만든다.
 *   - 없는 일은 짓지 않는다. 문장은 전부 실제 기록에서 온다.
 *   - 문장마다 **근거 날짜**를 단다(§8 마지막 원칙).
 *   - 성격·지능·신앙 수준을 단정하지 않는다. 형용사는 교사가 쓴다.
 *   - 학생끼리 견주지 않는다. 견주는 대상은 그 학생의 지난달뿐이다.
 * 뒷날 모델을 붙이더라도 이 함수들이 만드는 초안이 바닥값으로 남는다.
 */

export type GrowthArea = 'learning' | 'attitude' | 'relation' | 'faith' | 'health' | 'teacher';
export type GrowthLevel = 'great' | 'good' | 'ok' | 'help';
export type RecordVisibility = 'teacher' | 'guardian' | 'open';
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused' | 'early' | 'field';
export type GoalHorizon = 'long' | 'term' | 'month' | 'week';
export type MemberRole = 'owner' | 'teacher' | 'activity' | 'guardian' | 'student';

export const AREAS: { id: GrowthArea; label: string; emoji: string; hint: string }[] = [
  { id: 'learning', label: '학습', emoji: '📘', hint: '과목·배운 내용·이해도·질문' },
  { id: 'attitude', label: '태도', emoji: '🧭', hint: '성실·자기주도·시간관리·정리' },
  { id: 'relation', label: '관계', emoji: '🤝', hint: '협력·배려·표현·갈등과 회복' },
  { id: 'faith', label: '신앙', emoji: '🕊️', hint: '말씀·기도·예배·감사·섬김' },
  { id: 'health', label: '건강·생활', emoji: '🌤️', hint: '식사·컨디션·안전·특이사항' },
  { id: 'teacher', label: '교사 관찰', emoji: '✍️', hint: '잘한 점·도움이 필요한 점·다음 지도' },
];

/**
 * 네 단계로 끝낸다. 다섯 번째(「못함」)를 두지 않은 것이 이 표의 요지다 —
 * 「도움 필요」는 교사가 할 일을 가리키지 아이를 가리키지 않는다(§4.2).
 */
export const LEVELS: { id: GrowthLevel; label: string; tone: 'best' | 'good' | 'plain' | 'care' }[] = [
  { id: 'great', label: '매우 좋음', tone: 'best' },
  { id: 'good', label: '좋음', tone: 'good' },
  { id: 'ok', label: '보통', tone: 'plain' },
  { id: 'help', label: '도움 필요', tone: 'care' },
];

export const ATTENDANCE: { id: AttendanceStatus; label: string; short: string }[] = [
  { id: 'present', label: '출석', short: '출' },
  { id: 'late', label: '지각', short: '지' },
  { id: 'early', label: '조퇴', short: '조' },
  { id: 'excused', label: '인정결석', short: '인' },
  { id: 'absent', label: '결석', short: '결' },
  { id: 'field', label: '체험활동', short: '체' },
];

export const VISIBILITIES: { id: RecordVisibility; label: string; hint: string }[] = [
  { id: 'teacher', label: '교사만', hint: '보호자·학생 화면에 나오지 않습니다' },
  { id: 'guardian', label: '보호자까지', hint: '보호자가 볼 수 있습니다' },
  { id: 'open', label: '학생도 함께', hint: '학생 본인도 볼 수 있습니다' },
];

export const HORIZONS: { id: GoalHorizon; label: string }[] = [
  { id: 'long', label: '장기 방향' },
  { id: 'term', label: '이번 학기' },
  { id: 'month', label: '이번 달' },
  { id: 'week', label: '이번 주 실천' },
];

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: '최고관리자',
  teacher: '담임·교사',
  activity: '체험활동 담당',
  guardian: '보호자',
  student: '학생',
};

export function areaLabel(area: GrowthArea): string {
  return AREAS.find((a) => a.id === area)?.label ?? area;
}

export function levelLabel(level: GrowthLevel | null | undefined): string {
  if (!level) return '';
  return LEVELS.find((l) => l.id === level)?.label ?? level;
}

export function attendanceLabel(status: AttendanceStatus): string {
  return ATTENDANCE.find((a) => a.id === status)?.label ?? status;
}

// ───────────────────────── 날짜 ─────────────────────────
//
// 학교는 서울에서 돌아간다. UTC 자정으로 끊으면 밤 9시 기록이 내일 것이 된다
// (0077 에서 새벽기도로 같은 판단을 했다).

export function kstToday(now: Date = new Date()): string {
  return kstDateString(now);
}

export function kstDateString(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export function kstMonth(now: Date = new Date()): string {
  return kstToday(now).slice(0, 7);
}

/** 'YYYY-MM' → 그 달의 첫날·끝날. 조회 범위를 만드는 데 쓴다. */
export function monthRange(period: string): { from: string; to: string } {
  const [y, m] = period.split('-').map((n) => Number(n));
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${period}-01`, to: `${period}-${String(last).padStart(2, '0')}` };
}

export function previousMonth(period: string): string {
  const [y, m] = period.split('-').map((n) => Number(n));
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function formatKoreanDate(isoDate: string): string {
  const [, m, d] = isoDate.split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

export function formatKoreanMonth(period: string): string {
  const [y, m] = period.split('-');
  return `${y}년 ${Number(m)}월`;
}

// ───────────────────────── 기록 모양 ─────────────────────────

export type RecordLike = {
  student_id: string;
  on_date: string;
  area: GrowthArea;
  level: GrowthLevel | null;
  subject?: string;
  body: string;
  visibility: RecordVisibility;
  next_action?: string;
};

export type AttendanceLike = {
  student_id: string;
  on_date: string;
  status: AttendanceStatus;
  reason?: string;
};

export type ActivityLike = {
  id: string;
  title: string;
  on_date: string;
  place?: string;
  goal?: string;
};

export type ParticipantLike = {
  activity_id: string;
  student_id: string;
  role?: string;
  observation?: string;
  reflection?: string;
  learned?: string;
  thanks?: string;
  next_step?: string;
};

export type GoalLike = {
  student_id: string;
  horizon: GoalHorizon;
  body: string;
  method?: string;
  period?: string;
  status: 'active' | 'done' | 'paused';
};

// ───────────────────────── 오늘 기록 진행도 ─────────────────────────

/**
 * 「오늘 이 학생 기록을 했는가」.
 *
 * 영역 여섯을 다 채우라고 요구하지 않는다 — 기획서 §2 가 학생 1명당 30초~1분을
 * 못박았고, 여섯 칸을 다 채우라고 하면 아무도 매일 못 쓴다. **한 영역이라도
 * 적으면 「기록함」**으로 보고, 어느 영역이 비었는지는 따로 알려 준다.
 */
export function studentDayState(
  records: RecordLike[],
  studentId: string,
  date: string,
): { recorded: boolean; areas: GrowthArea[]; needsHelp: boolean } {
  const mine = records.filter((r) => r.student_id === studentId && r.on_date === date);
  return {
    recorded: mine.length > 0,
    areas: Array.from(new Set(mine.map((r) => r.area))),
    needsHelp: mine.some((r) => r.level === 'help'),
  };
}

/** 학교 전체의 오늘 진행도. 교사 홈의 머리띠에 쓴다. */
export function dayProgress(
  studentIds: string[],
  records: RecordLike[],
  attendance: AttendanceLike[],
  date: string,
): { recorded: number; total: number; attendanceDone: number; needHelp: string[] } {
  const recorded = studentIds.filter((id) => studentDayState(records, id, date).recorded);
  const attendanceDone = attendance.filter((a) => a.on_date === date && studentIds.includes(a.student_id));
  const needHelp = studentIds.filter((id) => studentDayState(records, id, date).needsHelp);
  return {
    recorded: recorded.length,
    total: studentIds.length,
    attendanceDone: attendanceDone.length,
    needHelp,
  };
}

// ───────────────────────── 균형 그림 ─────────────────────────

const LEVEL_SCORE: Record<GrowthLevel, number> = { great: 100, good: 78, ok: 56, help: 34 };

/**
 * 다섯 축의 균형(기획서 §4.3).
 *
 * **점수가 아니라 「기록이 어디에 쏠려 있는가」에 가깝다.** 그래서
 *  - 기록이 없는 축은 0 이 아니라 `null` 로 둔다. 안 적은 것과 못한 것은 다르다
 *    (중보기도 나무의 0/0 을 0 으로 둔 것과 같은 줄기의 판단이다).
 *  - 학생끼리 견주는 자리에는 쓰지 않는다. 지난달의 자기 자신하고만 견준다.
 *  - 교사 관찰(teacher)은 축에 넣지 않는다. 그건 아이의 값이 아니라 교사의 글이다.
 */
export function balanceScores(records: RecordLike[]): Record<Exclude<GrowthArea, 'teacher'>, number | null> {
  const axes: Exclude<GrowthArea, 'teacher'>[] = ['learning', 'attitude', 'relation', 'faith', 'health'];
  const out = {} as Record<Exclude<GrowthArea, 'teacher'>, number | null>;
  for (const axis of axes) {
    const scored = records.filter((r) => r.area === axis && r.level);
    out[axis] = scored.length
      ? Math.round(scored.reduce((sum, r) => sum + LEVEL_SCORE[r.level as GrowthLevel], 0) / scored.length)
      : null;
  }
  return out;
}

/** 지난달과의 변화. 「올랐다/내렸다」가 아니라 몇 점 차인지만 돌려준다. */
export function balanceDelta(
  now: Record<string, number | null>,
  before: Record<string, number | null>,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const key of Object.keys(now)) {
    const a = now[key];
    const b = before[key];
    out[key] = a === null || b === null || b === undefined ? null : a - b;
  }
  return out;
}

// ───────────────────────── 출결 셈 ─────────────────────────

export function attendanceSummary(rows: AttendanceLike[]): {
  total: number;
  counts: Record<AttendanceStatus, number>;
  sentence: string;
} {
  const counts = { present: 0, late: 0, absent: 0, excused: 0, early: 0, field: 0 } as Record<
    AttendanceStatus,
    number
  >;
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
  const parts: string[] = [];
  for (const a of ATTENDANCE) if (counts[a.id]) parts.push(`${a.label} ${counts[a.id]}일`);
  return {
    total: rows.length,
    counts,
    sentence: parts.length ? parts.join(' · ') : '기록된 출결이 없습니다',
  };
}

// ───────────────────────── 월간 성장보고서 초안 ─────────────────────────

export type MonthlyDraftInput = {
  studentName: string;
  period: string;
  records: RecordLike[];
  attendance: AttendanceLike[];
  activities: ActivityLike[];
  participants: ParticipantLike[];
  goals: GoalLike[];
  previousBalance?: Record<string, number | null>;
};

/**
 * 기획서 §4.6 의 아홉 꼭지를 순서대로 엮는다.
 *
 * 지어내지 않는다. 기록이 없는 꼭지는 빈 채로 두고 **「이 달에는 기록이
 * 없습니다」**라고 적는다 — 없는 것을 채우면 그 문장이 그대로 아이의 한 달이
 * 되어 보호자에게 간다. 교사의 편지와 다음 달 목표는 **일부러 비워 둔다**.
 * 사람이 쓰는 자리다.
 */
export function buildMonthlyDraft(input: MonthlyDraftInput): string {
  const { studentName, period, records, attendance, activities, participants, goals } = input;
  const inMonth = records.filter((r) => r.on_date.startsWith(period));
  const L: string[] = [];

  L.push(`# ${studentName} — ${formatKoreanMonth(period)} 성장 이야기`);
  L.push('');

  // 1. 한눈에 보기
  L.push('## 1. 이번 달 한눈에 보기');
  const att = attendanceSummary(attendance.filter((a) => a.on_date.startsWith(period)));
  L.push(`- 출결: ${att.sentence}`);
  L.push(`- 기록한 날: ${new Set(inMonth.map((r) => r.on_date)).size}일 · 관찰 기록 ${inMonth.length}건`);
  const monthActs = activities.filter((a) => a.on_date.startsWith(period));
  const joined = monthActs.filter((a) =>
    participants.some((p) => p.activity_id === a.id),
  );
  L.push(
    joined.length
      ? `- 체험활동: ${joined.map((a) => `${a.title}(${formatKoreanDate(a.on_date)})`).join(' · ')}`
      : '- 체험활동: 이 달에는 참여 기록이 없습니다',
  );
  L.push('');

  // 2~5. 영역별
  const sections: { title: string; areas: GrowthArea[] }[] = [
    { title: '2. 학습 성장', areas: ['learning'] },
    { title: '3. 신앙 성장', areas: ['faith'] },
    { title: '4. 인성·관계', areas: ['attitude', 'relation'] },
    { title: '5. 건강·생활', areas: ['health'] },
  ];
  for (const section of sections) {
    L.push(`## ${section.title}`);
    const rows = inMonth
      .filter((r) => section.areas.includes(r.area) && (r.body.trim() || r.level))
      .sort((a, b) => a.on_date.localeCompare(b.on_date));
    if (!rows.length) {
      L.push('이 달에는 기록이 없습니다.');
    } else {
      for (const r of rows) {
        const head = [r.subject?.trim(), levelLabel(r.level)].filter(Boolean).join(' · ');
        const body = r.body.trim();
        // 문장마다 근거 날짜를 단다(§8).
        L.push(`- ${body || head || areaLabel(r.area)}${head && body ? ` *(${head})*` : ''} *(${formatKoreanDate(r.on_date)})*`);
      }
      const scored = balanceScores(rows);
      const shown = section.areas
        .map((a) => (a === 'teacher' ? null : scored[a as Exclude<GrowthArea, 'teacher'>]))
        .filter((v): v is number => typeof v === 'number');
      if (shown.length) {
        const prev = input.previousBalance;
        const prevShown = prev
          ? section.areas
              .map((a) => prev[a])
              .filter((v): v is number => typeof v === 'number')
          : [];
        const avg = Math.round(shown.reduce((a, b) => a + b, 0) / shown.length);
        if (prevShown.length) {
          const prevAvg = Math.round(prevShown.reduce((a, b) => a + b, 0) / prevShown.length);
          const diff = avg - prevAvg;
          L.push(
            `*지난달 관찰과 견주면 ${diff === 0 ? '비슷합니다' : diff > 0 ? `${diff}만큼 올랐습니다` : `${-diff}만큼 낮게 기록되었습니다`}. (다른 학생과 견준 값이 아닙니다.)*`,
          );
        }
      }
    }
    L.push('');
  }

  // 6. 학생의 목소리
  L.push('## 6. 학생의 목소리');
  const voices = participants.filter((p) => (p.reflection || p.learned || p.thanks)?.trim());
  if (!voices.length) {
    L.push('이 달에는 학생이 직접 쓴 기록이 없습니다.');
  } else {
    for (const v of voices) {
      const act = activities.find((a) => a.id === v.activity_id);
      if (v.reflection?.trim()) L.push(`> ${v.reflection.trim()} *(${act?.title ?? '활동'})*`);
      if (v.learned?.trim()) L.push(`- 배운 점: ${v.learned.trim()}`);
      if (v.thanks?.trim()) L.push(`- 감사: ${v.thanks.trim()}`);
    }
  }
  L.push('');

  // 7. 교사의 편지 — 사람이 쓴다
  L.push('## 7. 교사의 편지');
  L.push('*(이 자리는 교사가 직접 씁니다. 자동으로 채우지 않습니다.)*');
  L.push('');

  // 8. 다음 달 지도 방향
  L.push('## 8. 다음 달 지도 방향');
  const next = suggestNextFocus(inMonth, goals);
  if (!next.length) {
    L.push('*(교사가 1~3개의 구체적 목표를 적습니다.)*');
  } else {
    for (const n of next) L.push(`- ${n}`);
    L.push('*(제안입니다. 교사가 고치고 확정합니다.)*');
  }
  L.push('');

  // 9. 가정에서 함께할 일
  L.push('## 9. 가정에서 함께할 일');
  L.push('*(부담 없는 실천 한두 가지를 교사가 적습니다.)*');

  return L.join('\n');
}

/**
 * 다음 달에 볼 곳을 고른다.
 *
 * **모델이 아니라 셈이다.** 「도움 필요」가 거듭 찍힌 영역, 교사가 적어 둔
 * 「다음 지도 행동」, 아직 열리지 않은 이번 달 목표 — 셋에서만 가져온다.
 * 성격을 말하지 않고 **무엇을 할지**만 말한다(§8).
 */
export function suggestNextFocus(records: RecordLike[], goals: GoalLike[]): string[] {
  const out: string[] = [];

  // 1) 교사가 직접 적어 둔 다음 행동이 가장 앞이다. 사람이 쓴 문장이다.
  const actions = records
    .filter((r) => r.next_action?.trim())
    .sort((a, b) => b.on_date.localeCompare(a.on_date));
  for (const a of actions.slice(0, 2)) {
    out.push(`${a.next_action!.trim()} *(${formatKoreanDate(a.on_date)} 기록)*`);
  }

  // 2) 「도움 필요」가 두 번 넘게 찍힌 영역.
  const helpByArea = new Map<GrowthArea, string[]>();
  for (const r of records) {
    if (r.level !== 'help') continue;
    helpByArea.set(r.area, [...(helpByArea.get(r.area) ?? []), r.on_date]);
  }
  for (const [area, dates] of helpByArea) {
    if (dates.length < 2) continue;
    out.push(
      `${areaLabel(area)} 영역에서 도움이 필요하다고 ${dates.length}번 기록되었습니다. 이 부분을 함께 봅니다. *(${dates
        .slice(0, 3)
        .map(formatKoreanDate)
        .join(', ')})*`,
    );
  }

  // 3) 아직 열려 있는 이번 달 목표.
  for (const g of goals.filter((g) => g.horizon === 'month' && g.status === 'active').slice(0, 2)) {
    out.push(`이어서: ${g.body}`);
  }

  return out.slice(0, 4);
}

/**
 * 강점 태그. 「매우 좋음/좋음」이 거듭 찍힌 영역만 뽑는다.
 *
 * 한 번 찍힌 것으로 강점이라 부르지 않는다(두 번 이상). 약점 태그는 만들지
 * 않는다 — 그건 꼬리표가 된다(§8).
 */
export function strengthTags(records: RecordLike[]): { area: GrowthArea; count: number }[] {
  const map = new Map<GrowthArea, number>();
  for (const r of records) {
    if (r.level !== 'great' && r.level !== 'good') continue;
    if (r.area === 'teacher') continue;
    map.set(r.area, (map.get(r.area) ?? 0) + 1);
  }
  return [...map.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([area, count]) => ({ area, count }));
}

// ───────────────────────── 체험활동 이야기 ─────────────────────────

/**
 * 보호자 공개용 활동 이야기 초안(기획서 §4.5).
 *
 * **학생 이름을 넣지 않는다.** 이 글은 반 전체 보호자가 읽는다. 누가 무엇을
 * 못했다는 말이 남의 집에 가면 안 된다. 개인 관찰은 그 아이의 보고서로 간다.
 */
export function buildActivityStory(
  activity: ActivityLike & { supplies?: string; safety?: string },
  participants: ParticipantLike[],
): string {
  const L: string[] = [];
  L.push(`## ${activity.title}`);
  L.push(`${formatKoreanDate(activity.on_date)}${activity.place ? ` · ${activity.place}` : ''}`);
  L.push('');
  if (activity.goal?.trim()) {
    L.push(`이번 활동은 **${activity.goal.trim()}**을(를) 목표로 했습니다.`);
    L.push('');
  }
  const joined = participants.length;
  L.push(`학생 ${joined}명이 함께했습니다.`);
  const roles = participants.map((p) => p.role?.trim()).filter(Boolean) as string[];
  if (roles.length) {
    L.push(`맡은 역할: ${Array.from(new Set(roles)).join(' · ')}`);
  }
  L.push('');
  const learned = participants.map((p) => p.learned?.trim()).filter(Boolean) as string[];
  if (learned.length) {
    L.push('### 아이들이 적은 배운 점');
    for (const l of Array.from(new Set(learned)).slice(0, 8)) L.push(`- ${l}`);
    L.push('');
  }
  const thanks = participants.map((p) => p.thanks?.trim()).filter(Boolean) as string[];
  if (thanks.length) {
    L.push('### 감사');
    for (const t of Array.from(new Set(thanks)).slice(0, 8)) L.push(`- ${t}`);
    L.push('');
  }
  L.push('*학생 개인에 대한 관찰은 이 글에 넣지 않습니다. 월간 성장보고서에서 보실 수 있습니다.*');
  return L.join('\n');
}

// ───────────────────────── 월말 마감 점검 ─────────────────────────

export type ClosingRow = {
  studentId: string;
  name: string;
  recordDays: number;
  recordCount: number;
  missingAreas: GrowthArea[];
  hasReport: boolean;
  reportStatus: 'none' | 'draft' | 'approved' | 'sent';
};

/**
 * 「이 학생의 이 달 기록으로 보고서를 쓸 수 있는가」.
 *
 * 빠진 영역을 세어 알려 주되 **막지는 않는다.** 아이가 한 달 아팠으면 기록이
 * 적은 것이 사실이고, 그 사실대로 보고서가 나가야 한다.
 */
export function closingChecklist(
  students: { id: string; name: string }[],
  records: RecordLike[],
  reports: { student_id: string; period: string; status: 'draft' | 'approved' | 'sent' }[],
  period: string,
): ClosingRow[] {
  const axes: GrowthArea[] = ['learning', 'attitude', 'relation', 'faith', 'health'];
  return students.map((s) => {
    const mine = records.filter((r) => r.student_id === s.id && r.on_date.startsWith(period));
    const seen = new Set(mine.map((r) => r.area));
    const report = reports.find((r) => r.student_id === s.id && r.period === period);
    return {
      studentId: s.id,
      name: s.name,
      recordDays: new Set(mine.map((r) => r.on_date)).size,
      recordCount: mine.length,
      missingAreas: axes.filter((a) => !seen.has(a)),
      hasReport: !!report,
      reportStatus: report?.status ?? 'none',
    };
  });
}

/** 기록이 얼마나 쌓였는지 한 마디로. 숫자만 있으면 충분한지 아닌지가 안 읽힌다. */
export function sufficiencyLabel(row: ClosingRow): { label: string; tone: 'good' | 'warn' | 'thin' } {
  if (row.recordDays >= 10 && row.missingAreas.length <= 1) return { label: '넉넉합니다', tone: 'good' };
  if (row.recordDays >= 4) return { label: '쓸 수 있습니다', tone: 'warn' };
  return { label: '기록이 적습니다', tone: 'thin' };
}

// ───────────────────────── 초대 코드 ─────────────────────────

/**
 * 헷갈리는 글자를 뺀 코드(0/O, 1/I/L). 종이에 적어 건네는 코드라서,
 * 옮겨 적다 틀리면 「쓸 수 없는 코드」만 뜨고 왜인지 알 길이 없다.
 */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function makeInviteCode(random: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < 8; i += 1) out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

export function normalizeInviteCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}
