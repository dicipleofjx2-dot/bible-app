import * as ImageManipulator from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';
import type {
  AssetKind,
  FactStatus,
  MemorialData,
  MissionAxis,
  MissionRole,
  Visibility,
} from '@/lib/missionArchive';

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
  /** 인터뷰 녹음 원본(비공개 통 안의 경로, 0082). 받아쓴 글을 고쳐도 남는다. */
  audio_path: string | null;
  audio_seconds: number | null;
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
  'id, subject_id, axis, question_key, question, body, year, place, people, evidence, fact_status, visibility, audio_path, audio_seconds, updated_at';
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
  audio_path?: string | null;
  audio_seconds?: number | null;
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

// ── 2단계: 사역 자료실 · 공동 증언 (0080) ───────────────────────────

const ASSET_BUCKET = 'mission-assets';

export type MissionAsset = {
  id: string;
  subject_id: string;
  kind: AssetKind;
  title: string;
  path: string | null;
  year: number | null;
  month: number | null;
  place: string;
  people: string;
  note: string;
  body: string;
  fact_status: FactStatus;
  visibility: Visibility;
  created_at: string;
};

export type MissionInvite = {
  id: string;
  subject_id: string;
  token: string;
  invitee_name: string;
  relation: string;
  questions: string[];
  note: string;
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

export type MissionTestimony = {
  id: string;
  subject_id: string;
  invite_id: string | null;
  witness_name: string;
  relation: string;
  question: string;
  body: string;
  contact: string;
  source: 'link' | 'manual';
  reviewed: boolean;
  visibility: Visibility;
  created_at: string;
};

const ASSET_COLUMNS =
  'id, subject_id, kind, title, path, year, month, place, people, note, body, fact_status, visibility, created_at';
const INVITE_COLUMNS =
  'id, subject_id, token, invitee_name, relation, questions, note, active, expires_at, created_at';
const TESTIMONY_COLUMNS =
  'id, subject_id, invite_id, witness_name, relation, question, body, contact, source, reviewed, visibility, created_at';

export async function listAssets(subjectId: string): Promise<MissionAsset[]> {
  const { data, error } = await supabase
    .from('mission_assets')
    .select(ASSET_COLUMNS)
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MissionAsset[];
}

export type AssetInput = Omit<MissionAsset, 'id' | 'subject_id' | 'created_at'>;

export async function addAsset(
  ownerId: string,
  subjectId: string,
  input: Partial<AssetInput> & { kind: AssetKind; title: string },
): Promise<void> {
  const { error } = await supabase
    .from('mission_assets')
    .insert({ owner_id: ownerId, subject_id: subjectId, ...input });
  if (error) throw error;
}

export async function updateAsset(assetId: string, patch: Partial<AssetInput>): Promise<void> {
  const { error } = await supabase.from('mission_assets').update(patch).eq('id', assetId);
  if (error) throw error;
}

export async function deleteAsset(assetId: string, path: string | null): Promise<void> {
  const { error } = await supabase.from('mission_assets').delete().eq('id', assetId);
  if (error) throw error;
  if (path) await supabase.storage.from(ASSET_BUCKET).remove([path]).catch(() => {});
}

/**
 * 자료 파일 하나를 올린다.
 *
 * 경로 첫 칸이 그 사람의 uuid 여야 저장소 정책을 지난다(0080). 사진은
 * 열매 사진처럼 줄여서 올린다 — 스캔한 주보 한 장이 십수 MB 인 일이 흔하다.
 */
export async function uploadAssetFile(
  ownerId: string,
  uri: string,
  fileName: string,
  mimeType?: string,
): Promise<{ path?: string; error?: string }> {
  try {
    const isImage = (mimeType ?? '').startsWith('image/');
    const shrunk = isImage
      ? await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1400 } }], {
          compress: 0.82,
          format: ImageManipulator.SaveFormat.JPEG,
        }).catch(() => null)
      : null;

    const source = shrunk?.uri ?? uri;
    const response = await fetch(source);
    const arrayBuffer = await response.arrayBuffer();
    const type = shrunk ? 'image/jpeg' : mimeType ?? 'application/octet-stream';
    const ext =
      (shrunk ? 'jpg' : fileName.split('.').pop() ?? '').replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin';
    const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from(ASSET_BUCKET).upload(path, arrayBuffer, {
      contentType: type,
    });
    if (error) return { error: error.message };
    return { path };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '자료를 올리지 못했어요.' };
  }
}

/**
 * 자료를 볼 주소.
 *
 * 이 통은 **비공개**라 공개 주소가 없다(0080). 볼 때마다 짧게 사는 서명 주소를
 * 받는다 — 주소가 새어 나가도 한 시간 뒤에는 죽는다.
 */
/**
 * 인터뷰 녹음 한 개를 올린다.
 *
 * 자료실과 **같은 비공개 통**을 쓴다(0082). 성격이 같은 파일이고, 통을 하나 더
 * 만들면 정책도 하나 더 늘어난다 — 늘어난 만큼 새는 구멍이 생긴다.
 */
export async function uploadAnswerAudio(
  ownerId: string,
  uri: string,
): Promise<{ path?: string; error?: string }> {
  try {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    // **파일 종류를 주소에서 짐작하지 않는다.** 웹의 녹음 주소는 `blob:...` 이라
    // 확장자가 아예 없고, 브라우저마다 webm 으로도 mp4 로도 떨어진다. 확장자만
    // 보고 `.m4a` 라고 붙여 두면 파일 속은 webm 인데 이름만 m4a 인 것이 되어,
    // 나중에 어떤 브라우저에서는 재생이 안 된다. 받아 온 것에게 직접 물어본다.
    const declared = (response.headers.get('content-type') ?? '').split(';')[0].trim();
    const fromUri = (uri.split('?')[0].split('.').pop() ?? '').toLowerCase();
    const type = declared.startsWith('audio/') || declared.startsWith('video/')
      ? declared
      : fromUri === 'webm'
        ? 'audio/webm'
        : 'audio/m4a';
    const ext = type.includes('webm') ? 'webm' : type.includes('ogg') ? 'ogg' : type.includes('wav') ? 'wav' : 'm4a';

    const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(ASSET_BUCKET).upload(path, arrayBuffer, {
      contentType: type,
    });
    if (error) return { error: error.message };
    return { path };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '녹음을 올리지 못했어요.' };
  }
}

export async function removeAnswerAudio(path: string): Promise<void> {
  await supabase.storage.from(ASSET_BUCKET).remove([path]).catch(() => {});
}

export async function assetSignedUrl(path: string, seconds = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(ASSET_BUCKET).createSignedUrl(path, seconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function listInvites(subjectId: string): Promise<MissionInvite[]> {
  const { data, error } = await supabase
    .from('mission_witness_invites')
    .select(INVITE_COLUMNS)
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MissionInvite[];
}

export async function createInvite(
  ownerId: string,
  subjectId: string,
  input: { invitee_name: string; relation: string; questions: string[]; note: string },
): Promise<MissionInvite> {
  const { data, error } = await supabase
    .from('mission_witness_invites')
    .insert({ owner_id: ownerId, subject_id: subjectId, ...input })
    .select(INVITE_COLUMNS)
    .single();
  if (error) throw error;
  return data as MissionInvite;
}

/** 링크를 끄고 켠다. 지우지 않는 이유: 이미 받은 증언이 어느 요청에서 왔는지 남겨 둔다. */
export async function setInviteActive(inviteId: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('mission_witness_invites').update({ active }).eq('id', inviteId);
  if (error) throw error;
}

export async function listTestimonies(subjectId: string): Promise<MissionTestimony[]> {
  const { data, error } = await supabase
    .from('mission_testimonies')
    .select(TESTIMONY_COLUMNS)
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MissionTestimony[];
}

export async function addTestimony(
  ownerId: string,
  subjectId: string,
  input: { witness_name: string; relation: string; question: string; body: string },
): Promise<void> {
  const { error } = await supabase
    .from('mission_testimonies')
    .insert({ owner_id: ownerId, subject_id: subjectId, ...input, source: 'manual' });
  if (error) throw error;
}

export async function setTestimonyReviewed(testimonyId: string, reviewed: boolean): Promise<void> {
  const { error } = await supabase.from('mission_testimonies').update({ reviewed }).eq('id', testimonyId);
  if (error) throw error;
}

export async function setTestimonyVisibility(testimonyId: string, visibility: Visibility): Promise<void> {
  const { error } = await supabase.from('mission_testimonies').update({ visibility }).eq('id', testimonyId);
  if (error) throw error;
}

export async function deleteTestimony(testimonyId: string): Promise<void> {
  const { error } = await supabase.from('mission_testimonies').delete().eq('id', testimonyId);
  if (error) throw error;
}

// ── 증언자 쪽 (로그인 없이 쓰는 두 함수, 0080) ──────────────────────

export type WitnessPrompt = {
  subject_name: string;
  invitee_name: string;
  relation: string;
  questions: string[];
  note: string;
};

/** 링크를 연 사람에게 **물어볼 것만** 돌려준다. 기록은 한 줄도 돌려주지 않는다. */
export async function getWitnessPrompt(token: string): Promise<WitnessPrompt | null> {
  const { data, error } = await supabase.rpc('mission_witness_prompt', { p_token: token });
  if (error) throw error;
  const rows = (data ?? []) as WitnessPrompt[];
  return rows[0] ?? null;
}

export async function submitTestimony(
  token: string,
  witnessName: string,
  relation: string,
  contact: string,
  answers: { question: string; body: string }[],
): Promise<number> {
  const { data, error } = await supabase.rpc('mission_submit_testimony', {
    p_token: token,
    p_witness_name: witnessName,
    p_relation: relation,
    p_contact: contact,
    p_answers: answers,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

// ── 3단계: 디지털 기념관 (0081) ─────────────────────────────────────

const MEMORIAL_BUCKET = 'mission-memorial-photos';

export type MissionMemorial = {
  subject_id: string;
  slug: string;
  title: string;
  intro: string;
  published: boolean;
  updated_at: string;
};

export type MemorialPhoto = {
  id: string;
  path: string;
  caption: string;
  ord: number;
};

export async function getMemorialSettings(subjectId: string): Promise<MissionMemorial | null> {
  const { data, error } = await supabase
    .from('mission_memorials')
    .select('subject_id, slug, title, intro, published, updated_at')
    .eq('subject_id', subjectId)
    .maybeSingle();
  if (error) throw error;
  return (data as MissionMemorial | null) ?? null;
}

export async function saveMemorialSettings(
  ownerId: string,
  subjectId: string,
  input: { slug: string; title: string; intro: string; published: boolean },
): Promise<void> {
  const { error } = await supabase
    .from('mission_memorials')
    .upsert({ owner_id: ownerId, subject_id: subjectId, ...input }, { onConflict: 'subject_id' });
  if (error) throw error;
}

export async function listMemorialPhotos(subjectId: string): Promise<MemorialPhoto[]> {
  const { data, error } = await supabase
    .from('mission_memorial_photos')
    .select('id, path, caption, ord')
    .eq('subject_id', subjectId)
    .order('ord', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MemorialPhoto[];
}

export function memorialPhotoUrl(path: string): string {
  return supabase.storage.from(MEMORIAL_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * 자료실의 사진 하나를 기념관에 건다.
 *
 * 비공개 통의 파일을 가리키기만 하면 익명 방문자가 열 수 없다(0080/0081).
 * 서명 주소로 한 번 내려받아 **공개 통에 다시 올린다** — 「공개하겠다」고 한 번
 * 더 누른 사진만 공개된다는 규칙이 이 한 번의 복사다.
 */
export async function publishPhotoToMemorial(
  ownerId: string,
  subjectId: string,
  asset: { path: string | null; title: string },
  ord: number,
): Promise<{ error?: string }> {
  if (!asset.path) return { error: '파일이 없는 자료입니다.' };
  try {
    const signed = await assetSignedUrl(asset.path, 120);
    if (!signed) return { error: '원본을 열지 못했어요.' };
    const response = await fetch(signed);
    const arrayBuffer = await response.arrayBuffer();
    const ext = (asset.path.split('.').pop() ?? 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'jpg';
    const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(MEMORIAL_BUCKET).upload(path, arrayBuffer, {
      contentType: response.headers.get('content-type') ?? 'image/jpeg',
      cacheControl: '31536000',
    });
    if (uploadError) return { error: uploadError.message };

    const { error } = await supabase
      .from('mission_memorial_photos')
      .insert({ owner_id: ownerId, subject_id: subjectId, path, caption: asset.title, ord });
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : '기념관에 걸지 못했어요.' };
  }
}

export async function removeMemorialPhoto(photoId: string, path: string): Promise<void> {
  const { error } = await supabase.from('mission_memorial_photos').delete().eq('id', photoId);
  if (error) throw error;
  await supabase.storage.from(MEMORIAL_BUCKET).remove([path]).catch(() => {});
}

/** 방문자 쪽. 로그인 없이 함수 하나로 기념관을 통째로 받는다(0081). */
export async function getMemorial(slug: string): Promise<MemorialData | null> {
  const { data, error } = await supabase.rpc('mission_memorial', { p_slug: slug });
  if (error) throw error;
  return (data as MemorialData | null) ?? null;
}
