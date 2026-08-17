import { supabase } from '@/lib/supabase';

/**
 * 교회 게시판.
 *
 * 목자의 편지(shepherd_letters)와 다른 물건이다. 목자편지는 관리자가 성도에게
 * 보내는 글이고, 게시판은 성도 누구나 쓰는 곳이다. 그래서 테이블도 권한도 따로
 * 둔다.
 *
 * 게시판의 slug는 교회 홈페이지의 옛 게시판과 이어 주는 열쇠다. 같은 slug를 쓰면
 * 홈페이지에서 옛 글 뒤에 여기 새 글이 이어져 보인다 — 그래서 만든 뒤에는
 * 바꾸지 않는다.
 */
export type Board = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** 'member'면 로그인한 교인 누구나, 'admin'이면 관리자만 쓴다. */
  writeAccess: 'member' | 'admin';
  sortOrder: number;
  isActive: boolean;
};

export type BoardPost = {
  id: string;
  boardId: string;
  authorId: string | null;
  authorName: string;
  title: string;
  bodyText: string;
  imageUrls: string[];
  createdAt: string;
};

export type BoardPostWithParagraphs = BoardPost & { paragraphs: string[] };

function mapBoard(row: any): Board {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    writeAccess: row.write_access,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active,
  };
}

function mapPost(row: any): BoardPost {
  return {
    id: row.id,
    boardId: row.board_id,
    authorId: row.author_id ?? null,
    authorName: row.author_name ?? '',
    title: row.title,
    bodyText: row.body_text ?? '',
    imageUrls: row.image_urls ?? [],
    createdAt: row.created_at,
  };
}

// 목자편지·전자책과 같은 규칙 — 문단은 빈 줄 기준으로 나눈다.
function splitIntoParagraphs(bodyText: string): string[] {
  return bodyText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export async function getBoards(): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapBoard);
}

export async function getBoardBySlug(slug: string): Promise<Board | null> {
  const { data, error } = await supabase.from('boards').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data ? mapBoard(data) : null;
}

export async function getBoardPosts(boardId: string): Promise<BoardPost[]> {
  const { data, error } = await supabase
    .from('board_posts')
    .select('*')
    .eq('board_id', boardId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPost);
}

export async function getBoardPost(id: string): Promise<BoardPostWithParagraphs | null> {
  const { data, error } = await supabase.from('board_posts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...mapPost(data), paragraphs: splitIntoParagraphs(data.body_text ?? '') };
}

export async function createBoardPost(entry: {
  boardId: string;
  authorId: string;
  authorName: string;
  title: string;
  bodyText: string;
  imageUrls: string[];
}): Promise<{ error?: string }> {
  if (!entry.title.trim()) return { error: '제목을 입력해주세요.' };
  if (!entry.bodyText.trim()) return { error: '내용을 입력해주세요.' };

  const { error } = await supabase.from('board_posts').insert({
    board_id: entry.boardId,
    author_id: entry.authorId,
    author_name: entry.authorName.trim() || '이름 없음',
    title: entry.title.trim(),
    body_text: entry.bodyText,
    image_urls: entry.imageUrls,
  });
  // RLS가 막으면 무슨 뜻인지 알기 어려운 문구가 오므로 바꿔서 돌려준다.
  if (error) {
    return {
      error: error.message.includes('row-level security')
        ? '이 게시판에는 글을 쓸 수 없어요. 관리자만 쓰는 게시판입니다.'
        : error.message,
    };
  }
  return {};
}

export async function updateBoardPost(
  id: string,
  patch: { title: string; bodyText: string; imageUrls: string[] },
): Promise<{ error?: string }> {
  if (!patch.title.trim()) return { error: '제목을 입력해주세요.' };
  const { error } = await supabase
    .from('board_posts')
    .update({
      title: patch.title.trim(),
      body_text: patch.bodyText,
      image_urls: patch.imageUrls,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  return { error: error?.message };
}

/** 지우지 않고 표시만 한다 — 실수로 지운 글을 되살릴 수 있게. */
export async function deleteBoardPost(id: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('board_posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message };
}

// ── 게시판 관리 (관리자 전용) ────────────────────────────────────────────

function makeSlug(name: string, taken: string[]): string {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const base = ascii || `board-${Date.now().toString(36)}`;
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export async function createBoard(entry: {
  name: string;
  description: string;
  writeAccess: 'member' | 'admin';
}): Promise<{ error?: string }> {
  const name = entry.name.trim();
  if (!name) return { error: '게시판 이름을 입력해주세요.' };

  const existing = await getBoards().catch(() => [] as Board[]);
  const slug = makeSlug(name, existing.map((b) => b.slug));
  const nextOrder = Math.max(0, ...existing.map((b) => b.sortOrder)) + 10;

  const { error } = await supabase.from('boards').insert({
    slug,
    name,
    description: entry.description.trim(),
    write_access: entry.writeAccess,
    sort_order: nextOrder,
  });
  return { error: error?.message };
}

export async function updateBoard(
  id: string,
  patch: {
    name?: string;
    description?: string;
    writeAccess?: 'member' | 'admin';
    isActive?: boolean;
  },
): Promise<{ error?: string }> {
  // slug는 일부러 뺐다 — 홈페이지의 옛 글과 이어 주는 열쇠라 바뀌면 끊긴다.
  const { error } = await supabase
    .from('boards')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
      ...(patch.writeAccess !== undefined ? { write_access: patch.writeAccess } : {}),
      ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  return { error: error?.message };
}

export async function deleteBoard(id: string): Promise<{ error?: string }> {
  const { count } = await supabase
    .from('board_posts')
    .select('id', { count: 'exact', head: true })
    .eq('board_id', id)
    .is('deleted_at', null);
  if ((count ?? 0) > 0) {
    return { error: '글이 있는 게시판은 지울 수 없어요. 대신 숨기기를 눌러주세요.' };
  }
  const { error } = await supabase.from('boards').delete().eq('id', id);
  return { error: error?.message };
}
