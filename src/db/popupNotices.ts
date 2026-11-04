import { supabase } from '@/lib/supabase';

/**
 * 알림 팝업.
 *
 * 앱을 열자마자 한 번 보여 주는 자리. 기간이 지나면 저절로 사라진다.
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
 *
 * ## 기간을 여기서도 따지는 까닭
 *
 * 처음에는 DB 정책만 믿고 조건 없이 최신 한 줄을 가져왔다. 성도에게는 맞게
 * 돌았지만 **관리자에게는 지난 팝업이 계속 떴다.** 팝업 표에 걸린 관리자
 * 정책이 `for all` 이라 읽기에도 걸리는데, 그 조건은 「관리자인가」뿐이다.
 * 정책 여럿은 OR 로 묶이므로 관리자는 꺼 둔 것도 끝난 것도 전부 보게 된다 —
 * 9월에 끝난 공지가 목사님 화면에만 두 달을 떠 있었다.
 *
 * 그렇다고 기기 시계로 기간을 재면 안 된다. 시계가 틀어진 폰에서 지난 공지가
 * 되살아난다. 그래서 **때는 서버에게 묻는다** — `now` 는 우리가 만든 값이
 * 아니라 DB 가 자기 시계로 푸는 말이다.
 */
export async function getActivePopupNotice(): Promise<PopupNotice | null> {
  const { data, error } = await supabase
    .from('popup_notices')
    .select('*')
    .eq('is_active', true)
    .or('starts_at.is.null,starts_at.lte.now')
    .or('ends_at.is.null,ends_at.gt.now')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? mapRow(data[0]) : null;
}

