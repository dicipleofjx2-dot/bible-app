-- 팝업 기간을 날짜가 아니라 **시점**으로 바꾼다.
--
-- 0040은 날짜(date)로만 재고 `current_date`와 견줬다. 서버는 UTC로 돌기 때문에
-- 한국 자정부터 오전 9시까지는 서버 날짜가 하루 뒤처진다. 새벽 6시에
-- "오늘부터"로 올리면 오전 9시까지 안 뜨고, "오늘까지"로 정한 공지가 다음 날
-- 오전 9시까지 더 붙어 있었다. 새벽기도 시간에 공지를 올리는 일이 흔하므로
-- 실제로 겪는 문제다.
--
-- 시점(timestamptz)으로 재면 그 문제가 통째로 없어진다. 어느 시간대에서 적었든
-- 같은 순간을 가리키므로 `now()`와 견주기만 하면 된다. 덤으로 "주일 오전 9시부터
-- 수요일 밤까지"처럼 시간까지 정할 수 있다.

alter table popup_notices add column if not exists starts_at timestamptz;
alter table popup_notices add column if not exists ends_at timestamptz;

-- 이미 적어 둔 날짜가 있으면 옮긴다. 시작은 그날 0시, 끝은 그날이 다 지날 때까지
-- (그날까지 보인다는 뜻이었으므로 다음 날 0시 직전).
update popup_notices
   set starts_at = coalesce(starts_at, (starts_on::timestamp at time zone 'Asia/Seoul'))
 where starts_on is not null and starts_at is null;

update popup_notices
   set ends_at = coalesce(ends_at, ((ends_on + 1)::timestamp at time zone 'Asia/Seoul'))
 where ends_on is not null and ends_at is null;

comment on column popup_notices.starts_at is '이 시점부터 뜬다. 비우면 저장하는 즉시.';
comment on column popup_notices.ends_at is '이 시점이 지나면 사라진다. 비우면 끌 때까지.';

drop policy if exists popup_notices_read on popup_notices;
create policy popup_notices_read on popup_notices
  for select using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and (
      church_id is null
      or church_id = (select church_id from profiles where id = auth.uid())
    )
  );

-- 옛 날짜 칸은 지운다. 남겨 두면 어느 쪽이 진짜인지 헷갈리고, 화면이 실수로
-- 옛 칸을 쓰면 아무 때도 안 뜨는 공지가 생긴다.
alter table popup_notices drop column if exists starts_on;
alter table popup_notices drop column if exists ends_on;

drop index if exists popup_notices_active_idx;
create index if not exists popup_notices_active_idx
  on popup_notices (church_id, is_active, starts_at, ends_at);

do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_name = 'popup_notices' and column_name = 'starts_on'
  ) then
    raise exception '옛 날짜 칸이 남아 있습니다.';
  end if;
  raise notice '팝업 기간을 시점으로 바꿨습니다. 지금 서버 시각 %', now();
end $$;

notify pgrst, 'reload schema';
