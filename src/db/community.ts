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
