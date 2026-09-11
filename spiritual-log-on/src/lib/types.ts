import type { KindKey, NoteKind, StatusKey, VisibilityKey } from './kinds';

export type Recording = {
  id: string;
  user_id: string;
  audio_path: string | null;
  seconds: number | null;
  transcript: string;
  recorded_on: string;
  processed: boolean;
  created_at: string;
};

export type SpiritRecord = {
  id: string;
  user_id: string;
  recording_id: string | null;
  record_date: string;
  kind: KindKey;
  title: string;
  raw_text: string;
  clean_text: string;
  summary: string;
  situation: string;
  tags: string[];
  people: string[];
  places: string[];
  verses: string[];
  emotions: string[];
  symbols: string[];
  status: StatusKey;
  visibility: VisibilityKey;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type SpiritNote = {
  id: string;
  user_id: string;
  record_id: string;
  note_kind: NoteKind;
  body: string;
  happened_on: string | null;
  created_at: string;
};

export type Publication = {
  id: string;
  user_id: string;
  record_id: string;
  target: string;
  remote_id: string | null;
  remote_url: string | null;
  remote_status: string;
  title: string;
  created_at: string;
};

/** 오늘 (서울). 날짜의 경계를 UTC 로 끊으면 새벽 기록이 어제 것이 된다. */
export function todaySeoul(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
}
