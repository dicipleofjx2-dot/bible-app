/** 기록 종류 (기획서 §2). 값은 DB에 그대로 들어가므로 한글 키를 쓰지 않는다. */
export const KINDS = [
  { key: 'dream', label: '꿈', hint: '잠을 자는 동안 본 내용' },
  { key: 'vision', label: '환상', hint: '깨어 있는 중 마음이나 시야에 떠오른 장면' },
  { key: 'prophecy', label: '예언', hint: '개인·교회·지역·시대를 향해 받았다고 인식한 메시지' },
  { key: 'impression', label: '감동', hint: '기도·예배·묵상 중 마음에 와닿은 깨달음' },
  { key: 'word', label: '말씀 묵상', hint: '성경을 읽으며 받은 메시지' },
  { key: 'prayer', label: '기도 중 기록', hint: '기도 중 떠오른 사람·장소·사건' },
  { key: 'etc', label: '기타', hint: '위에 속하지 않는 영적 경험' },
] as const;

export type KindKey = (typeof KINDS)[number]['key'];

export function kindLabel(key: string): string {
  return KINDS.find((k) => k.key === key)?.label ?? '기타';
}

/** 분별 상태 (기획서 §7). 순서가 곧 진행 단계다. */
export const STATUSES = [
  { key: 'recorded', label: '기록만 함' },
  { key: 'discerning', label: '기도하며 분별 중' },
  { key: 'partial', label: '일부 의미를 이해함' },
  { key: 'related', label: '관련 사건이 있음' },
  { key: 'confirmed', label: '확인되었다고 판단함' },
  { key: 'held', label: '보류' },
] as const;

export type StatusKey = (typeof STATUSES)[number]['key'];

export function statusLabel(key: string): string {
  return STATUSES.find((s) => s.key === key)?.label ?? '기록만 함';
}

/** 공개 범위 (기획서 §12). 기본은 언제나 나만 보기다. */
export const VISIBILITIES = [
  { key: 'private', label: '나만 보기' },
  { key: 'spouse', label: '배우자와 공유' },
  { key: 'invited', label: '초대한 사람과 공유' },
  { key: 'blog', label: '블로그 공개' },
] as const;

export type VisibilityKey = (typeof VISIBILITIES)[number]['key'];

export function visibilityLabel(key: string): string {
  return VISIBILITIES.find((v) => v.key === key)?.label ?? '나만 보기';
}

/** 기록에 덧붙이는 글의 종류 (기획서 §7). 덮어쓰지 않고 쌓인다. */
export const NOTE_KINDS = [
  { key: 'feeling', label: '당시의 느낌' },
  { key: 'interpretation', label: '당시의 해석' },
  { key: 'later', label: '나중에 추가한 해석' },
  { key: 'event', label: '관련 사건' },
  { key: 'confirm', label: '확인 기록' },
] as const;

export type NoteKind = (typeof NOTE_KINDS)[number]['key'];

export function noteKindLabel(key: string): string {
  return NOTE_KINDS.find((n) => n.key === key)?.label ?? key;
}

/** 문체 (기획서 §5). 기본은 과장하지 않는 따뜻한 경어체. */
export const STYLES = [
  { key: 'raw', label: '원문에 가깝게' },
  { key: 'clean', label: '깔끔한 기록문' },
  { key: 'meditation', label: '묵상문' },
  { key: 'testimony', label: '간증문' },
  { key: 'blog', label: '블로그 글' },
] as const;

export type StyleKey = (typeof STYLES)[number]['key'];
