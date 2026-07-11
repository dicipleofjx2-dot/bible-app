-- Seeds one starter reading plan: the Gospel of John, one chapter a day (21 days).
-- book_id 43 = 요한복음 (John), matching the book_order in the bundled bible.db.

insert into public.reading_plans (slug, title, description)
values ('john-21-days', '요한복음 21일 통독', '요한복음을 하루 한 장씩 21일 동안 읽는 계획입니다.')
on conflict (slug) do nothing;

insert into public.reading_plan_days (plan_id, day_number, book_id, chapter)
select
  (select id from public.reading_plans where slug = 'john-21-days'),
  day_number,
  43,
  day_number
from generate_series(1, 21) as day_number
on conflict (plan_id, day_number, book_id, chapter) do nothing;
