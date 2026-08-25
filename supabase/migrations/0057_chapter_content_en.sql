-- 통독도우미 장별 콘텐츠에 **영어**를 나란히 둔다.
--
-- 필리핀 성도가 늘어 화면을 영어로 볼 수 있게 했는데(0056 이후), 정작 날마다
-- 읽는 요약·퀴즈·암송구절만 한글로 남아 있었다. 화면 단추만 영어인 통독도우미는
-- 쓸 수가 없다 — 정작 읽어야 할 것이 안 읽힌다.
--
-- ## 왜 표를 따로 만들지 않는가
--
-- 언어별로 행을 나누면(book_id, chapter, lang) 같은 장의 한글·영어가 서로 다른
-- 행이 되어, 한쪽만 채워지거나 한쪽만 고쳐지는 일이 생긴다. 같은 장의 두 말은
-- **한 행에** 둔다. 그러면 한 번의 upsert 로 둘이 함께 들어간다.
--
-- ## 비어 있으면 한글이 나온다
--
-- 영어 칸은 null 을 허용한다. 아직 안 옮긴 장은 영어로 두어도 한글 요약이
-- 나온다 — 빈 화면보다 낫다. 앱이 그렇게 골라 쓴다(dayContent.ts).

alter table public.reading_helper_chapter_content
  add column if not exists summary_en text,
  add column if not exists questions_en jsonb,
  add column if not exists memory_verse_en jsonb;

comment on column public.reading_helper_chapter_content.summary_en is
  '그 장의 요약·해설(영어). 비어 있으면 앱이 한글 summary 를 보여 준다.';
comment on column public.reading_helper_chapter_content.questions_en is
  '그 장의 퀴즈 문항(영어). 한글 questions 와 문항 수·순서가 같아야 한다.';
comment on column public.reading_helper_chapter_content.memory_verse_en is
  '그 장의 암송구절(영어). 오픈성경 영어(open_en) 본문 — 화면에서 읽는 영어 본문과 같은 것으로 맞춘다.';

notify pgrst, 'reload schema';
