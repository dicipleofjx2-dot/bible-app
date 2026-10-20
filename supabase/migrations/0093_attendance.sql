-- 출석 도장 — 하루 50점.
--
-- ── 왜 표를 새로 만들지 않았나 ───────────────────────────────────────
-- 출석만 담는 표를 따로 두는 쪽이 깔끔해 보이지만, 포인트를 세는 함수가 **다섯**이다
-- (points_balance_of · shop_balance · reading_helper_ranking · reading_helper_my_rank ·
-- reading_helper_admin_board). 새 표를 만들면 다섯 군데에 조인을 하나씩 더해야 하고,
-- 한 군데를 빠뜨리면 「순위표에는 들어가는데 내 포인트에는 없다」가 된다 — 큐티 30점이
-- 실제로 그랬다.
--
-- 다섯 함수가 이미 모두 reading_helper_day_records 를 `r` 로 읽고 있으므로, 거기에
-- 칸 하나를 더하고 같은 자리에 한 줄씩 보태는 것이 어긋날 자리가 가장 적다.
--
-- ── 지키는 규칙 ─────────────────────────────────────────────────────
-- · 도장은 **오늘만** 찍는다(화면이 막는다). 지난 날까지 열어 두면 한 해를 한꺼번에
--   찍어 18,250점을 만들 수 있고, 그러면 출석이라는 말이 뜻을 잃는다.
-- · 잘못 눌렀으면 다시 눌러 뗀다. 되돌릴 길이 없는 단추는 누르기 무섭다.
-- · 포인트 시작일(reading_helper_points_since) 이후만 센다 — 다른 점수와 같은 규칙이다.
--
-- ⚠️ 앱 쪽 숫자는 `src/lib/readingHelper/db.ts` 의 ATTENDANCE_POINTS 다. 둘이 같아야 한다.

alter table reading_helper_day_records
  add column if not exists attended boolean not null default false;

comment on column reading_helper_day_records.attended is
  '그날 출석 도장을 찍었는가. 하루 50점(ATTENDANCE_POINTS).';

-- ── 점수를 세는 다섯 함수에 같은 한 줄을 더한다 ──────────────────────
--
-- 아래 do 블록은 각 함수의 **지금 정의를 그대로 읽어** 그 한 줄만 끼워 넣고 다시
-- 만든다. 정의를 손으로 베껴 적으면, 그 사이에 다른 마이그레이션이 고쳐 둔 것을
-- 조용히 되돌리게 된다.
--
-- 이미 더해져 있으면 건너뛴다(여러 번 돌려도 안전하다).

do $$
declare
  f record;
  src text;
begin
  for f in
    select p.oid
    from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public'
      and p.prokind = 'f'
      and position('speed_quiz_success then 10' in coalesce(p.prosrc, '')) > 0
      and position('attended then 50' in coalesce(p.prosrc, '')) = 0
  loop
    src := replace(
      pg_get_functiondef(f.oid),
      'case when r.speed_quiz_success then 10 else 0 end',
      E'case when r.speed_quiz_success then 10 else 0 end\n        + case when r.attended then 50 else 0 end'
    );
    execute src;
  end loop;
end $$;

do $$
declare
  missing int;
begin
  select count(*) into missing
  from pg_proc p
  join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public'
    and p.prokind = 'f'
    and position('speed_quiz_success then 10' in coalesce(p.prosrc, '')) > 0
    and position('attended then 50' in coalesce(p.prosrc, '')) = 0;

  if missing > 0 then
    raise exception '점수를 세는 함수 %개가 아직 출석을 안 셉니다.', missing;
  end if;
  raise notice '출석 도장을 셀 준비가 됐습니다 — 하루 50점.';
end $$;

notify pgrst, 'reload schema';
