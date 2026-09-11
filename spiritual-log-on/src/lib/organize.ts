/**
 * 말한 것을 글로 세우는 일 — **규칙만으로** 한다.
 *
 * ── 왜 언어모델을 부르지 않는가 ─────────────────────────────────────
 * 이 앱이 다루는 글은 꿈·환상·예언이다. 남편과 자녀의 실명, 교회의 사정,
 * 어떤 사람을 향해 받았다고 인식한 메시지가 그대로 적힌다(기획서 §12 — 모든
 * 기록은 기본 비공개). 그것을 정리해 달라고 통째로 밖으로 보내는 것은,
 * 「기본 비공개」라고 적어 놓은 첫 줄과 정면으로 부딪힌다.
 *
 * 그리고 §8 이 요구하는 것은 똑똑함이 아니라 **절제**다 — 말하지 않은 장면·사람·
 * 말씀을 보태지 않을 것, 종류를 임의로 확정하지 않을 것, 의미를 바꾸지 않을 것.
 * 규칙은 모델보다 덜 똑똑하지만 **없는 말을 지어내지 못한다.** 이 일에서는 그것이
 * 더 중요한 성질이다.
 *
 * 그래서 이 파일의 모든 함수는 다음을 지킨다.
 *   1. 글자를 **덜어내기만** 한다. 새 문장을 만들지 않는다.
 *   2. 종류·태그·나누기는 전부 **추천**이고 이유를 함께 돌려준다.
 *   3. 원문은 어디서도 지우지 않는다. 정리문은 언제나 사본이다.
 *
 * 나중에 모델을 붙이고 싶어지면 `organize()` 하나만 갈아 끼우면 된다.
 * 화면은 이 파일의 반환 모양만 본다.
 */
import { KINDS, type KindKey } from './kinds';
import { sentences, stripParticle, wordCounts } from './korean';

// ── 1. 여러 기록 나누기 (기획서 §4) ───────────────────────────────────

/** 「여기서부터 다른 이야기」라고 사람이 말할 때 쓰는 말. */
const BREAK_MARKERS: { re: RegExp; weight: number; why: string }[] = [
  { re: /^(그리고 )?(또 )?다른 (꿈|환상|이야기|기록)/, weight: 3, why: '「다른 꿈·이야기」로 시작합니다' },
  { re: /^(또 )?하나(는| 더)/, weight: 2, why: '「또 하나」로 시작합니다' },
  { re: /^(그리고 )?(두|세|네|다섯) ?번째/, weight: 3, why: '번호를 붙여 말합니다' },
  { re: /^다음(은|으로)/, weight: 2, why: '「다음은」으로 시작합니다' },
  { re: /^(그리고 )?(어젯밤|어제|오늘 아침|새벽|저녁|낮)에(는| )/, weight: 2, why: '때가 새로 나옵니다' },
  { re: /^(그리고 )?기도 (중|하는 중|하다가)/, weight: 2, why: '자리가 새로 나옵니다' },
  { re: /^이건 (좀 )?다른/, weight: 3, why: '「이건 다른」이라고 말합니다' },
  { re: /^(자|그럼|이제) (다음|또)/, weight: 2, why: '넘어가는 말이 있습니다' },
];

export type Segment = {
  text: string;
  /** 0~1. 낮으면 화면이 「이렇게 나눌까요?」라고 되묻는다(§15). */
  confidence: number;
  /** 왜 여기서 나누었는지. 사람이 뒤집을 수 있게 늘 보여 준다. */
  why: string;
};

/**
 * 한 녹음 안에 여러 기록이 있으면 나눈다.
 *
 * **짧은 토막은 만들지 않는다.** 「그리고 어제」 한마디에 두 글자짜리 기록이
 * 떨어져 나오면, 사용자가 할 일이 줄기는커녕 합치는 일이 늘어난다.
 */
export function splitSegments(transcript: string, minChars = 60): Segment[] {
  const all = sentences(transcript);
  if (!all.length) return [];

  const cuts: { at: number; weight: number; why: string }[] = [];
  all.forEach((sentence, i) => {
    if (i === 0) return;
    for (const marker of BREAK_MARKERS) {
      if (marker.re.test(sentence)) {
        cuts.push({ at: i, weight: marker.weight, why: marker.why });
        break;
      }
    }
  });

  if (!cuts.length) {
    return [{ text: all.join(' '), confidence: 1, why: '나눌 곳을 찾지 못했습니다' }];
  }

  const bounds = [0, ...cuts.map((c) => c.at), all.length];
  const out: Segment[] = [];
  for (let i = 0; i < bounds.length - 1; i += 1) {
    const text = all.slice(bounds[i], bounds[i + 1]).join(' ').trim();
    const cut = i === 0 ? null : cuts[i - 1];
    if (!text) continue;
    // 너무 짧으면 앞에 도로 붙인다.
    if (text.length < minChars && out.length) {
      out[out.length - 1].text = `${out[out.length - 1].text} ${text}`.trim();
      continue;
    }
    out.push({
      text,
      confidence: cut ? Math.min(1, 0.5 + cut.weight * 0.15) : 1,
      why: cut ? cut.why : '녹음의 첫 부분입니다',
    });
  }
  return out.length ? out : [{ text: transcript.trim(), confidence: 1, why: '나눌 곳을 찾지 못했습니다' }];
}

// ── 2. 군더더기 덜어내기 (기획서 §5 「정리된 기록」) ──────────────────

/** 혼자 떨어져 나왔을 때만 지우는 말. 문장 안에서는 뜻을 지닐 수 있다. */
const FILLERS = new Set([
  '어', '음', '아', '에', '뭐', '막', '이제', '인제', '저기', '그러니까',
  '그니까', '뭐랄까', '뭐냐면', '어쨌든', '아무튼', '근데', '그래가지고',
]);

/**
 * 말할 때 붙는 군더더기만 덜어낸다.
 *
 * **문장을 새로 쓰지 않는다.** 지우는 것은 (1) 혼자 선 군말, (2) 바로 겹쳐 나온
 * 같은 낱말(「그 그 그 사람이」), (3) 겹친 공백뿐이다. 그 밖의 모든 글자는
 * 말한 그대로 남는다 — 다듬다가 뜻이 바뀌면 그것은 이미 그 사람의 기록이 아니다.
 */
export function tidy(text: string): string {
  const out: string[] = [];
  for (const sentence of sentences(text)) {
    const kept: string[] = [];
    for (const token of sentence.split(' ')) {
      const bare = token.replace(/[.,!?]/g, '');
      if (FILLERS.has(bare)) continue;
      if (kept.length && kept[kept.length - 1].replace(/[.,!?]/g, '') === bare) continue;
      kept.push(token);
    }
    const line = kept.join(' ').replace(/\s+([.,!?])/g, '$1').trim();
    if (line && line.replace(/[.,!?]/g, '').length) out.push(line);
  }
  return out.join(' ');
}

/** 문장 끝을 경어체로만 바꾼다(§5 기본 문체). 끝 말고는 건드리지 않는다. */
const POLITE: [RegExp, string][] = [
  [/했다([.!?]?)$/, '했습니다$1'], [/였다([.!?]?)$/, '였습니다$1'],
  [/이다([.!?]?)$/, '입니다$1'], [/였어([.!?]?)$/, '였습니다$1'],
  [/했어([.!?]?)$/, '했습니다$1'], [/봤어([.!?]?)$/, '보았습니다$1'],
  [/있었다([.!?]?)$/, '있었습니다$1'], [/없었다([.!?]?)$/, '없었습니다$1'],
  [/같다([.!?]?)$/, '같습니다$1'], [/한다([.!?]?)$/, '합니다$1'],
  [/된다([.!?]?)$/, '됩니다$1'], [/든다([.!?]?)$/, '듭니다$1'],
  [/있어([.!?]?)$/, '있습니다$1'], [/없어([.!?]?)$/, '없습니다$1'],
];

export function toPolite(text: string): string {
  return sentences(text)
    .map((sentence) => {
      for (const [re, to] of POLITE) {
        if (re.test(sentence)) return sentence.replace(re, to);
      }
      return sentence;
    })
    .join(' ');
}

// ── 3. 핵심 요약 (기획서 §5) ──────────────────────────────────────────

/**
 * 요약은 **고르는 일**이지 쓰는 일이 아니다.
 *
 * 잦은 낱말을 많이 담은 문장을 3~5개 골라 **말한 순서 그대로** 잇는다. 새 문장을
 * 짓지 않으므로 요약문에는 사용자가 하지 않은 말이 한 글자도 들어가지 않는다.
 */
export function summarize(text: string, max = 4): string[] {
  const all = sentences(text);
  if (all.length <= max) return all;
  const weights = new Map(wordCounts(text).map((w) => [w.word, w.count]));
  const scored = all.map((sentence, index) => {
    let score = 0;
    for (const raw of sentence.split(/[^가-힣A-Za-z0-9]+/)) {
      const word = stripParticle(raw);
      score += weights.get(word) ?? 0;
    }
    // 첫 문장은 대개 「언제·어디서」를 담는다.
    if (index === 0) score *= 1.4;
    return { sentence, index, score: score / Math.max(1, Math.sqrt(sentence.length)) };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(3, Math.min(max, all.length)))
    .sort((a, b) => a.index - b.index)
    .map((s) => s.sentence);
}

/** 제목도 지어내지 않는다. 첫 문장에서 따온다. */
export function titleFor(text: string, kindLabelText: string, date: string): string {
  const first = sentences(text)[0] ?? '';
  const words = first.split(' ').filter(Boolean);
  let head = '';
  for (const word of words) {
    if ((head + ' ' + word).trim().length > 22) break;
    head = `${head} ${word}`.trim();
  }
  head = head.replace(/[.,!?]$/, '');
  if (!head) return `${date} ${kindLabelText}`;
  return `${head}`;
}

// ── 4. 종류 추천 (기획서 §2·§8 — 확정하지 않는다) ─────────────────────

const KIND_HINTS: Record<KindKey, { re: RegExp; why: string }[]> = {
  dream: [
    { re: /꿈(을|에서|에|속|이|은)?/, why: '「꿈」이라는 말이 있습니다' },
    { re: /자다가|잠결|잠에서 깨|새벽에 깨/, why: '잠과 관련된 말이 있습니다' },
  ],
  vision: [
    { re: /환상|보여지|눈앞에 펼쳐|시야에|장면이 떠올/, why: '「환상·장면」이라는 말이 있습니다' },
    { re: /기도 (중|하는데).{0,12}(보였|보이)/, why: '기도 중에 보았다고 말합니다' },
  ],
  prophecy: [
    { re: /예언|말씀하시기를|이렇게 말씀|주께서 말씀|라고 하셨/, why: '받은 말을 옮기는 표현이 있습니다' },
    { re: /(교회|민족|나라|이 땅|이 시대)(를|에게|에) 향한/, why: '대상을 향한 메시지로 말합니다' },
  ],
  impression: [
    { re: /마음에 (강하게 )?(와닿|주어|떠올|들어)/, why: '마음에 와닿았다고 말합니다' },
    { re: /감동|깨달|생각이 들었/, why: '「감동·깨달음」이라는 말이 있습니다' },
  ],
  word: [
    { re: /말씀을 (읽|묵상|보)/, why: '말씀을 읽는 중이라고 말합니다' },
    { re: /[가-힣]{1,4}\s?\d+[:장]\s?\d*/, why: '성경 구절이 나옵니다' },
  ],
  prayer: [
    { re: /기도\s?(중|하는 중|하다가|하면서)/, why: '기도 중이라고 말합니다' },
    { re: /중보|기도 제목/, why: '기도 제목을 말합니다' },
  ],
  etc: [],
};

export type KindGuess = { kind: KindKey; label: string; score: number; why: string[] };

/** 종류는 **추천만** 한다(§8). 점수와 이유를 함께 돌려주고 고르는 것은 사용자다. */
export function guessKind(text: string): KindGuess[] {
  const guesses: KindGuess[] = [];
  for (const kind of KINDS) {
    const hints = KIND_HINTS[kind.key] ?? [];
    const why: string[] = [];
    let score = 0;
    for (const hint of hints) {
      if (hint.re.test(text)) {
        score += 1;
        why.push(hint.why);
      }
    }
    if (score) guesses.push({ kind: kind.key, label: kind.label, score, why });
  }
  return guesses.sort((a, b) => b.score - a.score);
}

// ── 5. 태그 추천 (기획서 §6) ──────────────────────────────────────────

const BIBLE_BOOKS = [
  '창세기', '출애굽기', '레위기', '민수기', '신명기', '여호수아', '사사기', '룻기',
  '사무엘상', '사무엘하', '열왕기상', '열왕기하', '역대상', '역대하', '에스라',
  '느헤미야', '에스더', '욥기', '시편', '잠언', '전도서', '아가', '이사야',
  '예레미야', '예레미야애가', '에스겔', '다니엘', '호세아', '요엘', '아모스',
  '오바댜', '요나', '미가', '나훔', '하박국', '스바냐', '학개', '스가랴', '말라기',
  '마태복음', '마가복음', '누가복음', '요한복음', '사도행전', '로마서',
  '고린도전서', '고린도후서', '갈라디아서', '에베소서', '빌립보서', '골로새서',
  '데살로니가전서', '데살로니가후서', '디모데전서', '디모데후서', '디도서',
  '빌레몬서', '히브리서', '야고보서', '베드로전서', '베드로후서',
  '요한일서', '요한이서', '요한삼서', '유다서', '요한계시록',
];

const RELATIONS = [
  '남편', '아내', '아들', '딸', '어머니', '아버지', '엄마', '아빠', '형', '누나',
  '오빠', '언니', '동생', '아이', '첫째', '둘째', '셋째', '할머니', '할아버지',
  '목사님', '사모님', '전도사님', '집사님', '권사님', '장로님', '성도님', '선교사님',
];

const TOPICS: { label: string; re: RegExp }[] = [
  { label: '교회와 사역', re: /교회|예배|사역|목회|전도|선교|제자훈련|셀|구역/ },
  { label: '가족과 자녀', re: /가족|자녀|아이|남편|아내|부모|집안/ },
  { label: '국가와 지역', re: /나라|민족|이 땅|도시|지역|한국|북한|열방/ },
  { label: '치유와 건강', re: /치유|낫|아프|병원|수술|건강|통증/ },
  { label: '위로', re: /위로|괜찮|품어|안아|쉬게/ },
  { label: '경고', re: /경고|조심|돌이키|회개하라|깨어/ },
  { label: '회복', re: /회복|다시 세우|일으켜|돌아오/ },
  { label: '인도', re: /인도|길을 여|보내시|가라고/ },
  { label: '중보', re: /중보|대신 기도|위해 기도/ },
];

const EMOTIONS: { label: string; re: RegExp }[] = [
  { label: '두려움', re: /두렵|무섭|겁이|떨렸/ },
  { label: '평안', re: /평안|편안|잔잔|고요/ },
  { label: '기쁨', re: /기뻤|기쁨|즐거|감사/ },
  { label: '슬픔', re: /슬펐|슬픔|울었|눈물/ },
  { label: '무거움', re: /무거|답답|막막/ },
  { label: '뜨거움', re: /뜨거|불같|타오르/ },
  { label: '놀람', re: /놀랐|깜짝|충격/ },
];

/**
 * 「OO 씨」, 「OO 님」을 찾는 자리. 세 번째 묶음은 뒤에 붙은 조사다.
 * 이 둘은 블로그 실명 가리기(`lib/blog.ts`)에서도 그대로 쓴다 — 한쪽만 고치면
 * 화면에는 이름이 잡히는데 발행 직전 경고에는 안 잡히는 일이 생긴다.
 */
export const HONORIFIC = /([가-힣]{2,4})\s?(씨|님)([가-힣]{0,3})/g;

/** 이름 뒤에 올 수 있는 조사. 여기 없으면 낱말의 일부로 보고 이름으로 세지 않는다. */
const NAME_PARTICLES = new Set([
  '', '가', '는', '이', '은', '을', '를', '와', '과', '도', '만', '의', '께',
  '께서', '에게', '한테', '랑', '이랑', '보다', '처럼', '께는', '께서는', '에게는',
]);

export function isFollowingParticle(tail: string): boolean {
  return NAME_PARTICLES.has(tail ?? '');
}

/** 장소처럼 보이는 말의 꼬리. 이것만으로 장소를 단정하지 않고 후보로 둔다. */
const PLACE_TAILS = /(교회|성전|집|병원|학교|산|바다|강|길|들판|광장|도시|마을|나라|방|사무실|공항|다리|계단|문|골목)$/;

export type Tags = {
  people: string[];
  places: string[];
  topics: string[];
  emotions: string[];
  verses: string[];
  symbols: string[];
};

/** 성경 구절을 찾는다. 「창세기 1:1」, 「요한복음 3장 16절」, 「시편 23편」. */
export function findVerses(text: string): string[] {
  const found = new Set<string>();
  for (const book of BIBLE_BOOKS) {
    const re = new RegExp(`${book}\\s?(\\d+)\\s?(?:[:장편])\\s?(\\d+)?\\s?절?`, 'g');
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      found.add(match[2] ? `${book} ${match[1]}:${match[2]}` : `${book} ${match[1]}장`);
    }
  }
  return [...found];
}

export function extractTags(text: string): Tags {
  const people = new Set<string>();
  for (const relation of RELATIONS) {
    if (text.includes(relation)) people.add(relation);
  }
  // 「OO 씨」, 「OO 님」처럼 이름을 부르는 자리.
  // 뒤에 붙은 글자가 **조사일 때만** 이름으로 본다. 그냥 「뒤에 한글이 없을 것」으로
  // 두었더니 「김철수 씨가」의 「가」 때문에 이름이 통째로 빠졌다.
  for (const match of text.matchAll(HONORIFIC)) {
    const name = match[1];
    if (!isFollowingParticle(match[3])) continue;
    if (!RELATIONS.includes(name) && name.length >= 2) people.add(`${name} ${match[2]}`);
  }

  const places = new Set<string>();
  for (const raw of text.split(/[^가-힣]+/)) {
    const word = stripParticle(raw);
    if (word.length >= 2 && PLACE_TAILS.test(word)) places.add(word);
  }

  const topics = TOPICS.filter((t) => t.re.test(text)).map((t) => t.label);
  const emotions = EMOTIONS.filter((e) => e.re.test(text)).map((e) => e.label);

  // 반복되는 상징: 세 번 넘게 나온 낱말 가운데 사람·장소·주제로 이미 잡히지 않은 것.
  const claimed = new Set([...people, ...places]);
  const symbols = wordCounts(text)
    .filter((w) => w.count >= 3 && !claimed.has(w.word) && w.word.length >= 2)
    .slice(0, 6)
    .map((w) => `${w.word} (${w.count}번)`);

  return {
    people: [...people],
    places: [...places],
    topics,
    emotions,
    verses: findVerses(text),
    symbols,
  };
}

// ── 6. 확인이 필요한 자리 (기획서 §8) ─────────────────────────────────

/**
 * 알아듣지 못한 자리에 `[확인 필요]`를 세운다.
 *
 * **받아쓰기는 틀린 자리를 알려 주지 않는다.** 그래서 확실히 알 수 있는 두
 * 가지만 표시한다 — (1) 한글 사이에 끼어든 로마자 토막(받아쓰기가 소리를
 * 흉내 낸 흔적), (2) 사용자가 직접 넣은 물음표 연속. 나머지는 표시하지 않는다.
 * 멀쩡한 말에 물음표를 달아 두면 나중에 읽는 사람이 자기 기억을 의심한다.
 */
export function markUncertain(text: string): string {
  return text
    .replace(/(?<=[가-힣])\s?([A-Za-z]{2,})\s?(?=[가-힣])/g, ' $1[확인 필요] ')
    .replace(/\?{2,}/g, '[확인 필요]')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── 7. 한 번에 (화면이 부르는 것은 이것 하나) ─────────────────────────

export type Organized = {
  raw: string;
  clean: string;
  summary: string[];
  title: string;
  kindGuesses: KindGuess[];
  tags: Tags;
  confidence: number;
  why: string;
};

export function organize(
  segment: Segment,
  options: { date: string; polite?: boolean } = { date: '' },
): Organized {
  const raw = markUncertain(segment.text.trim());
  const tidied = tidy(raw);
  const clean = options.polite === false ? tidied : toPolite(tidied);
  const kindGuesses = guessKind(raw);
  const label = kindGuesses[0] ? kindGuesses[0].label : '기록';
  return {
    raw,
    clean,
    summary: summarize(clean),
    title: titleFor(clean, label, options.date),
    kindGuesses,
    tags: extractTags(raw),
    confidence: segment.confidence,
    why: segment.why,
  };
}

/**
 * 사람이 녹음 중에 **직접** 나눈 자리를 먼저 지킨다.
 *
 * 녹음 화면의 「새 기록으로 나누기」는 빈 줄 하나로 남는다(§9). 규칙이 짐작한
 * 자리보다 사람이 짚은 자리가 언제나 우선이다 — 그리고 이 방식이면 나누기
 * 위해 본문에 「다음 기록」 같은 **말을 끼워 넣지 않아도 된다**(§8).
 */
export function splitTranscript(transcript: string): Segment[] {
  const blocks = transcript
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length <= 1) return splitSegments(transcript);
  return blocks.flatMap((block, i) => {
    const inner = splitSegments(block);
    if (i === 0) return inner;
    // 블록의 첫 토막만 「사람이 나눈 자리」로 표시한다.
    return inner.map((segment, j) =>
      j === 0 ? { ...segment, confidence: 1, why: '녹음 중에 직접 나누었습니다' } : segment);
  });
}

/** 녹음 한 개 → 기록 여러 개. 화면은 이 결과를 나누기·합치기로 손본다. */
export function organizeTranscript(transcript: string, date: string): Organized[] {
  return splitTranscript(transcript).map((segment) => organize(segment, { date }));
}
