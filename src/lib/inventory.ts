/**
 * 물품관리ON 의 셈. 화면도 서버도 섞지 않은 순수 함수만 둔다.
 *
 * 화면을 못 띄우는 환경에서도 검사할 수 있도록 갈라 두었다(prayerTree.ts,
 * missionArchive.ts 와 같은 방식). 여기 있는 것은 전부 「같은 값을 넣으면 같은
 * 값이 나오는」 함수다.
 */

export type OrgKind = 'church' | 'home' | 'other';
export type SpaceKind = 'building' | 'floor' | 'room' | 'storage';
export type ItemStatus =
  | 'in_use'
  | 'stored'
  | 'loaned'
  | 'repair'
  | 'used_up'
  | 'to_dispose'
  | 'disposed'
  | 'lost'
  | 'donated'
  | 'sold';
export type LogKind =
  | 'create'
  | 'in'
  | 'out'
  | 'adjust'
  | 'move'
  | 'status'
  | 'edit'
  | 'dispose'
  | 'restore';

export const ORG_KINDS: { id: OrgKind; label: string; emoji: string; hint: string }[] = [
  { id: 'church', label: '교회', emoji: '⛪', hint: '본당·교육관·사무실·주방·창고·방송실' },
  { id: 'home', label: '가정', emoji: '🏠', hint: '거실·주방·안방·자녀방·베란다·창고' },
  { id: 'other', label: '그 밖', emoji: '🏫', hint: '대안학교·사역센터·선교지·사업장' },
];

export const SPACE_KINDS: { id: SpaceKind; label: string; emoji: string; hint: string }[] = [
  { id: 'building', label: '건물·구역', emoji: '🏢', hint: '본관, 교육관, 별관' },
  { id: 'floor', label: '층', emoji: '🛗', hint: '1층, 지하 1층 (없으면 건너뛰세요)' },
  { id: 'room', label: '방·장소', emoji: '🚪', hint: '방송실, 주방, 창고' },
  { id: 'storage', label: '수납 위치', emoji: '🗄️', hint: '오른쪽 철제장, 싱크대 하부장' },
];

/** 한 단계 아래에 무엇을 둘 수 있는가. 층이 없는 집은 방을 바로 달면 된다(§3.2). */
export const CHILD_KINDS: Record<SpaceKind | 'root', SpaceKind[]> = {
  root: ['building', 'floor', 'room', 'storage'],
  building: ['floor', 'room', 'storage'],
  floor: ['room', 'storage'],
  room: ['storage'],
  storage: ['storage'],
};

export const STATUS_META: Record<ItemStatus, { label: string; tone: StatusTone; emoji: string }> = {
  in_use: { label: '사용 중', tone: 'good', emoji: '🟢' },
  stored: { label: '보관 중', tone: 'calm', emoji: '📦' },
  loaned: { label: '대여 중', tone: 'warn', emoji: '🤝' },
  repair: { label: '수리 중', tone: 'warn', emoji: '🛠️' },
  used_up: { label: '사용 완료', tone: 'quiet', emoji: '✅' },
  to_dispose: { label: '폐기 예정', tone: 'warn', emoji: '🗑️' },
  disposed: { label: '폐기', tone: 'quiet', emoji: '🗑️' },
  lost: { label: '분실', tone: 'alert', emoji: '❓' },
  donated: { label: '기증', tone: 'quiet', emoji: '🎁' },
  sold: { label: '매각', tone: 'quiet', emoji: '💵' },
};

export type StatusTone = 'good' | 'calm' | 'warn' | 'alert' | 'quiet';

/** 처분 화면에서 고르는 사유(§4.9). 「사용 완료」와 「폐기」를 가르는 것이 요점이다. */
export const DISPOSE_REASONS: { id: ItemStatus; label: string; hint: string }[] = [
  { id: 'used_up', label: '사용 완료', hint: '다 썼습니다. 구입·사용 기록은 남습니다.' },
  { id: 'disposed', label: '폐기', hint: '버렸습니다.' },
  { id: 'lost', label: '분실', hint: '찾지 못했습니다.' },
  { id: 'donated', label: '기증', hint: '다른 곳에 드렸습니다.' },
  { id: 'sold', label: '매각', hint: '팔았습니다.' },
  { id: 'to_dispose', label: '폐기 예정', hint: '버릴 예정입니다. 아직 남아 있습니다.' },
];

export const LOG_LABEL: Record<LogKind, string> = {
  create: '등록',
  in: '입고·채움',
  out: '사용·출고',
  adjust: '수량 조정',
  move: '위치 이동',
  status: '상태 변경',
  edit: '정보 수정',
  dispose: '처분',
  restore: '되돌림',
};

export const CHURCH_CATEGORIES = [
  '예배·성례',
  '음향·영상·방송',
  '악기',
  '교육·교재',
  '주방·식당',
  '사무·문구',
  '시설·공구',
  '청소·위생',
  '행사·장식',
  '차량',
  '구제·선교',
  '비품·가구',
];

export const HOME_CATEGORIES = [
  '주방용품',
  '식품·소모품',
  '의류·침구',
  '문구·책',
  '전자제품',
  '공구·수리용품',
  '청소·세탁',
  '욕실·위생',
  '의약·건강',
  '장난감·교육용품',
  '계절용품',
  '보관·기념품',
];

export function categoriesFor(kind: OrgKind): string[] {
  if (kind === 'home') return HOME_CATEGORIES;
  if (kind === 'church') return CHURCH_CATEGORIES;
  // 그 밖의 공간은 두 벌을 합쳐 보여 준다. 사역센터는 교회와 가정이 섞인다.
  return [...CHURCH_CATEGORIES, ...HOME_CATEGORIES.filter((c) => !CHURCH_CATEGORIES.includes(c))];
}

/** 사진이 없을 때 자리를 채울 그림 대신 쓰는 글자(§4.1 「기본 일러스트」). */
export function categoryEmoji(category: string, fallback = '📦'): string {
  const table: [RegExp, string][] = [
    [/음향|영상|방송|전자/, '🎛️'],
    [/악기/, '🎹'],
    [/교육|교재|문구|책/, '📚'],
    [/주방|식당|식품/, '🍽️'],
    [/사무/, '🖇️'],
    [/시설|공구|수리/, '🧰'],
    [/청소|위생|세탁/, '🧽'],
    [/행사|장식|기념/, '🎀'],
    [/차량/, '🚐'],
    [/구제|선교/, '🕊️'],
    [/비품|가구|보관/, '🪑'],
    [/의류|침구/, '🧺'],
    [/욕실/, '🚿'],
    [/의약|건강/, '💊'],
    [/장난감/, '🧸'],
    [/계절/, '🌤️'],
    [/예배|성례/, '✝️'],
  ];
  for (const [pattern, emoji] of table) if (pattern.test(category)) return emoji;
  return fallback;
}

export function spaceEmoji(kind: SpaceKind): string {
  return SPACE_KINDS.find((k) => k.id === kind)?.emoji ?? '🚪';
}

// ── 재고 ────────────────────────────────────────────────────────────

export type StockState = 'out' | 'low' | 'ok';

/**
 * 부족 판정. **최소 수량을 정하지 않은 물품은 부족하다고 하지 않는다** —
 * 0 을 기준으로 삼으면 한 번 다 쓴 물품이 전부 붉은 배지를 달고 목록을 채운다.
 */
export function stockState(qty: number, minQty: number): StockState {
  if (minQty > 0 && qty <= 0) return 'out';
  if (minQty > 0 && qty < minQty) return 'low';
  if (minQty <= 0 && qty <= 0) return 'out';
  return 'ok';
}

export function formatQty(qty: number, unit: string): string {
  const n = Number.isInteger(qty) ? String(qty) : String(Math.round(qty * 100) / 100);
  return `${n}${unit || '개'}`;
}

export type CountableItem = {
  qty: number;
  min_qty: number;
  status: ItemStatus;
  deleted_at?: string | null;
};

export type StockSummary = {
  /** 물품 종류 수 */
  kinds: number;
  /** 총 수량 */
  total: number;
  low: number;
  out: number;
  loaned: number;
};

export function summarize(items: CountableItem[]): StockSummary {
  const live = items.filter((i) => !i.deleted_at);
  let total = 0;
  let low = 0;
  let out = 0;
  let loaned = 0;
  for (const item of live) {
    total += item.qty;
    const state = stockState(item.qty, item.min_qty);
    if (state === 'low') low += 1;
    if (state === 'out' && item.min_qty > 0) out += 1;
    if (item.status === 'loaned') loaned += 1;
  }
  return { kinds: live.length, total, low, out, loaned };
}

/** 카드 밑에 한 줄로 적는 요약 — 「물품 42종 · 총 118개 · 부족 4종」(§4.1). */
export function summaryLine(summary: StockSummary): string {
  const parts = [`물품 ${summary.kinds}종`, `총 ${Math.round(summary.total)}개`];
  if (summary.out > 0) parts.push(`품절 ${summary.out}종`);
  if (summary.low > 0) parts.push(`부족 ${summary.low}종`);
  if (summary.loaned > 0) parts.push(`대여 중 ${summary.loaned}`);
  return parts.join(' · ');
}

// ── 공간 계층 ───────────────────────────────────────────────────────

export type SpaceNode = {
  id: string;
  parent_id: string | null;
  name: string;
  kind: SpaceKind;
};

/** 뿌리에서 이 공간까지의 길. 「본관 → 2층 → 방송실 → 오른쪽 철제장」(§4.10). */
export function spacePath<T extends SpaceNode>(spaces: T[], spaceId: string | null): T[] {
  if (!spaceId) return [];
  const byId = new Map(spaces.map((s) => [s.id, s]));
  const path: T[] = [];
  let cursor = byId.get(spaceId);
  // 자기 자신을 부모로 가리키는 줄이 섞여도 멈추도록 본 것을 기억한다.
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    path.unshift(cursor);
    cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
  }
  return path;
}

export function pathLabel<T extends SpaceNode>(spaces: T[], spaceId: string | null): string {
  const path = spacePath(spaces, spaceId);
  if (path.length === 0) return '위치 없음';
  return path.map((s) => s.name).join(' → ');
}

/** 이 공간과 그 아래 모든 공간의 id. 방을 열면 그 안 수납장의 물품까지 보여 준다. */
export function descendantIds<T extends SpaceNode>(spaces: T[], spaceId: string): string[] {
  const children = new Map<string, string[]>();
  for (const s of spaces) {
    if (!s.parent_id) continue;
    children.set(s.parent_id, [...(children.get(s.parent_id) ?? []), s.id]);
  }
  const out: string[] = [];
  const stack = [spaceId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    stack.push(...(children.get(id) ?? []));
  }
  return out;
}

export function childrenOf<T extends SpaceNode>(spaces: T[], parentId: string | null): T[] {
  return spaces.filter((s) => (s.parent_id ?? null) === parentId);
}

/** 사진 위 핀에 붙이는 번호 — ①②③ (§4.2). 20을 넘으면 그냥 숫자로 적는다. */
export function pinLabel(index: number): string {
  const circled = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
  return index >= 0 && index < circled.length ? circled[index] : String(index + 1);
}

// ── 검색 ────────────────────────────────────────────────────────────

export type SearchableItem = {
  name: string;
  category: string;
  tags: string[];
  memo: string;
  model: string;
  serial: string;
  barcode: string;
};

/**
 * 「마이크 어디 있지?」, 「주방에 종이컵 몇 개 있어?」 같은 말에서 실제로 찾을
 * 낱말만 골라낸다(§4.10).
 *
 * 언어모델을 부르지 않는다 — 이 앱에 모델 열쇠가 없고, 물품 이름 몇 개를
 * 찾자고 집 안 물건 목록을 밖으로 보낼 이유도 없다(0079 의 §14 판단과 같은
 * 줄기). 대신 묻는 말투와 조사를 떼는 규칙을 둔다.
 */
export function parseQuery(raw: string): { terms: string[]; asksCount: boolean; asksWhere: boolean } {
  const text = (raw ?? '').trim();
  const asksWhere = /어디|위치|찾아|찾을|있지|있나|있어\?/.test(text);
  const asksCount = /몇\s*(개|장|병|박스|상자|통|롤|묶음)?|수량|얼마나/.test(text);

  const STOP = new Set([
    '어디', '어디에', '어디야', '있지', '있나', '있어', '있어요', '있습니까', '몇', '몇개',
    '개', '수량', '얼마나', '좀', '그', '이', '저', '무엇', '뭐', '뭔가', '알려줘', '알려주세요',
    '찾아줘', '찾아주세요', '주세요', '해줘', '남았', '남았나', '남았어',
  ]);

  const terms = text
    .replace(/[?.!,]/g, ' ')
    .split(/\s+/)
    .map((word) => stripParticle(word))
    .filter((word) => word.length > 0 && !STOP.has(word));

  return { terms, asksCount, asksWhere };
}

/**
 * 꼬리의 조사를 뗀다. 형태소 분석기 없이 자주 쓰는 것만 어림한다 —
 * 「종이컵이」와 「종이컵을」이 서로 다른 낱말로 갈리지 않을 만큼만.
 *
 * **두 글자 낱말은 건드리지 않는다.** 「종이」에서 「이」를 떼면 「종」이 남고,
 * 그러면 종만 들어가도 걸리는 엉뚱한 결과가 쏟아진다. 남는 줄기가 두 글자는
 * 되어야 뗀다.
 */
export function stripParticle(word: string): string {
  const clean = word.trim();
  if (clean.length <= 1) return clean;
  const particles = ['에서는', '에서', '에는', '으로', '이랑', '하고', '까지', '부터', '에게', '한테', '는', '은', '이', '가', '을', '를', '도', '만', '의', '과', '와', '에', '로'];
  for (const p of particles) {
    if (clean.length > p.length + 1 && clean.endsWith(p)) return clean.slice(0, -p.length);
  }
  return clean;
}

/** 낱말 하나하나가 어딘가에는 걸려야 한다(AND). 「주방 종이컵」이 종이컵 전부를 부르면 안 된다. */
export function matchItem(item: SearchableItem, terms: string[], placeText = ''): boolean {
  if (terms.length === 0) return true;
  const haystack = [
    item.name,
    item.category,
    item.memo,
    item.model,
    item.serial,
    item.barcode,
    placeText,
    ...(item.tags ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return terms.every((term) => haystack.includes(term.toLowerCase()));
}

/** 같은 물품이 여러 곳에 나뉘어 있을 때 총수량과 자리별 수량(§4.5). */
export function groupByName<T extends { name: string; qty: number; unit: string }>(
  items: T[],
): { name: string; unit: string; total: number; rows: T[] }[] {
  const map = new Map<string, { name: string; unit: string; total: number; rows: T[] }>();
  for (const item of items) {
    const key = `${item.name.trim()}|${item.unit}`;
    const found = map.get(key);
    if (found) {
      found.total += item.qty;
      found.rows.push(item);
    } else {
      map.set(key, { name: item.name.trim(), unit: item.unit, total: item.qty, rows: [item] });
    }
  }
  return [...map.values()].sort((a, b) => b.rows.length - a.rows.length || a.name.localeCompare(b.name));
}

// ── 날짜 ────────────────────────────────────────────────────────────

/** 「오늘 · 어제 · 3일 전 · 2026-09-01」. 목록에서 시각까지 읽을 일은 드물다. */
export function relativeDay(iso: string, now = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const days = Math.floor((startOfDay(now) - startOfDay(then)) / 86400000);
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  return then.toISOString().slice(0, 10);
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** 휴지통에서 지워질 때까지 남은 날(§4.9 기본 30일). */
export const TRASH_DAYS = 30;

export function trashDaysLeft(deletedAt: string, now = new Date()): number {
  const then = new Date(deletedAt);
  if (Number.isNaN(then.getTime())) return TRASH_DAYS;
  const days = Math.floor((startOfDay(now) - startOfDay(then)) / 86400000);
  return Math.max(TRASH_DAYS - days, 0);
}
