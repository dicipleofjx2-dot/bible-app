import { supabase } from '@/lib/supabase';
import { STORAGE_CACHE_SECONDS } from '@/lib/storageCache';

/**
 * 알림 팝업.
 *
 * 앱을 열자마자 한 번 보여 주는 자리. 기간이 지나면 저절로 사라진다 —
 * 기간 판정은 DB 정책(0040)이 한다. 화면에서 걸러면 기기 시계가 틀어졌을 때
 * 지난 공지가 뜨고, 화면이 여럿이면 같은 규칙을 두 번 적게 된다.
 */
export type PopupNotice = {
  id: string;
  churchId: string | null;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  /** ISO 시점. 비우면 저장하는 즉시 / 끌 때까지. */
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

function mapRow(row: any): PopupNotice {
  return {
    id: row.id,
    churchId: row.church_id ?? null,
    title: row.title ?? '',
    body: row.body ?? null,
    imageUrl: row.image_url ?? null,
    linkUrl: row.link_url ?? null,
    linkLabel: row.link_label ?? null,
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    isActive: !!row.is_active,
  };
}

/**
 * 지금 띄울 팝업 하나. 없으면 null.
 *
 * 여러 개가 살아 있으면 최근에 만든 것 하나만 띄운다. 두 개를 겹쳐 띄우면
 * 성도는 닫기만 두 번 누르게 되고 정작 내용은 안 읽는다.
 */
export async function getActivePopupNotice(): Promise<PopupNotice | null> {
  const { data, error } = await supabase
    .from('popup_notices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? mapRow(data[0]) : null;
}

/** 관리 화면용 — 기간이 지난 것과 꺼 둔 것까지 모두. */
export async function listPopupNotices(): Promise<PopupNotice[]> {
  const { data, error } = await supabase
    .from('popup_notices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export type PopupNoticeInput = {
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

export async function createPopupNotice(
  churchId: string | null,
  input: PopupNoticeInput,
): Promise<{ error?: string }> {
  const { error } = await supabase.from('popup_notices').insert({
    church_id: churchId,
    title: input.title.trim(),
    body: input.body?.trim() || null,
    image_url: input.imageUrl,
    link_url: input.linkUrl?.trim() || null,
    link_label: input.linkLabel?.trim() || null,
    starts_at: input.startsAt || null,
    ends_at: input.endsAt || null,
    is_active: input.isActive,
  });
  return { error: error?.message };
}

export async function updatePopupNotice(
  id: string,
  input: PopupNoticeInput,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('popup_notices')
    .update({
      title: input.title.trim(),
      body: input.body?.trim() || null,
      image_url: input.imageUrl,
      link_url: input.linkUrl?.trim() || null,
      link_label: input.linkLabel?.trim() || null,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      is_active: input.isActive,
    })
    .eq('id', id);
  return { error: error?.message };
}

export async function deletePopupNotice(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('popup_notices').delete().eq('id', id);
  return { error: error?.message };
}

/**
 * 팝업에 넣을 그림을 올린다.
 *
 * 목자편지 그림과 같은 방식이되 통은 따로 쓴다(popup-images) — 같은 통에 담으면
 * 관리 화면에서 서로 섞여 무엇이 무엇인지 알 수 없다.
 */
export async function uploadPopupImage(
  uri: string,
  mimeType?: string,
): Promise<{ url?: string; error?: string }> {
  try {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const ext = mimeType?.split('/')[1] ?? 'jpg';
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('popup-images')
      .upload(filePath, arrayBuffer, {
        contentType: mimeType ?? 'image/jpeg',
        cacheControl: STORAGE_CACHE_SECONDS,
      });
    if (uploadError) return { error: uploadError.message };

    const { data } = supabase.storage.from('popup-images').getPublicUrl(filePath);
    return { url: data.publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '이미지 업로드에 실패했습니다.' };
  }
}
