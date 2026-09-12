import { currentChurchId } from '@/lib/churchScope';
import { supabase } from '@/lib/supabase';
import type { QtAnswers } from '@/db/userData';

export type ShepherdQt = {
  date: string;
  bookId: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
  label: string;
  qtAnswers: QtAnswers;
  reflection: string;
  applicationNote: string;
  isPublic: boolean;
};

const EMPTY_ANSWERS: QtAnswers = { observation: [], interpretation: [], application: [] };

function mapRow(row: any): ShepherdQt {
  return {
    date: row.date,
    bookId: row.book_id,
    chapter: row.chapter,
    startVerse: row.start_verse,
    endVerse: row.end_verse,
    label: row.label,
    qtAnswers: { ...EMPTY_ANSWERS, ...(row.qt_answers ?? {}) },
    reflection: row.reflection ?? '',
    applicationNote: row.application_note ?? '',
    isPublic: row.is_public,
  };
}

/**
 * 그날 공개된 목자의 큐티.
 *
 * 교회로 갈린다. 로그인하지 않으면 DB가 모든 교회 것을 내주므로(→
 * `@/lib/churchScope`) 교회를 정해서 부른다. 교회를 안 걸면 같은 날 두 교회가
 * 올린 날에 `maybeSingle` 이 「행이 여럿」으로 터지고, 안 터지더라도 남의 교회
 * 큐티가 뜬다.
 */
export async function getPublicShepherdQt(date: string): Promise<ShepherdQt | null> {
  const churchId = await currentChurchId();
  if (!churchId) return null;
  const { data, error } = await supabase
    .from('shepherd_qt')
    .select('*')
    .eq('date', date)
    .eq('is_public', true)
    .eq('church_id', churchId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

// 관리자가 자기 화면을 열 때 그날 이미 올려둔 내용이 있는지(공개/비공개 무관) 확인.
export async function getShepherdQtForAdmin(date: string): Promise<ShepherdQt | null> {
  const { data, error } = await supabase.from('shepherd_qt').select('*').eq('date', date).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function upsertShepherdQt(entry: {
  date: string;
  bookId: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
  label: string;
  qtAnswers: QtAnswers;
  reflection: string;
  applicationNote: string;
  isPublic: boolean;
}): Promise<{ error?: string }> {
  const { error } = await supabase.from('shepherd_qt').upsert(
    {
      date: entry.date,
      book_id: entry.bookId,
      chapter: entry.chapter,
      start_verse: entry.startVerse,
      end_verse: entry.endVerse,
      label: entry.label,
      qt_answers: entry.qtAnswers,
      reflection: entry.reflection,
      application_note: entry.applicationNote,
      is_public: entry.isPublic,
    },
    { onConflict: 'date' }
  );
  return { error: error?.message };
}
