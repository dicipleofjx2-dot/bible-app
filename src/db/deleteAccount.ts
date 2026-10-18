import { supabase } from '@/lib/supabase';

/**
 * 계정 삭제.
 *
 * 구글 플레이는 «앱 안에서 계정을 지울 수 있어야 한다»고 요구한다.
 * 서비스 롤 열쇠를 앱에 넣지 않기 위해, 실제 삭제는 DB 함수
 * `public.delete_my_account()` 가 맡는다(마이그레이션 0079).
 * 그 함수는 auth.uid() 로 «부른 사람 자신»만 지운다.
 */

/** 지우기 전에 무엇이 사라지는지 미리 센다. 표 이름 → 행 수 */
export type AccountSummary = Record<string, number>;

const LABELS: Record<string, string> = {
  reading_helper_progress: '통독 진행',
  reading_helper_day_records: '통독 날짜 기록',
  qt_records: '큐티 기록',
  gratitude_entries: '감사일기',
  prayer_requests: '기도제목',
  prayer_logs: '기도 기록',
  reading_plan_progress: '읽기표 진행',
  notes: '노트',
  word_notes: '말씀노트',
  shop_purchases: '포인트 상점 이용',
  arena_escape_records: '방탈출 기록',
};

export function labelOf(table: string) {
  return LABELS[table] ?? table;
}

export async function getAccountSummary(): Promise<AccountSummary> {
  const { data, error } = await supabase.rpc('my_account_summary');
  if (error) throw error;
  return (data ?? {}) as AccountSummary;
}

/**
 * 계정을 지운다. 성공하면 세션이 무효가 되므로 곧바로 로그아웃까지 한다.
 *
 * 실패하면 오류를 그대로 던진다 — 예전에 이 삭제가 «조용히» 실패했던 적이 있어
 * (외래키가 막는데 오류 객체가 비어 있었다) 화면에서 반드시 사유를 보여 줘야 한다.
 */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    const detail = [error.message, error.details, error.hint].filter(Boolean).join(' / ');
    throw new Error(detail || '계정을 지우지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
  }
  // 계정이 사라졌으므로 남은 세션과 저장된 토큰을 정리한다
  await supabase.auth.signOut();
}
