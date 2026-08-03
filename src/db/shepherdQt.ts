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

// 로그인 여부와 무관하게 누구나 호출 가능 — RLS의 is_public 정책이 이미 걸러준다.
export async function getPublicShepherdQt(date: string): Promise<ShepherdQt | null> {
  const { data, error } = await supabase
    .from('shepherd_qt')
    .select('*')
    .eq('date', date)
    .eq('is_public', true)
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
