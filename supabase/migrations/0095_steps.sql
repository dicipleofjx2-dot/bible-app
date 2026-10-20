-- 만보기 — 그날 몇 걸음 걸었는지.
--
-- 출석 도장(0093)과 같은 자리에 담는다. 「날짜마다 한 줄」이라는 모양이 이미 있고,
-- 달력이 그 표를 이미 읽고 있어서 걸음 수를 그려 넣기도 쉽다.
--
-- 점수는 아직 매기지 않는다. 포인트를 세는 DB 함수 다섯을 또 손대야 하는데,
-- 걸음 수는 기기마다 들쭉날쭉해서(주머니에 넣고 흔들면 올라간다) 점수로 바꾸려면
-- 규칙을 먼저 정해야 한다. 우선 쌓아 두고 본다.
--
-- 숫자는 **덮어쓰지 않고 큰 쪽을 남긴다**(앱 쪽 saveSteps 참고). 아이폰은 하루치를
-- 통째로 돌려주고 안드로이드는 앱을 켠 동안만 세기 때문에, 작은 값으로 덮으면
-- 걸음 수가 거꾸로 줄어든다.
alter table reading_helper_day_records
  add column if not exists steps integer not null default 0;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'reading_helper_day_records' and column_name = 'steps'
  ) then
    raise exception '만보기 칸이 만들어지지 않았습니다.';
  end if;
  raise notice '만보기 — 걸음 수를 받을 준비가 됐습니다.';
end $$;

notify pgrst, 'reload schema';
