/**
 * 이메일 정리ON — 체험 단계의 저장소.
 *
 * 아직 Gmail·IMAP 이 붙지 않았으므로 실제 메일 서비스에는 **아무것도 쓰지
 * 않는다**. 여기 담기는 것은 기획서 §11 의 `Classification`(사용자 수정 결과)와
 * `ActionLog` 에 해당하는, 이 기기 안의 기록뿐이다.
 *
 * Supabase 표를 만들지 않은 이유: 1단계는 체험형 화면이고, 메일 제목·발신자는
 * 그 자체로 민감하다(§13.3 「운영자가 임의로 열람할 수 없게 한다」). 서버에
 * 올릴 이유가 생기기 전까지는 기기 밖으로 내보내지 않는다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_SETTINGS,
  type MailCategory,
  type OrganizerSettings,
} from '@/lib/emailOrganizer';

const SETTINGS_KEY = 'emailOrganizer.settings.v1';
const STATE_KEY = 'emailOrganizer.state.v1';

/** 메일 한 통에 사용자가 남긴 흔적. 없는 값은 예시 메일의 원래 값을 따른다. */
export type MailFlags = {
  read?: boolean;
  archived?: boolean;
  trashed?: boolean;
  /** 사용자가 분류를 고친 결과. AI 판정보다 항상 우선한다(§3.3). */
  category?: MailCategory;
  /** 중요 표시. */
  pinned?: boolean;
};

export type ActionKind =
  | 'read'
  | 'archive'
  | 'trash'
  | 'restore'
  | 'recategorize'
  | 'pin'
  | 'unsubscribe';

export type ActionLogEntry = {
  id: string;
  kind: ActionKind;
  mailIds: string[];
  at: string;
  note: string;
  /** 취소된 작업인가. 기록 자체는 지우지 않는다(§7.8). */
  undone: boolean;
  /** 되돌리기에 쓸 직전 값. */
  before: Record<string, MailFlags>;
};

export type OrganizerState = {
  flags: Record<string, MailFlags>;
  log: ActionLogEntry[];
};

export const EMPTY_STATE: OrganizerState = { flags: {}, log: [] };

export const ACTION_LABEL: Record<ActionKind, string> = {
  read: '읽음 처리',
  archive: '보관',
  trash: '휴지통으로 이동',
  restore: '받은편지함으로 되돌림',
  recategorize: '분류 수정',
  pin: '중요 표시',
  unsubscribe: '구독 해지 표시',
};

/**
 * 작업을 적용한 **새 상태**를 돌려준다. 순수 함수다 — 저장은 부르는 쪽이 한다.
 *
 * 되돌리기를 위해 바뀌기 전 값을 기록에 함께 담는다. 「무엇을 어떻게 되돌릴지」를
 * 나중에 추측하면, 사이에 다른 작업이 끼었을 때 엉뚱한 값으로 돌아간다.
 */
export function applyAction(
  state: OrganizerState,
  kind: ActionKind,
  mailIds: string[],
  patch: MailFlags,
  note: string,
  now: Date = new Date(),
): OrganizerState {
  const before: Record<string, MailFlags> = {};
  const flags = { ...state.flags };
  for (const id of mailIds) {
    before[id] = { ...(state.flags[id] ?? {}) };
    flags[id] = { ...(state.flags[id] ?? {}), ...patch };
  }
  const entry: ActionLogEntry = {
    id: `${now.getTime()}-${kind}-${mailIds.length}`,
    kind,
    mailIds,
    at: now.toISOString(),
    note,
    undone: false,
    before,
  };
  return { flags, log: [entry, ...state.log].slice(0, 200) };
}

/** 가장 최근의 되돌릴 수 있는 작업 하나를 취소한다(§7.8 「최근 작업 취소」). */
export function undoLast(state: OrganizerState): OrganizerState {
  const index = state.log.findIndex((e) => !e.undone);
  if (index < 0) return state;
  const entry = state.log[index];
  const flags = { ...state.flags };
  for (const id of entry.mailIds) flags[id] = { ...entry.before[id] };
  const log = [...state.log];
  log[index] = { ...entry, undone: true };
  return { flags, log };
}

export async function loadSettings(): Promise<OrganizerSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      // 처음 여는 사람의 체험 기간은 지금부터 센다(§3.3).
      const fresh = { ...DEFAULT_SETTINGS, trialStartedAt: new Date().toISOString() };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<OrganizerSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS, trialStartedAt: new Date().toISOString() };
  }
}

export async function saveSettings(settings: OrganizerSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadState(): Promise<OrganizerState> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<OrganizerState>;
    return { flags: parsed.flags ?? {}, log: parsed.log ?? [] };
  } catch {
    return EMPTY_STATE;
  }
}

export async function saveState(state: OrganizerState): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}

/** 체험 기록을 비운다(§8.4 「개인정보와 연결 해제」의 체험판 대응). */
export async function resetDemo(): Promise<void> {
  await AsyncStorage.multiRemove([STATE_KEY, SETTINGS_KEY]);
}
