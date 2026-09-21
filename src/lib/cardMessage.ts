/**
 * 카드사 결제 알림 문자를 거래 한 건으로 읽어 내는 순수 함수.
 *
 * 이 파일에는 상태도 화면도 없다. 수집 경로가 무엇이든 — 손으로 붙여넣든,
 * 카톡에서 공유해 보내든, 안드로이드 알림을 가로채든 — 앱에 들어오는 것은
 * 결국 같은 문자열 한 덩어리다. 그래서 읽는 일만 여기 떼어 놓는다.
 * 화면을 띄우지 못하는 곳에서도 검사가 되도록.
 */

export type TxnKind = 'approve' | 'cancel';

export type CardTxn = {
  /** 같은 거래를 두 번 담지 않기 위한 열쇠. 같은 문자를 두 번 붙여넣는 일은 반드시 일어난다. */
  key: string;
  /** 'YYYY-MM-DD' */
  date: string;
  /** 'HH:MM' — 문자에 시각이 없으면 null */
  time: string | null;
  /** 원화 금액. 취소도 양수로 담고 kind 로 가른다. */
  amount: number;
  /** 해외 승인일 때만 — 예: { code: 'USD', value: 12.99 } */
  foreign: { code: string; value: number } | null;
  kind: TxnKind;
  merchant: string;
  /** '일시불' · '3개월' — 문자에 없으면 null */
  installment: string | null;
  /** 카드 뒷자리 표시(예: '9*1*') — 없으면 null */
  card: string | null;
  issuer: string;
  raw: string;
};

export type SkippedBlock = { text: string; reason: string };

export type ParseResult = {
  txns: CardTxn[];
  skipped: SkippedBlock[];
};

/** 카드사 이름 — 삼성카드가 기본이지만 다른 카드 문자가 섞여 들어와도 읽는다. */
const ISSUERS = [
  '삼성카드',
  '신한카드',
  '현대카드',
  '국민카드',
  'KB국민카드',
  '롯데카드',
  '하나카드',
  '우리카드',
  'BC카드',
  '농협카드',
  'NH농협카드',
  '카카오뱅크',
  '토스뱅크',
];

/** 카톡 대화 내보내기 한 줄 앞에 붙는 머리표.
 *  안드로이드: `2026년 9월 21일 오후 7:03, 삼성카드 : 내용`
 *  아이폰:     `2026. 9. 21. 오후 7:03, 삼성카드 : 내용`
 *  머리표의 연도는 문자 본문에 없는 정보라 — 문자는 `09/21` 까지만 준다 — 꼭 주워 둔다. */
const EXPORT_PREFIX =
  /^\s*(?:\[?(\d{4})[.년]\s*(\d{1,2})[.월]\s*(\d{1,2})[.일]?\]?[,\s]*)?(?:(오전|오후)\s*)?(\d{1,2}):(\d{2})(?::\d{2})?\s*,\s*([^:\n]{1,40}?)\s*:\s*/;

/** 발신 표시 — 내용이 아니라 통신사가 붙인 꼬리표다. */
const CHANNEL_TAG = /\[(?:Web발신|웹발신|국외발신|국제발신|국내발신|LMS|MMS)\]/g;

/** 금액처럼 보이지만 이 거래의 금액이 아닌 것들. */
const NOT_AMOUNT = /(?:누적|잔여|잔액|한도|포인트|적립|가용|할인|합계)\s*[:은는]?\s*-?[\d,]+\s*원?/g;

/** 카드사 짧은 이름 뒤에 카드 뒷자리가 붙는 형태 — `삼성9*1*승인`.
 *  이걸 떼지 않으면 「삼성」이 가맹점 이름 노릇을 한다. */
const SHORT_ISSUER_WITH_DIGITS = /(?:삼성|신한|현대|국민|롯데|하나|우리|농협|비씨|BC|KB|NH)\s*[\d*]{2,6}/g;

/** 카드사 이름만 남은 조각은 가맹점이 아니다. */
const BARE_ISSUER = /^(?:삼성|신한|현대|국민|롯데|하나|우리|농협|비씨|BC|KB|NH|카드)$/;

const FOREIGN = /\b(USD|JPY|EUR|CNY|GBP|HKD|SGD|AUD|CAD|THB|VND|TWD|PHP|MYR|IDR)\s*([\d,]+(?:\.\d+)?)/i;

/** `홍*동`, `홍*동님`, `홍길동님` — 카드 주인 이름 줄. 가맹점이 아니다.
 *  별표나 「님」 둘 중 하나는 반드시 있어야 이름으로 본다. 그냥 두세 글자
 *  한글이면 이름으로 치던 때에는 **「김밥천국」이 사람 이름이 되어** 그 거래의
 *  가맹점이 통째로 사라졌다. */
const NAME_LINE = /^(?:[가-힣][가-힣*]{0,3}\*[가-힣*]{0,3}\s*님?|[가-힣]{2,4}\s*님)$/;

type Line = { text: string; startsMessage: boolean; year: number | null; month: number | null; day: number | null };

function normalize(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    .replace(/[​﻿]/g, '');
}

/** 한 줄에서 내보내기 머리표를 떼고, 거기 적힌 날짜를 함께 돌려준다. */
function stripExportPrefix(line: string): { text: string; startsMessage: boolean; year: number | null; month: number | null; day: number | null } {
  const m = EXPORT_PREFIX.exec(line);
  if (!m) return { text: line, startsMessage: false, year: null, month: null, day: null };
  return {
    text: line.slice(m[0].length),
    startsMessage: true,
    year: m[1] ? Number(m[1]) : null,
    month: m[2] ? Number(m[2]) : null,
    day: m[3] ? Number(m[3]) : null,
  };
}

function toLines(raw: string): Line[] {
  return normalize(raw)
    .split('\n')
    .map((line) => {
      const stripped = stripExportPrefix(line);
      const text = stripped.text.replace(CHANNEL_TAG, '').trim();
      return { ...stripped, text };
    });
}

type Block = { lines: string[]; year: number | null };

function hasAmount(lines: string[]): boolean {
  return lines.some((l) => /[\d,]+\s*원/.test(l.replace(NOT_AMOUNT, '')));
}

function hasDate(lines: string[]): boolean {
  return lines.some((l) => /\d{1,2}\s*[/월]\s*\d{1,2}/.test(l));
}

/**
 * 붙여넣은 덩어리를 문자 한 통씩으로 자른다.
 *
 * 구분자를 믿지 않는다 — 내보내기 머리표가 있을 때도, 빈 줄로만 나뉠 때도,
 * 아무 구분 없이 여러 통이 이어 붙어 올 때도 있다. 대신 **한 통이 다 찼는지**를
 * 본다: 금액과 날짜와 가맹점이 다 나왔으면 그 문자는 끝난 것이고, 다음 줄은
 * 다른 문자다. 카톡 대화를 통째로 붙여넣어 사이사이 잡담이 섞여도 그 잡담이
 * 가맹점 자리로 딸려 들어가지 않는다.
 */
function splitBlocks(lines: Line[]): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;

  const flush = () => {
    if (current && current.lines.length > 0) blocks.push(current);
    current = null;
  };

  const complete = (block: Block) =>
    hasAmount(block.lines) && hasDate(block.lines) && pickMerchant(block.lines) !== null;

  for (const line of lines) {
    if (line.text === '') {
      flush();
      continue;
    }
    // 누적금액 안내는 문자의 꼬리다 — 새 문자로 오해하면 「못 읽은 문자」로 쌓인다.
    if (current !== null && isTrailer(line.text)) {
      current.lines.push(line.text);
      continue;
    }
    if (current === null || line.startsMessage || complete(current)) {
      flush();
      current = { lines: [], year: line.year };
    }
    if (current.year === null && line.year !== null) current.year = line.year;
    current.lines.push(line.text);
  }
  flush();
  return blocks;
}

function findIssuer(text: string): string | null {
  for (const issuer of ISSUERS) if (text.includes(issuer)) return issuer;
  if (/삼성\s*[\d*]{2,4}/.test(text)) return '삼성카드';
  return null;
}

function findAmount(text: string): number | null {
  const cleaned = text.replace(NOT_AMOUNT, ' ');
  const m = /(-?\d[\d,]*)\s*원/.exec(cleaned);
  if (!m) return null;
  const value = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(value) ? Math.abs(value) : null;
}

function findForeign(text: string): { code: string; value: number } | null {
  const m = FOREIGN.exec(text);
  if (!m) return null;
  const value = Number(m[2].replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;
  return { code: m[1].toUpperCase(), value };
}

function findInstallment(text: string): string | null {
  if (/일시불/.test(text)) return '일시불';
  const m = /(\d{1,2})\s*개월/.exec(text);
  return m ? `${Number(m[1])}개월` : null;
}

function findCard(text: string): string | null {
  const masked = /([\d*]{1,2}\*[\d*]{1,3})\s*(?:승인|취소|결제)/.exec(text);
  if (masked) return masked[1];
  const after = /(?:카드|삼성)\s*([\d*]{3,6})/.exec(text);
  if (after && /\*/.test(after[1])) return after[1];
  return null;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * 문자는 `09/21 19:03` 까지만 알려 준다. 연도는 우리가 정해야 한다.
 * 내보내기 머리표에 연도가 있으면 그것을 쓰고, 없으면 오늘을 기준으로
 * 잡되 **미래로 넘어가면 지난해로 돌린다** — 1월에 받은 12월 문자가
 * 올해 12월로 적히면 그 한 건이 한 해 내내 앞날에 떠 있게 된다.
 */
function resolveYear(month: number, day: number, hintYear: number | null, now: Date): number {
  if (hintYear !== null) return hintYear;
  const year = now.getFullYear();
  const candidate = new Date(year, month - 1, day);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return candidate.getTime() > tomorrow.getTime() ? year - 1 : year;
}

function findDateTime(text: string, hintYear: number | null, now: Date): { date: string; time: string | null } | null {
  const withTime = /(\d{1,2})\s*[/월]\s*(\d{1,2})\s*[일]?[\s(),.]*(?:[월화수목금토일]\s*)?(\d{1,2}):(\d{2})/.exec(text);
  const dateOnly = /(\d{1,2})\s*[/월]\s*(\d{1,2})\s*일?/.exec(text);
  const m = withTime ?? dateOnly;
  if (!m) return null;

  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const year = resolveYear(month, day, hintYear, now);
  const time = withTime ? `${pad(Number(withTime[3]))}:${withTime[4]}` : null;
  return { date: `${year}-${pad(month)}-${pad(day)}`, time };
}

/** 문자를 이루는 정해진 조각들 — 카드사·이름·금액·날짜·할부·누적. 이걸 다 지우고
 *  남는 글자가 가맹점이다. 「가맹점은 몇 번째 줄」이라는 규칙을 두지 않는 이유는,
 *  줄 나눔이 카드사마다 다르고 한 줄로 이어 붙어 오는 문자도 있기 때문이다. */
function stripKnownTokens(line: string): string {
  let t = line;
  for (const issuer of ISSUERS) t = t.split(issuer).join(' ');
  return t
    .replace(SHORT_ISSUER_WITH_DIGITS, ' ')
    .replace(NOT_AMOUNT, ' ')
    .replace(FOREIGN, ' ')
    .replace(/-?\d[\d,]*\s*원/g, ' ')
    .replace(/\d{1,2}\s*[/월]\s*\d{1,2}\s*일?/g, ' ')
    .replace(/\d{1,2}:\d{2}/g, ' ')
    .replace(/(일시불|\d{1,2}\s*개월)/g, ' ')
    .replace(/(승인취소|승인|취소|결제|해외|체크|신용|일시불)/g, ' ')
    .replace(/[가-힣][가-힣*]{0,4}\**[가-힣]?\s*님/g, ' ')
    .replace(/[\d*]{1,2}\*[\d*]{1,3}/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s[\]{}:·,.-]+|[\s[\]{}:·,.-]+$/g, '')
    .trim();
}

function isTrailer(line: string): boolean {
  return /(누적|잔여|잔액|한도|포인트|적립|가용|합계)/.test(line);
}

/** 이 줄에서 가맹점 이름이 나올 수 있는가. */
function merchantOf(line: string): string | null {
  if (isTrailer(line)) return null;
  const t = stripKnownTokens(line);
  // 괄호·기호만 남은 찌꺼기(`[삼성카드]` → `[ ]`)를 가맹점으로 삼지 않는다.
  if (!/[가-힣A-Za-z0-9]{2,}/.test(t)) return null;
  if (BARE_ISSUER.test(t)) return null;
  if (NAME_LINE.test(t)) return null;
  return t;
}

function pickMerchant(lines: string[]): string | null {
  // 가맹점은 문자의 끝자락에 온다. 앞쪽은 카드사·이름·금액·날짜다.
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const m = merchantOf(lines[i]);
    if (m) return m;
  }
  return null;
}

/** 같은 거래인지 가리는 열쇠. 가맹점 이름의 띄어쓰기는 문자마다 흔들려서 지운다. */
export function txnKey(parts: { date: string; time: string | null; kind: TxnKind; amount: number; merchant: string; card: string | null; foreign?: { code: string; value: number } | null }): string {
  const merchant = parts.merchant.replace(/\s+/g, '').replace(/^\(주\)|\(주\)$/g, '');
  const foreign = parts.foreign ? `${parts.foreign.code}${parts.foreign.value}` : '';
  return [parts.date, parts.time ?? '--:--', parts.kind, parts.amount, merchant, parts.card ?? '', foreign].join('|');
}

function parseBlock(block: Block, now: Date): CardTxn | SkippedBlock {
  const raw = block.lines.join('\n');
  const text = block.lines.join(' \n ');

  const issuer = findIssuer(text);
  const mentionsTxn = /(승인|취소|결제)/.test(text);
  if (!issuer && !mentionsTxn) return { text: raw, reason: '카드 결제 문자가 아닙니다' };

  const amount = findAmount(text);
  const foreign = findForeign(text);
  if (amount === null && foreign === null) return { text: raw, reason: '금액을 찾지 못했습니다' };

  const when = findDateTime(text, block.year, now);
  if (!when) return { text: raw, reason: '날짜를 찾지 못했습니다' };

  const merchant = pickMerchant(block.lines);
  if (!merchant) return { text: raw, reason: '가맹점을 찾지 못했습니다' };

  const kind: TxnKind = /취소/.test(text) ? 'cancel' : 'approve';
  const card = findCard(text);
  const resolvedAmount = amount ?? 0;

  return {
    key: txnKey({ date: when.date, time: when.time, kind, amount: resolvedAmount, merchant, card, foreign }),
    date: when.date,
    time: when.time,
    amount: resolvedAmount,
    foreign,
    kind,
    merchant,
    installment: findInstallment(text),
    card,
    issuer: issuer ?? '카드',
    raw,
  };
}

function isTxn(value: CardTxn | SkippedBlock): value is CardTxn {
  return 'key' in value;
}

/**
 * 붙여넣은 글 덩어리에서 거래를 읽어 낸다.
 *
 * `now` 를 밖에서 받는 것은 검사를 위해서다. 기기 시계에 기대면 같은 입력이
 * 날마다 다른 결과를 낸다.
 */
export function parseCardMessages(raw: string, now: Date = new Date()): ParseResult {
  const blocks = splitBlocks(toLines(raw));
  const txns: CardTxn[] = [];
  const skipped: SkippedBlock[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    const parsed = parseBlock(block, now);
    if (!isTxn(parsed)) {
      // 알맹이가 없는 덩어리(빈 줄, 인사말)까지 「못 읽었다」고 늘어놓으면
      // 진짜 못 읽은 문자가 묻힌다.
      if (parsed.reason !== '카드 결제 문자가 아닙니다' || /(승인|취소|원)/.test(parsed.text)) {
        skipped.push(parsed);
      }
      continue;
    }
    // 한 번 붙여넣은 덩어리 안에서의 중복은 여기서 접는다.
    // 이미 저장된 것과의 중복은 저장할 때 다시 본다.
    if (seen.has(parsed.key)) continue;
    seen.add(parsed.key);
    txns.push(parsed);
  }

  txns.sort((a, b) => `${b.date} ${b.time ?? ''}`.localeCompare(`${a.date} ${a.time ?? ''}`));
  return { txns, skipped };
}
