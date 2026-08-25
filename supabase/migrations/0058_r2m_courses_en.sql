-- R2M 훈련과정의 **이름과 설명에 영어 자리**를 둔다.
--
-- 화면 문구는 사전(strings.ts)에 넣으면 되지만, 과정 이름과 주차 제목은 관리자가
-- 직접 지어 이 표에 넣는 말이다. 사전에 넣을 수가 없다 — 교회마다, 기수마다
-- 다르고 앱을 새로 배포해야 바뀌기 때문이다. 그래서 말이 사는 곳에 영어 자리를
-- 나란히 둔다.
--
-- ## 비어 있으면 한글이 나온다
--
-- 0057 과 같은 방식이다. 영어 칸은 null 을 허용하고, 앱은 영어로 볼 때 영어 칸이
-- 비어 있으면 한글을 그대로 보여 준다. 관리자가 영어를 안 적었다고 해서 화면에
-- 빈 줄이 생기면 안 된다.
--
-- 표를 언어별로 나누지 않는 이유도 0057 과 같다. 같은 과정의 두 말은 한 행에
-- 두어야 한쪽만 고쳐지는 일이 없다.

alter table public.r2m_courses
  add column if not exists title_en text,
  add column if not exists description_en text;

alter table public.r2m_course_weeks
  add column if not exists title_en text,
  add column if not exists description_en text;

comment on column public.r2m_courses.title_en is
  '과정 이름(영어). 비어 있으면 앱이 한글 title 을 보여 준다.';
comment on column public.r2m_courses.description_en is
  '과정 설명(영어). 비어 있으면 앱이 한글 description 을 보여 준다.';
comment on column public.r2m_course_weeks.title_en is
  '주차 제목(영어). 비어 있으면 앱이 한글 title 을 보여 준다.';
comment on column public.r2m_course_weeks.description_en is
  '주차 설명(영어). 비어 있으면 앱이 한글 description 을 보여 준다.';
