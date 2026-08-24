import { supabase } from '@/lib/supabase';

export type Post = {
  id: string;
  user_id: string;
  book_id: number | null;
  chapter: number | null;
  verse: number | null;
  body: string;
  created_at: string;
  author: string;
  commentCount: number;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  hidden: boolean;
  created_at: string;
  author: string;
};

export async function getPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, book_id, chapter, verse, body, created_at, profiles(username), comments(count)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    author: row.profiles?.username ?? '익명',
    commentCount: row.comments?.[0]?.count ?? 0,
  }));
}

export async function getPost(postId: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, book_id, chapter, verse, body, created_at, profiles(username), comments(count)')
    .eq('id', postId)
    .single();
  if (error) throw error;
  if (!data) return null;
  const row = data as any;
  return { ...row, author: row.profiles?.username ?? '익명', commentCount: row.comments?.[0]?.count ?? 0 };
}

export async function createPost(userId: string, body: string): Promise<void> {
  const { error } = await supabase.from('posts').insert({ user_id: userId, body });
  if (error) throw error;
}

/** RLS restricts this to the post's own author (see 0001_init.sql). */
export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function getComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('id, post_id, user_id, body, hidden, created_at, profiles(username)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    author: row.profiles?.username ?? '익명',
  }));
}

export async function addComment(postId: string, userId: string, body: string): Promise<void> {
  const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: userId, body });
  if (error) throw error;
}

/** RLS restricts this to the comment's own author, the post's author, or an
 * admin (see 0018_comment_hide_and_moderation.sql). */
export async function setCommentHidden(commentId: string, hidden: boolean): Promise<void> {
  const { error } = await supabase.from('comments').update({ hidden }).eq('id', commentId);
  if (error) throw error;
}

/** RLS restricts this to the comment's own author, the post's author, or an
 * admin (see 0018_comment_hide_and_moderation.sql). */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}

/**
 * 내가 안 읽은 커뮤니티 글 수(0052).
 *
 * 내 글은 안 센다 — 방금 쓴 내 글이 「안 읽은 글 1개」로 뜨면 고장으로 보인다.
 * 한 번도 안 본 사람은 최근 7일 것만 센다.
 *
 * 실패해도 던지지 않는다. 홈 화면에 곁들이는 숫자라, 못 세었다고 홈이 통째로
 * 안 뜨면 안 된다.
 */
export async function getCommunityUnread(): Promise<number> {
  const { data, error } = await supabase.rpc('community_unread_count');
  if (error || typeof data !== 'number') return 0;
  return data;
}

/** 커뮤니티를 지금 봤다고 적는다. 화면이 실제로 뜬 뒤에 부른다. */
export async function markCommunitySeen(): Promise<void> {
  await supabase.rpc('community_mark_seen');
}
