-- 성경통독도우미 콘텐츠를 앱이 직접 보관한다 (2026-08-09)
--
-- 그동안 하루치 해설·퀴즈·암송구절은 biblereadinghelper.blogspot.com에 매일
-- 자동 발행된 글을 앱이 읽어 HTML을 파싱하는 방식이었다. 그 자동화가 쓰던
-- Gemini 크레딧이 떨어져 2026-07-28(Day 10)에 멈췄고, 앱도 Day 11부터 함께 멈췄다.
--
-- 통독 계획은 이미 정해져 있어(창세기 1장부터 평일 3장·주일 5장) 그날그날 만들 이유가
-- 없는 내용이다. 미리 만들어 이 표에 넣어두면 매일 돌아야 하는 자동화가 사라지고,
-- 외부 서비스가 죽어도 앱은 그대로 굴러간다.
--
-- 성경 본문 자체는 넣지 않는다(개역개정 저작권). 읽기는 외부 오픈 라이선스 성경으로
-- 링크하고, 암송구절 한 구절만 인용한다.
--
-- Supabase 대시보드 SQL Editor에서 실행할 것.

create table public.reading_helper_day_content (
  day_number integer primary key,
  -- "창세기 1~3장" — 화면에 그대로 쓰는 표기
  chapter_label text not null,
  -- 그날 읽은 범위의 요약·해설. 중학생이 읽어도 이해되는 말로 쓴다.
  narrative text not null,
  -- QuizQuestion[] (choice | short). 앱의 quizTypes.ts 모양과 같다.
  questions jsonb not null default '[]'::jsonb,
  -- { reference, text } — 암송 퍼즐이 쓰는 한 구절. 조각내기는 앱에서 한다.
  memorization jsonb not null,
  -- 'blog' = 블로그 글에서 옮겨온 것, 'authored' = 직접 작성한 것
  source text not null default 'authored',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reading_helper_day_content enable row level security;

-- 공부 콘텐츠라 로그인 전에도 읽을 수 있어야 한다(블로그가 공개였던 것과 같다).
create policy "anyone can read reading helper content"
  on public.reading_helper_day_content for select
  using (true);

-- 쓰기 정책은 두지 않는다. 콘텐츠 적재는 서비스 롤 스크립트로만 한다 —
-- 로그인한 사용자가 학습 콘텐츠를 고칠 수 있어야 할 이유가 없다.

create index reading_helper_day_content_updated_idx
  on public.reading_helper_day_content (updated_at desc);
