import { supabase } from '@/lib/supabase';
import type { FactStatus, MissionAxis, MissionRole, Visibility } from '@/lib/missionArchive';

/**
 * 사명기록관 데이터. 표 넷(0079) 을 읽고 쓴다.
 *
 * 정책은 전부 owner_id = auth.uid() 하나뿐이다 — 이 표들은 선교지 보안이 걸린
 * 기록이라 공유 자체를 두지 않았다(0079 머리말 참고).
 */

export type MissionSubject = {
  id: string;
  name: string;
  role: MissionRole;
  denomination: string;
  church: string;
  fields: string;
  born_year: number | null;
  called_year: number | null;
  summary: string;
  is_deceased: boolean;
  security_mode: boolean;
  created_at: string;
};

export type MissionAnswer = {
  id: string;
  subject_id: string;
  axis: MissionAxis;
  question_key: string;
  question: string;
  body: string;
  year: number | null;
  place: string;
  people: string;
  evidence: string;
  fact_status: FactStatus;
  visibility: Visibility;
  updated_at: string;
};

export type MissionTimelineRow = {
  id: string;
  subject_id: string;
  year: number;
  month: number | null;
  place: string;
  org: string;
  role: string;
  event: string;
  people: string;
  evidence: string;
  fact_status: FactStatus;
};

export type MissionChapter = {
  id: string;
  subject_id: string;
  ord: number;
  title: string;
  body: string;
  source_keys: string[];
  updated_at: string;
};

const SUBJECT_COLUMNS =
  'id, name, role, denomination, church, fields, born_year, called_year, summary, is_deceased, security_mode, created_at';
const ANSWER_COLUMNS =
  'id, subject_id, axis, question_key, question, body, year, place, people, evidence, fact_status, visibility, updated_at';
const TIMELINE_COLUMNS =
  'id, subject_id, year, month, place, org, role, event, people, evidence, fact_status';
const CHAPTER_COLUMNS = 'id, subject_id, ord, title, body, source_keys, updated_at';

export async function listSubjects(ownerId: string): Promise<MissionSubject[]> {
  const { data, error } = await supabase
    .from('mission_subjects')
    .select(SUBJECT_COLUMNS)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MissionSubject[];
}

export async function getSubject(subjectId: string): Promise<MissionSubject | null> {
  const { data, error } = await supabase
    .from('mission_subjects')
    .select(SUBJECT_COLUMNS)
    .eq('id', subjectId)
    .maybeSingle();
  if (error) throw error;
  return (data as MissionSubject | null) ?? null;
}

export type SubjectInput = Partial<Omit<MissionSubject, 'id' | 'created_at'>> & { name: string };

export async function createSubject(ownerId: string, input: SubjectInput): Promise<string> {
  const { data, error } = await supabase
    .from('mission_subjects')
    .insert({ owner_id: ownerId, ...input })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateSubject(subjectId: string, patch: Partial<SubjectInput>): Promise<void> {
  const { error } = await supabase.from('mission_subjects').update(patch).eq('id', subjectId);
  if (error) throw error;
}

export async function deleteSubject(subjectId: string): Promise<void> {
  const { error } = await supabase.from('mission_subjects').delete().eq('id', subjectId);
  if (error) throw error;
}

export async function listAnswers(subjectId: string): Promise<MissionAnswer[]> {
  const { data, error } = await supabase
    .from('mission_answers')
    .select(ANSWER_COLUMNS)
    .eq('subject_id', subjectId);
  if (error) throw error;
  return (data ?? []) as MissionAnswer[];
}

export type AnswerInput = {
  axis: MissionAxis;
  question_key: string;
  question: string;
  body: string;
  year?: number | null;
  place?: string;
  people?: string;
  evidence?: string;
  fact_status?: FactStatus;
  visibility?: Visibility;
};

/**
 * 한 질문의 답을 넣거나 고친다.
 *
 * upsert 로 쓰는 이유: 「이어서 말하기」는 새 답이 아니라 그 답을 고치는 일이다.
 * 표에 (subject_id, question_key) 유일 제약을 걸어 두어(0079), 화면이 먼저
 * 「이미 있나」를 물어보지 않아도 한 번에 끝난다 — 두 걸음으로 나누면 그 사이에
 * 끊길 때 같은 질문에 답이 둘 남는다.
 */
export async function saveAnswer(ownerId: string, subjectId: string, input: AnswerInput): Promise<void> {
  const { error } = await supabase.from('mission_answers').upsert(
    {
      owner_id: ownerId,
      subject_id: subjectId,
      ...input,
      body: input.body ?? '',
      place: input.place ?? '',
      people: input.people ?? '',
      evidence: input.evidence ?? '',
    },
    { onConflict: 'subject_id,question_key' },
  );
  if (error) throw error;
}

export async function deleteAnswer(answerId: string): Promise<void> {
  const { error } = await supabase.from('mission_answers').delete().eq('id', answerId);
  if (error) throw error;
}

export async function listTimeline(subjectId: string): Promise<MissionTimelineRow[]> {
  const { data, error } = await supabase
    .from('mission_timeline')
    .select(TIMELINE_COLUMNS)
    .eq('subject_id', subjectId)
    .order('year', { ascending: true })
    .order('month', { ascending: true, nullsFirst: true });
  if (error) throw error;
  return (data ?? []) as MissionTimelineRow[];
}

export type TimelineInput = Omit<MissionTimelineRow, 'id' | 'subject_id'>;

export async function addTimelineRow(
  ownerId: string,
  subjectId: string,
  input: TimelineInput,
): Promise<void> {
  const { error } = await supabase
    .from('mission_timeline')
    .insert({ owner_id: ownerId, subject_id: subjectId, ...input });
  if (error) throw error;
}

export async function updateTimelineRow(rowId: string, patch: Partial<TimelineInput>): Promise<void> {
  const { error } = await supabase.from('mission_timeline').update(patch).eq('id', rowId);
  if (error) throw error;
}

export async function deleteTimelineRow(rowId: string): Promise<void> {
  const { error } = await supabase.from('mission_timeline').delete().eq('id', rowId);
  if (error) throw error;
}

export async function listChapters(subjectId: string): Promise<MissionChapter[]> {
  const { data, error } = await supabase
    .from('mission_chapters')
    .select(CHAPTER_COLUMNS)
    .eq('subject_id', subjectId)
    .order('ord', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MissionChapter[];
}

/**
 * 장별 초고를 저장한다.
 *
 * 자동으로 엮은 글을 표에 담아 두는 이유는 **사람이 고쳐 쓴 글이 다시 엮기에
 * 지워지지 않게** 하기 위해서다. 화면에서 다시 엮을 때는 언제나 사람에게
 * 물어보고 덮어쓴다.
 */
export async function saveChapter(
  ownerId: string,
  subjectId: string,
  input: { ord: number; title: string; body: string; source_keys: string[] },
): Promise<void> {
  const { error } = await supabase
    .from('mission_chapters')
    .upsert({ owner_id: ownerId, subject_id: subjectId, ...input }, { onConflict: 'subject_id,ord' });
  if (error) throw error;
}
