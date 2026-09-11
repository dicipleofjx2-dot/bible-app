import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * 워드프레스로 보내는 문 (기획서 §10).
 *
 * ── 왜 서버에서 하는가 ───────────────────────────────────────────────
 * 워드프레스 **애플리케이션 비밀번호**는 새면 남이 내 블로그에 글을 쓸 수 있는
 * 열쇠다. 브라우저에 두면 개발자 도구를 여는 누구나 가져갈 수 있으므로, 이
 * 라우트(서버)에서만 읽는다. 화면은 「무엇을 보낼지」만 보내고 열쇠는 보지 못한다.
 *
 * ── 기본은 언제나 초안 ───────────────────────────────────────────────
 * §10 6번 — 기본 상태를 `draft` 로 한다. 꿈과 예언을 실수로 곧장 공개하는 쪽보다,
 * 초안함에 쌓이는 쪽이 낫다. 공개는 사용자가 `status` 를 직접 바꿔 보낼 때만.
 */
export const runtime = 'nodejs';

type Body = {
  recordId?: string;
  title?: string;
  html?: string;
  status?: 'draft' | 'publish' | 'future';
  date?: string;          // 예약 발행 (status=future)
  categories?: number[];
  tags?: number[];
  excerpt?: string;
};

function env(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  // 1. 누가 보냈는지 확인한다. 열쇠를 쥔 문이므로 로그인한 본인만 지날 수 있다.
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!token || !supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Body;
  if (!body.title?.trim() || !body.html?.trim()) {
    return NextResponse.json({ error: '제목과 본문이 필요합니다.' }, { status: 400 });
  }

  // 2. 보내려는 기록이 **정말 이 사람 것인지** 표에 물어본다. RLS 가 걸린 손잡이로
  //    읽으므로, 남의 기록 아이디를 적어 보내면 아무것도 나오지 않는다.
  if (body.recordId) {
    const { data: record } = await supabase
      .from('spirit_records')
      .select('id')
      .eq('id', body.recordId)
      .maybeSingle();
    if (!record) return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 });
  }

  const site = env('WORDPRESS_URL');
  const wpUser = env('WORDPRESS_USER');
  const wpPassword = env('WORDPRESS_APP_PASSWORD');
  if (!site || !wpUser || !wpPassword) {
    return NextResponse.json(
      { error: '워드프레스 설정이 없습니다. WORDPRESS_URL / WORDPRESS_USER / WORDPRESS_APP_PASSWORD 를 환경 변수에 넣어 주세요.' },
      { status: 503 },
    );
  }

  const status = body.status ?? 'draft';
  const payload: Record<string, unknown> = {
    title: body.title,
    content: body.html,
    status,
  };
  if (body.excerpt) payload.excerpt = body.excerpt;
  if (body.categories?.length) payload.categories = body.categories;
  if (body.tags?.length) payload.tags = body.tags;
  if (status === 'future' && body.date) payload.date = body.date;

  const endpoint = `${site.replace(/\/+$/, '')}/wp-json/wp/v2/posts`;
  // 애플리케이션 비밀번호는 공백이 섞여 발급된다. 워드프레스는 공백을 무시한다.
  const basic = Buffer.from(`${wpUser}:${wpPassword.replace(/\s+/g, '')}`).toString('base64');

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basic}` },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return NextResponse.json(
      { error: `워드프레스에 닿지 못했습니다: ${e instanceof Error ? e.message : '알 수 없음'}` },
      { status: 502 },
    );
  }

  const text = await response.text();
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(text) as Record<string, unknown>; } catch { /* 워드프레스가 html 을 돌려줄 때가 있다 */ }

  if (!response.ok) {
    const message = typeof parsed.message === 'string' ? parsed.message : text.slice(0, 200);
    return NextResponse.json({ error: `워드프레스가 거절했습니다 (${response.status}): ${message}` }, { status: 502 });
  }

  return NextResponse.json({
    id: parsed.id ?? null,
    url: parsed.link ?? null,
    status: parsed.status ?? status,
  });
}

/** 설정이 되어 있는지만 알려 준다. **값은 절대 돌려주지 않는다.** */
export async function GET() {
  return NextResponse.json({
    configured: Boolean(env('WORDPRESS_URL') && env('WORDPRESS_USER') && env('WORDPRESS_APP_PASSWORD')),
    site: env('WORDPRESS_URL'),
  });
}
