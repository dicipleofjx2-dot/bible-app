import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';
import { STORAGE_CACHE_SECONDS } from '@/lib/storageCache';
import { getAllGratitudeEntries } from '@/db/userData';

/**
 * 감사일기장.
 *
 * 여태 감사 기록은 기기 안 SQLite 에만 있었다. 휴대폰을 바꾸면 통째로
 * 사라졌고 사진을 넣을 자리도 없었다. 0072 로 서버에 옮기면서
 * **기본은 나만 보고**, 글마다 「함께 나누기」를 켠 것만 남에게 보이게 했다.
 *
 * 표에는 사진의 **경로만** 담는다. 공개 주소를 그대로 담아 두면 프로젝트를
 * 옮겼을 때 예전 주소가 통째로 죽는다(서재 표지가 그렇게 깨진 적이 있다).
 * 주소는 언제나 여기서 만든다.
 */

const BUCKET = 'gratitude-photos';
const MAX_PHOTOS = 3;

export type GratitudeJournalEntry = {
  id: string;
  userId: string;
  date: string;
  item1: string;
  item2: string;
  item3: string;
  note: string;
  /** 저장된 경로. 화면에 그릴 때는 photoUrls 를 쓴다. */
  photoPaths: string[];
  photoUrls: string[];
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SharedGratitudeEntry = Omit<GratitudeJournalEntry, 'isShared' | 'updatedAt'> & {
  authorName: string;
};

export function gratitudePhotoUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function mapEntry(row: any): GratitudeJournalEntry {
  const paths: string[] = row.photo_paths ?? [];
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    item1: row.item1 ?? '',
    item2: row.item2 ?? '',
    item3: row.item3 ?? '',
    note: row.note ?? '',
    photoPaths: paths,
    photoUrls: paths.map(gratitudePhotoUrl),
    isShared: !!row.is_shared,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isEmptyGratitude(e: {
  item1: string;
  item2: string;
  item3: string;
  note: string;
  photoPaths: string[];
}): boolean {
  return (
    !e.item1.trim() && !e.item2.trim() && !e.item3.trim() && !e.note.trim() && e.photoPaths.length === 0
  );
}

export async function getGratitudeEntryFor(
  userId: string,
  date: string,
): Promise<GratitudeJournalEntry | null> {
  const { data, error } = await supabase
    .from('gratitude_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if (error || !data) return null;
  return mapEntry(data);
}

export async function getMyGratitudeJournal(userId: string, limit = 120): Promise<GratitudeJournalEntry[]> {
  const { data, error } = await supabase
    .from('gratitude_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map(mapEntry);
}

/**
 * 함께 나눈 감사.
 *
 * 이름은 DB 함수가 붙여 준다 — profiles 를 직접 읽으면 이메일이 그대로 이름
 * 자리에 나오는 계정이 많다(0056·0066 과 같은 이유).
 */
export async function getSharedGratitudeFeed(limit = 50): Promise<SharedGratitudeEntry[]> {
  const { data, error } = await supabase.rpc('gratitude_shared_feed', { p_limit: limit });
  if (error || !data) return [];
  return (data as any[]).map((row) => {
    const paths: string[] = row.photo_paths ?? [];
    return {
      id: row.id,
      userId: row.user_id,
      authorName: row.author_name ?? '이름 없음',
      date: row.date,
      item1: row.item1 ?? '',
      item2: row.item2 ?? '',
      item3: row.item3 ?? '',
      note: row.note ?? '',
      photoPaths: paths,
      photoUrls: paths.map(gratitudePhotoUrl),
      createdAt: row.created_at,
    };
  });
}

export async function saveGratitudeEntry(input: {
  userId: string;
  date: string;
  item1: string;
  item2: string;
  item3: string;
  note: string;
  photoPaths: string[];
  isShared: boolean;
}): Promise<{ entry?: GratitudeJournalEntry; error?: string }> {
  // 다 지웠으면 그 날 기록을 없앤다 — 빈 카드가 일기장에 쌓이면 지저분하다.
  if (isEmptyGratitude(input)) {
    await supabase.from('gratitude_entries').delete().eq('user_id', input.userId).eq('date', input.date);
    return {};
  }

  const { data, error } = await supabase
    .from('gratitude_entries')
    .upsert(
      {
        user_id: input.userId,
        date: input.date,
        item1: input.item1.trim(),
        item2: input.item2.trim(),
        item3: input.item3.trim(),
        note: input.note.trim(),
        photo_paths: input.photoPaths.slice(0, MAX_PHOTOS),
        is_shared: input.isShared,
      },
      { onConflict: 'user_id,date' },
    )
    .select('*')
    .single();

  if (error) return { error: error.message };
  return { entry: mapEntry(data) };
}

export async function deleteGratitudeEntryById(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('gratitude_entries').delete().eq('id', id);
  return { error: error?.message };
}

/**
 * 사진 한 장 올리기.
 *
 * 경로 첫 칸이 그 사람의 uuid 다 — 저장소 정책이 「자기 폴더에만 올린다」를
 * 그 칸으로 판정한다(0072). 폴더를 바꾸면 올리기가 조용히 막힌다.
 */
export async function uploadGratitudePhoto(
  userId: string,
  uri: string,
  mimeType?: string,
): Promise<{ path?: string; error?: string }> {
  try {
    // **줄여서 올린다.** 휴대폰 사진 한 장이 그대로 2MB 를 넘는다(처음 올려 본
    // 것이 2.2MB PNG 였다). 감사일기는 목록으로 죽 훑는 화면이라 그런 장이
    // 몇 장만 쌓여도 데이터를 심하게 먹고, 무엇보다 **전송량 한도에 걸리면
    // 앱 전체가 멎는다** — 2026-08-29 에 실제로 그렇게 두 프로젝트가 막혔다.
    // 가로 1600px · JPEG 0.8 이면 대개 300KB 안쪽인데 눈으로는 차이가 없다.
    const shrunk = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    }).catch(() => null);

    const source = shrunk?.uri ?? uri;
    const response = await fetch(source);
    const arrayBuffer = await response.arrayBuffer();
    // 줄이기가 실패하면 원본 그대로 올린다 — 사진을 못 올리는 것보다 낫다.
    const type = shrunk ? 'image/jpeg' : mimeType ?? 'image/jpeg';
    const ext = (type.split('/')[1] ?? 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
      contentType: type,
      cacheControl: STORAGE_CACHE_SECONDS,
    });
    if (error) return { error: error.message };
    return { path };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '사진을 올리지 못했어요.' };
  }
}

export async function removeGratitudePhoto(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}

export const GRATITUDE_MAX_PHOTOS = MAX_PHOTOS;

/**
 * 기기에만 있던 예전 감사를 한 번 올려 준다.
 *
 * 감사일기를 서버로 옮기기 전에 쓴 글이 있는 사람은, 옮긴 날 화면을 열면
 * **지난 일기가 통째로 사라진 것처럼** 보인다. 몇 해치 감사를 잃은 줄 알면
 * 그 사람은 다시 안 쓴다.
 *
 * 이미 서버에 그 날짜가 있으면 건드리지 않는다 — 서버 것이 더 새것이다.
 * 한 번 끝나면 기기에 표시를 남겨 다시 돌지 않는다(계정마다 따로).
 */
export async function syncLocalGratitudeOnce(userId: string): Promise<void> {
  const flag = `bibleapp.gratitude.synced.${userId}`;
  if (await AsyncStorage.getItem(flag)) return;

  const local = await getAllGratitudeEntries();
  if (local.length === 0) {
    await AsyncStorage.setItem(flag, '1');
    return;
  }

  const { data: existing } = await supabase
    .from('gratitude_entries')
    .select('date')
    .eq('user_id', userId);
  const have = new Set((existing ?? []).map((r: any) => r.date));

  const rows = local
    .filter((e) => !have.has(e.date))
    .filter((e) => e.item1?.trim() || e.item2?.trim() || e.item3?.trim())
    .map((e) => ({
      user_id: userId,
      date: e.date,
      item1: e.item1 ?? '',
      item2: e.item2 ?? '',
      item3: e.item3 ?? '',
    }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from('gratitude_entries')
      .upsert(rows, { onConflict: 'user_id,date', ignoreDuplicates: true });
    // 실패하면 표시를 남기지 않는다 — 다음에 열 때 다시 해 본다.
    if (error) return;
  }
  await AsyncStorage.setItem(flag, '1');
}
