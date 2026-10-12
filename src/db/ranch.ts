import { supabase } from '@/lib/supabase';
import type { RanchCounts } from '@/lib/ranch';

async function count(
  table: string,
  cellId: string,
  filter?: (q: any) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<number> {
  let q = supabase.from(table).select('id', { count: 'exact', head: true }).eq('cell_id', cellId);
  if (filter) q = filter(q);
  const { count: n, error } = await q;
  if (error) throw error;
  return n ?? 0;
}

/**
 * 목장이 지금까지 쌓은 활동의 수. 센 것만 돌려주고 글의 내용은 읽지 않는다.
 * 돌봄 기록·양육 표는 일부러 세지 않는다(src/lib/ranch.ts).
 */
export async function getRanchCounts(cellId: string): Promise<RanchCounts> {
  const [gatherings, reports, shares, messages] = await Promise.all([
    count('cell_gatherings', cellId, (q) => q.eq('status', 'closed')),
    count('cell_reports', cellId, (q) => q.is('deleted_at', null)),
    count('cell_shares', cellId, (q) => q.is('deleted_at', null)),
    count('cell_messages', cellId, (q) => q.is('deleted_at', null)),
  ]);
  return { gatherings, reports, shares, messages };
}
