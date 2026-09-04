import * as ImageManipulator from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

const PHOTO_BUCKET = 'prayer-fruit-photos';
/** 열매 사진은 작게 뜬다. 오래 두고 봐도 되도록 한 해를 캐시에 맡긴다. */
const STORAGE_CACHE_SECONDS = '31536000';

export type PrayerTopic = {
  id: string;
  fruit_id: string;
  body: string;
  answered: boolean;
  answered_at: string | null;
  answer_note: string;
  created_at: string;
};

export type PrayerFruit = {
  id: string;
  name: string;
  photo_path: string | null;
  memo: string;
  pos_x: number;
  pos_y: number;
  created_at: string;
  /** 이 사람을 위해 마지막으로 기도한 때(0077). 한 번도 없으면 null */
  last_prayed_at: string | null;
  prayed_count: number;
  /** 따서 과일상자에 담은 때(0078). 나무에 달려 있으면 null */
  harvested_at: string | null;
  topics: PrayerTopic[];
};

/** 표에는 경로만 담는다(0076). 공개 주소는 읽을 때 만든다. */
export function fruitPhotoUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * 나무 한 그루를 통째로 읽는다.
 *
 * 열매마다 기도제목을 따로 부르면 열매 스무 개에 요청이 스물한 번이다. 한 사람이
 * 가진 것이 많아야 수백 줄이라 두 번으로 끝내고 화면에서 묶는다.
 */
export async function getPrayerTree(userId: string): Promise<PrayerFruit[]> {
  const { data: fruits, error } = await supabase
    .from('prayer_fruits')
    .select(
      'id, name, photo_path, memo, pos_x, pos_y, created_at, last_prayed_at, prayed_count, harvested_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const { data: topics, error: topicError } = await supabase
    .from('prayer_fruit_topics')
    .select('id, fruit_id, body, answered, answered_at, answer_note, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (topicError) throw topicError;

  const byFruit = new Map<string, PrayerTopic[]>();
  for (const topic of (topics ?? []) as PrayerTopic[]) {
    const list = byFruit.get(topic.fruit_id);
    if (list) list.push(topic);
    else byFruit.set(topic.fruit_id, [topic]);
  }

  return ((fruits ?? []) as Omit<PrayerFruit, 'topics'>[]).map((fruit) => ({
    ...fruit,
    topics: byFruit.get(fruit.id) ?? [],
  }));
}

export async function createFruit(
  userId: string,
  input: { name: string; memo?: string; pos_x: number; pos_y: number; photo_path?: string | null },
): Promise<string> {
  const { data, error } = await supabase
    .from('prayer_fruits')
    .insert({
      user_id: userId,
      name: input.name,
      memo: input.memo ?? '',
      pos_x: input.pos_x,
      pos_y: input.pos_y,
      photo_path: input.photo_path ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateFruit(
  fruitId: string,
  patch: Partial<Pick<PrayerFruit, 'name' | 'memo' | 'pos_x' | 'pos_y' | 'photo_path'>>,
): Promise<void> {
  const { error } = await supabase.from('prayer_fruits').update(patch).eq('id', fruitId);
  if (error) throw error;
}

/** 기도제목은 표가 딸려 지운다(on delete cascade). 사진은 여기서 치운다. */
export async function deleteFruit(fruitId: string, photoPath: string | null): Promise<void> {
  const { error } = await supabase.from('prayer_fruits').delete().eq('id', fruitId);
  if (error) throw error;
  if (photoPath) await removeFruitPhoto(photoPath);
}

export async function addTopic(userId: string, fruitId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('prayer_fruit_topics')
    .insert({ user_id: userId, fruit_id: fruitId, body });
  if (error) throw error;
}

/**
 * 응답 표시를 켜고 끈다.
 *
 * answered_at 은 보내지 않는다 — 표의 트리거가 채운다(0076). 화면이 채우면
 * 기기 시계가 틀어진 만큼 기록이 틀어진다.
 */
export async function setTopicAnswered(topicId: string, answered: boolean): Promise<void> {
  const { error } = await supabase.from('prayer_fruit_topics').update({ answered }).eq('id', topicId);
  if (error) throw error;
}

export async function updateTopic(
  topicId: string,
  patch: Partial<Pick<PrayerTopic, 'body' | 'answer_note'>>,
): Promise<void> {
  const { error } = await supabase.from('prayer_fruit_topics').update(patch).eq('id', topicId);
  if (error) throw error;
}

export async function deleteTopic(topicId: string): Promise<void> {
  const { error } = await supabase.from('prayer_fruit_topics').delete().eq('id', topicId);
  if (error) throw error;
}

/**
 * 열매 사진 한 장. 경로 첫 칸이 그 사람의 uuid 여야 저장소 정책을 지난다(0076).
 * 감사일기(0072)와 같은 방식으로 줄여서 올린다 — 열매는 60px 로 뜨는데 원본을
 * 그대로 올리면 전송량만 먹는다.
 */
export async function uploadFruitPhoto(
  userId: string,
  uri: string,
  mimeType?: string,
): Promise<{ path?: string; error?: string }> {
  try {
    const shrunk = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 640 } }], {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    }).catch(() => null);

    const source = shrunk?.uri ?? uri;
    const response = await fetch(source);
    const arrayBuffer = await response.arrayBuffer();
    const type = shrunk ? 'image/jpeg' : mimeType ?? 'image/jpeg';
    const ext = (type.split('/')[1] ?? 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, arrayBuffer, {
      contentType: type,
      cacheControl: STORAGE_CACHE_SECONDS,
    });
    if (error) return { error: error.message };
    return { path };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '사진을 올리지 못했어요.' };
  }
}

export async function removeFruitPhoto(path: string): Promise<void> {
  await supabase.storage.from(PHOTO_BUCKET).remove([path]).catch(() => {});
}

/**
 * 다 익은 열매를 따서 상자에 담는다 — 되돌리려면 `harvested: false`.
 *
 * 딴 때를 담는 이유: 상자는 담은 차례대로 아래부터 쌓인다. 순서가 없으면
 * 「언제 응답받았는지」가 사라져 그냥 열매 무더기가 된다.
 */
export async function setFruitHarvested(fruitId: string, harvested: boolean): Promise<string | null> {
  const at = harvested ? new Date().toISOString() : null;
  const { error } = await supabase
    .from('prayer_fruits')
    .update({ harvested_at: at })
    .eq('id', fruitId);
  if (error) throw error;
  return at;
}

/**
 * 이 열매를 위해 방금 기도했다고 남긴다.
 *
 * 한 번 부르면 두 가지가 같이 일어난다(0077 의 RPC 안에서).
 *   · 열매의 마지막 기도 시각과 횟수가 올라간다.
 *   · R2M 「오늘의 훈련」의 기도 항목이 채워진다(prayer_logs). 그날 이미
 *     채워져 있으면 줄을 더 넣지 않는다 — 성장기록이 줄 수를 「기도한 날」로
 *     세기 때문이다.
 *
 * 두 가지를 화면에서 따로 부르지 않는 이유: 사이에서 끊기면 열매만 올라가고
 * 훈련은 안 채워지는(또는 그 반대) 어긋난 기록이 남는다.
 */
export async function prayForFruit(fruitId: string): Promise<string> {
  const { data, error } = await supabase.rpc('pray_for_fruit', { p_fruit_id: fruitId });
  if (error) throw error;
  return typeof data === 'string' ? data : new Date().toISOString();
}

/** 기도음악 — 사람마다 자기 재생목록. 없으면 빈 문자열. */
export async function getPrayerPlaylist(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('prayer_tree_settings')
    .select('playlist_url')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as { playlist_url: string } | null)?.playlist_url ?? '';
}

export async function setPrayerPlaylist(userId: string, playlistUrl: string): Promise<void> {
  const { error } = await supabase
    .from('prayer_tree_settings')
    .upsert({ user_id: userId, playlist_url: playlistUrl }, { onConflict: 'user_id' });
  if (error) throw error;
}
