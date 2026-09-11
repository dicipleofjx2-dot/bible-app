'use client';

/** Supabase 로 오가는 것은 전부 이 파일을 지난다. 화면은 표 이름을 모른다. */
import { supabase } from './supabase';
import type { Publication, Recording, SpiritNote, SpiritRecord } from './types';
import type { KindKey, NoteKind, StatusKey, VisibilityKey } from './kinds';

const AUDIO_BUCKET = 'spirit-audio';

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase().auth.getUser();
  return data.user?.id ?? null;
}

// ── 녹음 ─────────────────────────────────────────────────────────────

/** 녹음 파일을 **비공개** 통에 올린다. 통 경로의 첫 칸이 곧 정책이다. */
export async function uploadAudio(userId: string, blob: Blob, ext: string): Promise<string> {
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase().storage.from(AUDIO_BUCKET).upload(path, blob, {
    contentType: blob.type || `audio/${ext}`,
  });
  if (error) throw error;
  return path;
}

/** 들을 때마다 짧게 사는 주소를 받는다. 공개 주소는 아예 없다. */
export async function audioUrl(path: string, seconds = 3600): Promise<string | null> {
  const { data } = await supabase().storage.from(AUDIO_BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export async function createRecording(input: {
  userId: string;
  audioPath: string | null;
  seconds: number | null;
  transcript: string;
  recordedOn: string;
}): Promise<Recording> {
  const { data, error } = await supabase()
    .from('spirit_recordings')
    .insert({
      user_id: input.userId,
      audio_path: input.audioPath,
      seconds: input.seconds,
      transcript: input.transcript,
      recorded_on: input.recordedOn,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Recording;
}

export async function getRecording(id: string): Promise<Recording | null> {
  const { data } = await supabase().from('spirit_recordings').select('*').eq('id', id).maybeSingle();
  return (data as Recording) ?? null;
}

export async function listUnprocessed(): Promise<Recording[]> {
  const { data, error } = await supabase()
    .from('spirit_recordings')
    .select('*')
    .eq('processed', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Recording[];
}

export async function markProcessed(id: string): Promise<void> {
  await supabase().from('spirit_recordings').update({ processed: true }).eq('id', id);
}

export async function saveTranscript(id: string, transcript: string): Promise<void> {
  await supabase().from('spirit_recordings').update({ transcript }).eq('id', id);
}

// ── 기록 ─────────────────────────────────────────────────────────────

export type RecordDraft = {
  recordingId: string | null;
  recordDate: string;
  kind: KindKey;
  title: string;
  rawText: string;
  cleanText: string;
  summary: string;
  situation?: string;
  tags: string[];
  people: string[];
  places: string[];
  verses: string[];
  emotions: string[];
  symbols: string[];
  status?: StatusKey;
  visibility?: VisibilityKey;
  orderIndex: number;
};

function row(userId: string, draft: RecordDraft) {
  return {
    user_id: userId,
    recording_id: draft.recordingId,
    record_date: draft.recordDate,
    kind: draft.kind,
    title: draft.title,
    raw_text: draft.rawText,
    clean_text: draft.cleanText,
    summary: draft.summary,
    situation: draft.situation ?? '',
    tags: draft.tags,
    people: draft.people,
    places: draft.places,
    verses: draft.verses,
    emotions: draft.emotions,
    symbols: draft.symbols,
    status: draft.status ?? 'recorded',
    visibility: draft.visibility ?? 'private',
    order_index: draft.orderIndex,
  };
}

export async function createRecords(userId: string, drafts: RecordDraft[]): Promise<SpiritRecord[]> {
  const { data, error } = await supabase()
    .from('spirit_records')
    .insert(drafts.map((d) => row(userId, d)))
    .select('*');
  if (error) throw error;
  return (data ?? []) as SpiritRecord[];
}

export async function listRecords(filter: { kind?: string; q?: string } = {}): Promise<SpiritRecord[]> {
  let query = supabase()
    .from('spirit_records')
    .select('*')
    .order('record_date', { ascending: false })
    .order('order_index', { ascending: true });
  if (filter.kind) query = query.eq('kind', filter.kind);
  if (filter.q) {
    const term = `%${filter.q}%`;
    query = query.or(`title.ilike.${term},clean_text.ilike.${term},raw_text.ilike.${term}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SpiritRecord[];
}

export async function getRecord(id: string): Promise<SpiritRecord | null> {
  const { data } = await supabase().from('spirit_records').select('*').eq('id', id).maybeSingle();
  return (data as SpiritRecord) ?? null;
}

export async function updateRecord(id: string, patch: Partial<Record<string, unknown>>): Promise<void> {
  const { error } = await supabase().from('spirit_records').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase().from('spirit_records').delete().eq('id', id);
  if (error) throw error;
}

// ── 해석·관련 사건 (쌓이기만 한다) ───────────────────────────────────

export async function listNotes(recordId: string): Promise<SpiritNote[]> {
  const { data, error } = await supabase()
    .from('spirit_notes')
    .select('*')
    .eq('record_id', recordId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SpiritNote[];
}

export async function addNote(input: {
  userId: string;
  recordId: string;
  noteKind: NoteKind;
  body: string;
  happenedOn?: string | null;
}): Promise<SpiritNote> {
  const { data, error } = await supabase()
    .from('spirit_notes')
    .insert({
      user_id: input.userId,
      record_id: input.recordId,
      note_kind: input.noteKind,
      body: input.body,
      happened_on: input.happenedOn || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as SpiritNote;
}

// ── 발행 ─────────────────────────────────────────────────────────────

export async function listPublications(recordId: string): Promise<Publication[]> {
  const { data } = await supabase()
    .from('spirit_publications')
    .select('*')
    .eq('record_id', recordId)
    .order('created_at', { ascending: false });
  return (data ?? []) as Publication[];
}

export async function recordPublication(input: {
  userId: string;
  recordId: string;
  remoteId: string | null;
  remoteUrl: string | null;
  remoteStatus: string;
  title: string;
}): Promise<void> {
  await supabase().from('spirit_publications').insert({
    user_id: input.userId,
    record_id: input.recordId,
    remote_id: input.remoteId,
    remote_url: input.remoteUrl,
    remote_status: input.remoteStatus,
    title: input.title,
  });
}

/** 발행 대기 — 「블로그 공개」로 표시했는데 아직 보내지 않은 것 (§9 홈). */
export async function listAwaitingPublish(): Promise<SpiritRecord[]> {
  const { data } = await supabase()
    .from('spirit_records')
    .select('*, spirit_publications(id)')
    .eq('visibility', 'blog')
    .order('record_date', { ascending: false });
  const rows = (data ?? []) as (SpiritRecord & { spirit_publications: { id: string }[] })[];
  return rows.filter((r) => !r.spirit_publications?.length);
}
