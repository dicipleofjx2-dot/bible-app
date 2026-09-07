import { supabase } from '@/lib/supabase';

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

