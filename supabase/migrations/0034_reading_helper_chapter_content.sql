-- 통독 콘텐츠를 "며칠째"가 아니라 "성경 몇 장"에 붙인다 (2026-08-09)
--
-- 0033에서 day_number를 열쇠로 잡았는데 그게 틀렸다. 통독 계획이 주일 5장·평일 3장이라
-- 시작 요일이 다르면 같은 Day가 서로 다른 본문을 가리킨다. 실제 사용자 14명의 시작일로
-- 확인한 결과:
--   Day 11 — 7/29 시작: 창세기 33~35장 / 7/31 시작: 창세기 35~37장
-- day_number로 저장하면 상당수가 엉뚱한 본문의 해설을 보게 된다.
--
-- 해설·문제는 본문에 속한 것이라 장에 붙이면 누가 언제 읽든 맞는다. 하루치 화면은
-- 그날 범위에 해당하는 장들을 합쳐서 만든다(앱의 dayContent.ts).
--
-- Supabase 대시보드 SQL Editor에서 실행할 것.

drop table if exists public.reading_helper_day_content;

create table public.reading_helper_chapter_content (
  book_id smallint not null,      -- 1~66 정경 순서
  chapter smallint not null,
  book_name text not null,        -- "창세기" — 조회 결과만 보고도 알아보게
  -- 그 장의 요약·해설. 중학생이 읽어도 이해되는 말로 쓴다.
  summary text not null,
  -- 그 장에서 내는 문제들. 앱 quizTypes.ts의 QuizQuestion[] 모양.
  -- 하루치 퀴즈는 그날 범위 장들의 문제를 모아 최대 20문항으로 추린다.
  questions jsonb not null default '[]'::jsonb,
  -- { reference, text } — 그 장의 대표 암송구절. 없는 장도 있을 수 있어 null 허용.
  -- 성경 본문 전체를 담지 않는다(개역개정 저작권). 장마다 한 구절만 인용한다.
  memory_verse jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (book_id, chapter)
);

alter table public.reading_helper_chapter_content enable row level security;

-- 공부 콘텐츠라 로그인 전에도 읽을 수 있어야 한다(블로그가 공개였던 것과 같다).
create policy "anyone can read reading helper chapter content"
  on public.reading_helper_chapter_content for select
  using (true);

-- 쓰기 정책은 두지 않는다. 적재는 서비스 롤 스크립트로만 한다.

-- 어디까지 채웠는지 한눈에 보기 위한 것
create index reading_helper_chapter_content_book_idx
  on public.reading_helper_chapter_content (book_id, chapter);
