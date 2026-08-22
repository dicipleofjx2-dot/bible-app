-- 3초 OX 퀴즈(스피드 퀴즈) 결과를 그날 기록에 남긴다.
--
-- 포인트는 따로 표를 두지 않고 reading_helper_day_records 에서 계산한다
-- (getPointsSummary). 그래야 통독을 리셋할 때 포인트도 함께 0이 되고,
-- 기록과 포인트가 어긋날 일이 없다. 새 퀴즈도 같은 자리에 붙인다.
--
-- 10문제를 다 맞혔을 때만 true 다. 부분 점수는 없다 — 3초 안에 답하는 놀이라
-- "다 맞히면 10점"이 규칙 전부다.

alter table public.reading_helper_day_records
  add column if not exists speed_quiz_success boolean;

comment on column public.reading_helper_day_records.speed_quiz_success is
  '3초 OX 퀴즈 10문제를 모두 맞혔는지. true면 포인트 10점.';
