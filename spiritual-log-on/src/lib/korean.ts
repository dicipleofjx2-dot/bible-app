/**
 * 한국어를 다루는 잔손질.
 *
 * 형태소 분석기를 싣지 않았다. 사전 한 벌과 조사 떼기로 얻는 결과는 분석기보다
 * 거칠지만, **이 프로그램이 내놓는 것은 전부 「추천」이고 확정은 사용자가 한다**
 * (기획서 §6). 그래서 틀려도 사용자가 지우면 그만인 자리에만 쓴다 — 본문을
 * 기계가 고쳐 쓰는 일에는 쓰지 않는다.
 */

/** 문장 끝으로 자른다. 말줄임표와 소수점은 끝이 아니다. */
export function sentences(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const out: string[] = [];
  let buf = '';
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    buf += ch;
    if (ch === '.' || ch === '?' || ch === '!') {
      const next = normalized[i + 1] ?? '';
      const prev = normalized[i - 1] ?? '';
      if (ch === '.' && (next === '.' || prev === '.')) continue;
      if (ch === '.' && /[0-9]/.test(prev) && /[0-9]/.test(next)) continue;
      if (next === '' || next === ' ') {
        out.push(buf.trim());
        buf = '';
      }
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** 자주 붙는 조사만 꼬리에서 뗀다. 낱말 세기와 이름 찾기에만 쓴다. */
const PARTICLES = [
  '에게서', '으로부터', '이라고', '라고', '에서는', '에서도', '에게는', '한테서',
  '에서', '에게', '한테', '으로', '까지', '부터', '보다', '처럼', '만큼', '이랑',
  '와의', '과의', '의', '을', '를', '이', '가', '은', '는', '도', '만', '로', '와', '과', '에',
];

export function stripParticle(word: string): string {
  for (const p of PARTICLES) {
    if (word.length > p.length + 1 && word.endsWith(p)) return word.slice(0, -p.length);
  }
  return word;
}

/** 뜻을 담지 않는 낱말. 세어 봐야 의미가 없다. */
const STOPWORDS = new Set([
  '그리고', '그래서', '그런데', '하지만', '그러나', '그러면', '그러니까', '그때',
  '이제', '지금', '오늘', '어제', '내일', '정말', '진짜', '너무', '조금', '많이',
  '하는', '했던', '있는', '없는', '같은', '이런', '저런', '그런', '무슨', '어떤',
  '것을', '것이', '것은', '거기', '여기', '저기', '우리', '제가', '내가', '나는',
  '자꾸', '계속', '다시', '아주', '그냥', '약간', '정도', '하고', '해서', '되고',
]);

export function isStopword(word: string): boolean {
  return STOPWORDS.has(word);
}

/** 낱말을 세어 잦은 것부터 돌려준다. 조사를 떼고 두 글자 이상만 본다. */
export function wordCounts(text: string, min = 2): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const raw of text.split(/[^가-힣A-Za-z0-9]+/)) {
    if (!raw) continue;
    const word = stripParticle(raw);
    if (word.length < min) continue;
    if (isStopword(word) || isStopword(raw)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

/** 겹치는 부분을 얼마나 함께 쓰는지 (0~1). 비슷한 기록을 이을 때 쓴다. */
export function overlap(a: string, b: string): number {
  const wa = new Set(wordCounts(a).map((w) => w.word));
  const wb = new Set(wordCounts(b).map((w) => w.word));
  if (!wa.size || !wb.size) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared / Math.min(wa.size, wb.size);
}
