/**
 * 블로그 글로 옮기는 일 (기획서 §10·§11).
 *
 * ── 이 파일이 지키는 한 가지 ────────────────────────────────────────
 * **아직 해석되지 않은 것에 결론을 붙이지 않는다**(§11 마지막 줄). 사람이
 * 「분별 중」이라고 표시해 둔 기록은 블로그에서도 분별 중이라고 적힌다. 글이
 * 허전해 보인다고 마무리 문장을 지어 붙이는 순간, 아직 오지 않은 일이 이미 온
 * 일처럼 읽힌다.
 *
 * 실명 가리기도 여기서 한다. 다만 **구조화된 칸(인물 목록)에 적힌 이름만** 바꾼다.
 * 본문 속 이름까지 기계가 찾아 지우려 들면 반드시 놓치는 것이 생기고, 놓친
 * 하나가 사람을 다치게 한다. 그래서 본문은 사람이 직접 확인하도록 미리보기에
 * 그대로 보여 주고, 바꿀 이름을 사용자가 짚어 주면 그 짝만 바꾼다.
 */
import { kindLabel, statusLabel, type StatusKey } from './kinds';
import { HONORIFIC, isFollowingParticle } from './organize';

export type BlogSection = { heading: string; body: string };

export type BlogInput = {
  title: string;
  kind: string;
  recordDate: string;
  /** 당시 상황 — 사용자가 적은 것만. 없으면 그 절은 아예 싣지 않는다. */
  situation?: string;
  /** 받은 내용 — 정리문(원문은 블로그에 싣지 않는다). */
  received: string;
  feeling?: string;
  interpretation?: string;
  status: StatusKey;
  verses?: string[];
  events?: { happenedOn?: string; body: string }[];
  /** 빼고 내보낼 절의 제목들 (§9 「공개하지 않을 부분 선택」). */
  omit?: string[];
  /** 이름 바꾸기 — { '김철수': '남편' } (§12). */
  aliases?: Record<string, string>;
};

/** 받침이 있는가. 한글 음절만 본다. */
function hasBatchim(word: string): { batchim: boolean; rieul: boolean } {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return { batchim: false, rieul: false };
  const final = code % 28;
  return { batchim: final !== 0, rieul: final === 8 };
}

/** 받침에 따라 갈리는 조사. 앞이 받침 있음 / 없음 순서다. */
const PARTICLE_PAIRS: [string, string][] = [
  ['으로', '로'], ['이라고', '라고'], ['이랑', '랑'], ['이라', '라'],
  ['은', '는'], ['이', '가'], ['을', '를'], ['과', '와'], ['아', '야'],
];

/** 바뀐 이름에 맞는 조사를 고른다. 「김철수 씨를」이 「교회 지인를」이 되면 안 된다. */
export function fixParticle(word: string, particle: string): string {
  const pair = PARTICLE_PAIRS.find(([a, b]) => a === particle || b === particle);
  if (!pair) return particle;
  const { batchim, rieul } = hasBatchim(word);
  // 「으로/로」만 규칙이 다르다 — ㄹ 받침은 「로」를 쓴다(서울로, 교회로).
  if (pair[0] === '으로') return batchim && !rieul ? '으로' : '로';
  return batchim ? pair[0] : pair[1];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 짝지어 준 이름만 바꾼다. 긴 이름부터 바꿔야 「김철」이 「김철수」를 깨지 않는다.
 *
 * **바로 뒤의 조사도 함께 고친다.** 「김철수 씨를 위해」를 그냥 바꾸면 「교회 지인를
 * 위해」가 되어, 실명을 가린 티가 글에 그대로 남는다. 읽는 사람이 먼저 알아챈다.
 */
export function applyAliases(text: string, aliases: Record<string, string> = {}): string {
  const pairs = Object.entries(aliases).sort((a, b) => b[0].length - a[0].length);
  let out = text;
  const tails = PARTICLE_PAIRS.flat().sort((a, b) => b.length - a.length).join('|');
  for (const [name, alias] of pairs) {
    if (!name.trim() || !alias.trim()) continue;
    const re = new RegExp(`${escapeRegExp(name)}(${tails})?`, 'g');
    out = out.replace(re, (_match, particle?: string) =>
      particle ? `${alias}${fixParticle(alias, particle)}` : alias);
  }
  return out;
}

/** 바꾸지 않은 이름이 본문에 남아 있으면 알린다 (§10 4번 「개인정보를 확인한다」). */
export function remainingNames(text: string, aliases: Record<string, string> = {}): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(HONORIFIC)) {
    if (!isFollowingParticle(match[3])) continue;
    if (!aliases[match[1]]) found.add(`${match[1]} ${match[2]}`);
  }
  for (const name of Object.keys(aliases)) {
    if (text.includes(name)) found.add(name);
  }
  return [...found];
}

const STATUS_LINE: Record<StatusKey, string> = {
  recorded: '아직 해석하지 않고 기록만 해 두었습니다.',
  discerning: '현재 기도하며 분별 중입니다.',
  partial: '일부 의미만 이해한 상태입니다.',
  related: '관련된 일이 있어 함께 적어 둡니다.',
  confirmed: '이 기록과 연결되었다고 판단하는 일이 있었습니다.',
  held: '판단을 보류하고 그대로 두었습니다.',
};

/** §11 의 차례 그대로 절을 세운다. 사용자가 적지 않은 절은 만들지 않는다. */
export function buildSections(input: BlogInput): BlogSection[] {
  const alias = (t: string) => applyAliases(t, input.aliases);
  const omit = new Set(input.omit ?? []);
  const sections: BlogSection[] = [];

  const push = (heading: string, body: string | undefined) => {
    const text = (body ?? '').trim();
    if (!text || omit.has(heading)) return;
    sections.push({ heading, body: alias(text) });
  };

  push('당시 상황', input.situation);
  push('받은 내용', input.received);
  push('당시의 느낌과 생각', input.feeling);

  const discern = [input.interpretation?.trim(), STATUS_LINE[input.status]]
    .filter(Boolean)
    .join('\n\n');
  push('현재의 해석 또는 분별 상태', discern);

  if (input.verses?.length) push('관련 말씀', input.verses.join(', '));

  if (input.events?.length) {
    const body = input.events
      .map((e) => (e.happenedOn ? `${e.happenedOn} — ${e.body}` : e.body))
      .join('\n\n');
    push('이후 확인된 내용 또는 관련 사건', body);
  }

  return sections;
}

export function blogMarkdown(input: BlogInput): string {
  const head = `# ${applyAliases(input.title, input.aliases)}\n\n${input.recordDate} · ${kindLabel(input.kind)} · ${statusLabel(input.status)}`;
  const body = buildSections(input)
    .map((s) => `## ${s.heading}\n\n${s.body}`)
    .join('\n\n');
  return `${head}\n\n${body}\n`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 워드프레스로 보낼 본문. 블록 에디터가 그대로 받아 주는 최소한의 html 만 쓴다. */
export function blogHtml(input: BlogInput): string {
  const meta = `<p><em>${escapeHtml(input.recordDate)} · ${escapeHtml(kindLabel(input.kind))} · ${escapeHtml(statusLabel(input.status))}</em></p>`;
  const body = buildSections(input)
    .map((s) => {
      const paragraphs = s.body
        .split(/\n{2,}/)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br />')}</p>`)
        .join('\n');
      return `<h2>${escapeHtml(s.heading)}</h2>\n${paragraphs}`;
    })
    .join('\n');
  return `${meta}\n${body}`;
}

/** 제목 후보 (§9). 지어내지 않고 있는 글에서 고른다. */
export function titleCandidates(input: { title: string; recordDate: string; kind: string; received: string }): string[] {
  const out = new Set<string>();
  if (input.title.trim()) out.add(input.title.trim());
  const first = input.received.split(/(?<=[.!?])\s/)[0]?.replace(/[.!?]$/, '').trim();
  if (first && first.length <= 40) out.add(first);
  out.add(`${input.recordDate} ${kindLabel(input.kind)} 기록`);
  if (first) out.add(`${kindLabel(input.kind)} — ${first.slice(0, 24)}`);
  return [...out];
}
