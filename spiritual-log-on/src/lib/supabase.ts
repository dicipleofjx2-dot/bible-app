'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 브라우저에서 쓰는 Supabase 손잡이.
 *
 * 여기 들어가는 열쇠는 **anon key** 뿐이다 — 표의 정책(`0001_spirit_log.sql`)이
 * 본인 것만 열어 주므로 이 열쇠가 새어도 남의 기록은 열리지 않는다. 워드프레스
 * 비밀번호처럼 새면 끝인 것은 이 파일 근처에 두지 않는다(서버 라우트에서만 쓴다).
 */
let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 없습니다. .env.local 을 확인해 주세요.');
  }
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}
