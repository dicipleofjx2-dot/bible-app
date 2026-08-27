import { supabase } from '@/lib/supabase';

/**
 * 데이빗 큐티에서 오늘 큐티를 마쳤는가.
 *
 * 홈의 「오늘의 영적 여정」 ✓ 는 예전에 이 앱 안의 큐티 메모(`getMeditationNote`)가
 * 있는지로 판단했다. 큐티가 따로 도는 앱으로 옮겨졌으니 그 메모가 더는 안 생긴다.
 * 두 앱이 **같은 Supabase 프로젝트**를 쓰므로 큐티 기록 표를 그대로 읽어 판단한다.
 *
 * 표가 아직 없거나(마이그레이션 전) 로그인 전이면 조용히 false — ✓ 하나 때문에
 * 홈 화면이 통째로 막히면 안 된다.
 */
export async function hasQtRecordFor(userId: string, date: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('qt_records')
    .select('completed')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) return false;
  return data?.completed === true;
}
