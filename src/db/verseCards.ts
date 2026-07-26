import { supabase } from '@/lib/supabase';

const BUCKET = 'verse-card-backgrounds';

/** Picks one random background photo from the verse-card-backgrounds Storage
 * bucket and returns its public URL. New photos can be added/removed there
 * (Supabase dashboard → Storage) with no app update needed — this always
 * re-lists the bucket rather than assuming a fixed file count/names. */
export async function getRandomCardBackgroundUrl(): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 200 });
  if (error) throw error;
  const files = (data ?? []).filter((f) => f.name && !f.name.endsWith('/'));
  if (files.length === 0) return null;
  const pick = files[Math.floor(Math.random() * files.length)];
  return supabase.storage.from(BUCKET).getPublicUrl(pick.name).data.publicUrl;
}
