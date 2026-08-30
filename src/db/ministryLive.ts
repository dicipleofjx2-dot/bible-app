import { supabase } from '@/lib/supabase';

/**
 * 목회동행 — 목사님이 지금 사역 중이신가.
 *
 * 사역ON(같은 Postgres 의 ministry 스키마)에서 「성도와 함께 보기」를 켜면
 * public.ministry_live 에 줄 하나가 생기고, 끄거나 마치시면 그 줄이 사라진다.
 * 그래서 **켜 두신 동안에만** 홈에 띠가 뜬다. 평소에는 아무것도 없다.
 *
 * 이 표에는 위치가 들어 있지 않다 — 제목·상태·열쇠뿐이다.
 * 지도와 사진은 열쇠로 여는 사역ON 화면이 그린다(그쪽이 무엇을 가릴지 정한다).
 */

export type MinistryLive = {
  title: string;
  kind: string | null;
  note: string | null;
  /** 실시간 화면을 여는 주소 */
  url: string;
  status: string;
  startedAt: string;
};

const LIVE_BASE = 'https://dg-ministry-on.vercel.app/live/';

/** 오래 켜 둔 채 잊으신 줄은 띄우지 않는다. 하루면 오늘 사역이 아니다. */
const 하루 = 24 * 60 * 60 * 1000;

export async function getMinistryLive(): Promise<MinistryLive | null> {
  const { data, error } = await supabase
    .from('ministry_live')
    .select('title, kind, note, token, status, started_at, updated_at')
    .limit(1)
    .maybeSingle();

  // 표가 아직 없거나 못 읽어도 홈은 그대로 떠야 한다.
  if (error || !data) return null;

  const updated = new Date(data.updated_at ?? data.started_at).getTime();
  if (Number.isFinite(updated) && Date.now() - updated > 하루) return null;

  return {
    title: data.title,
    kind: data.kind,
    note: data.note,
    url: `${LIVE_BASE}${data.token}`,
    status: data.status,
    startedAt: data.started_at,
  };
}
