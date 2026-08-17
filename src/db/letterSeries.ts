import { supabase } from '@/lib/supabase';

/**
 * 목자편지 연재.
 *
 * 교회 홈페이지 게시판의 연재와 slug로 이어진다. 홈페이지는 옛 글(정적 파일)과
 * 여기 새 글을 같은 slug로 묶어 한 줄로 보여준다 — 그래서 slug를 함부로 바꾸면
 * 옛 글과 끊긴다. 화면에서는 이름만 고치게 하고 slug는 만들 때 한 번만 정한다.
 */
export type LetterSeries = {
  id: string;
  slug: string;
  name: string;
  author: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

function mapRow(row: any): LetterSeries {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    author: row.author ?? '',
    description: row.description ?? '',
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active,
  };
}

export async function getLetterSeries(): Promise<LetterSeries[]> {
  const { data, error } = await supabase
    .from('letter_series')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/**
 * 이름에서 slug를 만든다.
 *
 * 한글은 주소에 그대로 쓸 수 없으므로 영문·숫자만 남기고, 남는 게 없으면
 * (한글 이름이면 대개 그렇다) 시각 기반의 짧은 문자열을 쓴다. 사람이 읽을 수
 * 있는 slug를 원하면 만들 때 직접 적어 넣으면 된다.
 */
function makeSlug(name: string, taken: string[]): string {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const base = ascii || `series-${Date.now().toString(36)}`;
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export async function createLetterSeries(entry: {
  name: string;
  author: string;
  description: string;
  slug?: string;
}): Promise<{ error?: string }> {
  const name = entry.name.trim();
  if (!name) return { error: '연재 이름을 입력해주세요.' };

  const existing = await getLetterSeries().catch(() => [] as LetterSeries[]);
  const slug = (entry.slug ?? '').trim() || makeSlug(name, existing.map((s) => s.slug));
  if (existing.some((s) => s.slug === slug)) return { error: '같은 주소를 쓰는 연재가 이미 있어요.' };

  const nextOrder = Math.max(0, ...existing.map((s) => s.sortOrder)) + 10;
  const { error } = await supabase.from('letter_series').insert({
    slug,
    name,
    author: entry.author.trim(),
    description: entry.description.trim(),
    sort_order: nextOrder,
  });
  return { error: error?.message };
}

export async function updateLetterSeries(
  id: string,
  patch: { name?: string; author?: string; description?: string; isActive?: boolean },
): Promise<{ error?: string }> {
  // slug는 일부러 뺐다 — 홈페이지의 옛 글과 이어 주는 열쇠라 바뀌면 끊긴다.
  const { error } = await supabase
    .from('letter_series')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.author !== undefined ? { author: patch.author.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
      ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  return { error: error?.message };
}

/** 글이 하나라도 붙어 있으면 지우지 않는다 — 지우면 그 글들의 연재가 사라진다. */
export async function deleteLetterSeries(id: string): Promise<{ error?: string }> {
  const { count } = await supabase
    .from('shepherd_letters')
    .select('id', { count: 'exact', head: true })
    .eq('series_id', id);
  if ((count ?? 0) > 0) {
    return { error: '이 연재에 쓴 글이 있어 지울 수 없어요. 대신 숨기기를 눌러주세요.' };
  }
  const { error } = await supabase.from('letter_series').delete().eq('id', id);
  return { error: error?.message };
}
