import { supabase } from '@/lib/supabase';

export type BookCategory = '저서' | '성경공부교재';
export type BookAccessTier = 'free' | 'purchase_only' | 'subscription_included' | 'both';
export type BookLanguage = 'ko' | 'en';
export type BookFormat = 'epub' | 'pdf';

export type Book = {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  // 실제 EPUB/PDF 파일의 공개 URL. 텍스트만 붙여넣은(파일 업로드 없는) 책이면 빈 문자열.
  filePath: string;
  coverUrl: string;
  category: BookCategory;
  description: string;
  price: number;
  accessTier: BookAccessTier;
  language: BookLanguage;
  isPublished: boolean;
  createdAt: string;
};

export type BookWithContent = Book & { paragraphs: string[] };

// 잠긴 책에서 무료로 보여주는 앞부분 분량. 스크롤형 리더라 "페이지" 개념이 없어서
// 문단 수로 근사한다 — 3~4페이지 분량이 되도록 넉넉하게 잡음(문단당 몇 줄인지에
// 따라 실제 화면 수는 다를 수 있음). 리더(read.tsx)와 상세 화면([id].tsx)의
// 안내 문구가 서로 어긋나지 않도록 여기 한 곳에서 관리한다.
export const PREVIEW_PARAGRAPH_LIMIT = 15;

export type AccessState = {
  purchasedBookIds: string[];
  hasActiveSubscription: boolean;
};

function mapBookRow(row: any): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    format: row.format,
    filePath: row.file_path ?? '',
    coverUrl: row.cover_url ?? '',
    category: row.category,
    description: row.description,
    price: row.price,
    accessTier: row.access_tier,
    language: row.language,
    isPublished: row.is_published,
    createdAt: row.created_at,
  };
}

// 문단은 빈 줄(연속 개행) 기준으로 나눈다 — personal-library-app 웹 관리자
// CMS에서 등록한 본문(body_text)과 같은 규칙.
function splitIntoParagraphs(bodyText: string): string[] {
  return bodyText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export async function getPublishedBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapBookRow);
}

export async function getBookWithContent(bookId: string): Promise<BookWithContent | null> {
  const { data, error } = await supabase.from('books').select('*').eq('id', bookId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...mapBookRow(data), paragraphs: splitIntoParagraphs(data.body_text) };
}

// Supabase SQL 쪽에도 같은 로직이 있어야 하지만(향후 has_book_access 함수),
// 지금은 프론트에서 판단하고 실제 열람 데이터(구매/구독 여부) 자체는 서버(RLS)가
// 지켜준다 — 접근권 티어 판단만 프론트 로직.
export function hasBookAccess(book: Book, access: AccessState): boolean {
  // 가격이 0원이면 접근 유형을 뭘로 설정했든(등록 시 실수로 '무료'를 안 골랐어도)
  // 무조건 전체 열람 가능 — 0원인데 구매를 거쳐야 하는 건 어차피 의미가 없다.
  if (book.price === 0) return true;

  switch (book.accessTier) {
    case 'free':
      return true;
    case 'purchase_only':
      return access.purchasedBookIds.includes(book.id);
    case 'subscription_included':
      return access.hasActiveSubscription;
    case 'both':
      return access.purchasedBookIds.includes(book.id) || access.hasActiveSubscription;
    default:
      return false;
  }
}

// 열람 권한은 승인이 끝난 것만 인정한다 — 구매는 status='paid', 구독은
// status='active'이면서 이용기간(current_period_end)이 남아 있어야 한다.
// 대기중(pending) 신청은 여기 포함되지 않으므로, 입금 신청만 해두고 실제로
// 입금하지 않은 사람에게 콘텐츠가 열리지 않는다.
//
// 실제 결제/승인은 src/db/payments.ts에 있다. 이 파일에는 "권한을 읽는" 함수만
// 두고, "권한을 여는" 함수는 두지 않는다 — 0021 시절 클라이언트가 스스로
// 구독을 활성화할 수 있었던 구멍(0033_manual_payment_approval.sql에서 수정)이
// 여기 있던 toggleSubscription()이었다.
export async function getMyAccess(userId: string): Promise<AccessState> {
  const [{ data: purchases }, { data: subscriptions }] = await Promise.all([
    supabase.from('purchases').select('book_id').eq('user_id', userId).eq('status', 'paid'),
    supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      // 0033 이전에 승인된 행에는 만료일이 없을 수 있어 null도 유효로 본다.
      .or(`current_period_end.is.null,current_period_end.gt.${new Date().toISOString()}`)
      .limit(1),
  ]);
  return {
    purchasedBookIds: (purchases ?? []).map((row: any) => row.book_id as string),
    hasActiveSubscription: (subscriptions ?? []).length > 0,
  };
}

// ============================================================
// 관리자 CMS — 데이빗북스 등록/삭제. RLS가 profiles.is_admin인 계정만
// insert/update/delete를 허용하므로(0021_personal_library.sql), 여기서
// 별도로 권한 체크를 하지 않아도 안전하다(실패하면 에러 메시지로 돌아온다).
// ============================================================

export type BookEntry = {
  title: string;
  author: string;
  category: BookCategory;
  description: string;
  coverUrl: string;
  price: number;
  accessTier: BookAccessTier;
  language: BookLanguage;
  // 문단은 빈 줄(\n\n)로 구분한다. 실제 파일(filePath)을 올렸으면 비워도 된다.
  bodyText: string;
  // 업로드된 EPUB/PDF 파일의 공개 URL. 텍스트만 쓰면 빈 문자열.
  filePath: string;
  format: BookFormat;
};

const COVER_COLOR: Record<BookCategory, string> = {
  저서: 'C77B4A',
  성경공부교재: '8BA888',
};

function normalizeEntry(raw: BookEntry): BookEntry {
  return {
    title: raw.title,
    author: raw.author,
    category: raw.category,
    description: raw.description ?? '',
    coverUrl: raw.coverUrl ?? '',
    price: typeof raw.price === 'number' ? raw.price : 0,
    accessTier: raw.accessTier ?? 'purchase_only',
    language: raw.language ?? 'ko',
    bodyText: raw.bodyText ?? '',
    filePath: raw.filePath ?? '',
    format: raw.format ?? 'epub',
  };
}

// 본문 텍스트를 붙여넣거나, 실제 파일(EPUB/PDF)을 올리거나 — 둘 중 하나만 있으면 된다.
export function isValidBookEntry(value: unknown): value is BookEntry {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>;
  const hasBodyText = typeof record.bodyText === 'string' && (record.bodyText as string).trim().length > 0;
  const hasFile = typeof record.filePath === 'string' && (record.filePath as string).trim().length > 0;
  return (
    typeof record.title === 'string' &&
    record.title.trim().length > 0 &&
    typeof record.author === 'string' &&
    (record.category === '저서' || record.category === '성경공부교재') &&
    typeof record.description === 'string' &&
    (hasBodyText || hasFile)
  );
}

export async function getAllBooksForAdmin(): Promise<Book[]> {
  const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapBookRow);
}

export async function insertBook(entry: BookEntry): Promise<{ error?: string }> {
  const normalized = normalizeEntry(entry);
  const coverUrl =
    normalized.coverUrl.trim() ||
    `https://placehold.co/240x340/${COVER_COLOR[normalized.category]}/FFF8ED?text=${encodeURIComponent(normalized.title)}`;

  const { error } = await supabase.from('books').insert({
    title: normalized.title,
    author: normalized.author,
    format: normalized.format,
    file_path: normalized.filePath || null,
    cover_url: coverUrl,
    category: normalized.category,
    description: normalized.description,
    price: normalized.price,
    access_tier: normalized.accessTier,
    language: normalized.language,
    is_published: true,
    body_text: normalized.bodyText,
  });

  return { error: error?.message };
}

export async function insertBooksFromJson(json: string): Promise<{ count?: number; error?: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { error: 'JSON 형식이 올바르지 않습니다.' };
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  const validEntries = items.filter(isValidBookEntry).map(normalizeEntry);
  if (validEntries.length === 0) {
    return { error: '유효한 책 항목이 없습니다. title/author/category/description과 bodyText(또는 filePath)를 확인하세요.' };
  }

  let successCount = 0;
  let lastError: string | undefined;
  for (const entry of validEntries) {
    const result = await insertBook(entry);
    if (result.error) lastError = result.error;
    else successCount += 1;
  }

  if (successCount === 0) return { error: lastError ?? '등록에 실패했습니다.' };
  return { count: successCount, error: lastError ? `${lastError} (일부만 등록됨)` : undefined };
}

export async function deleteBook(bookId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('books').delete().eq('id', bookId);
  return { error: error?.message };
}

// 기기에서 고른 표지 이미지를 Storage 버킷(book-covers, 0023_book_covers_bucket.sql)에
// 올리고 공개 URL을 돌려준다. RN/웹 양쪽에서 fetch(uri)로 로컬 파일을 읽어
// ArrayBuffer로 변환하는 방식 — expo-file-system 없이도 두 플랫폼 모두 동작한다.
export async function uploadBookCover(uri: string, mimeType?: string): Promise<{ url?: string; error?: string }> {
  try {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const ext = mimeType?.split('/')[1] ?? 'jpg';
    const filePath = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('book-covers')
      .upload(filePath, arrayBuffer, { contentType: mimeType ?? 'image/jpeg' });
    if (uploadError) return { error: uploadError.message };

    const { data } = supabase.storage.from('book-covers').getPublicUrl(filePath);
    return { url: data.publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '이미지 업로드에 실패했습니다.' };
  }
}

// 기기에서 고른 실제 책 파일(EPUB/PDF)을 book-files 버킷(0024_book_files_bucket.sql)에
// 올리고 공개 URL + 감지된 포맷을 돌려준다. 확장자로 pdf/epub을 구분한다.
export async function uploadBookFile(
  uri: string,
  mimeType: string | undefined,
  fileName: string,
): Promise<{ url?: string; format?: BookFormat; error?: string }> {
  try {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const ext = (fileName.split('.').pop() ?? '').toLowerCase();
    const format: BookFormat = ext === 'pdf' ? 'pdf' : 'epub';
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext || format}`;
    const filePath = `files/${storedName}`;

    const { error: uploadError } = await supabase.storage.from('book-files').upload(filePath, arrayBuffer, {
      contentType: mimeType ?? (format === 'pdf' ? 'application/pdf' : 'application/epub+zip'),
    });
    if (uploadError) return { error: uploadError.message };

    const { data } = supabase.storage.from('book-files').getPublicUrl(filePath);
    return { url: data.publicUrl, format };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '파일 업로드에 실패했습니다.' };
  }
}
