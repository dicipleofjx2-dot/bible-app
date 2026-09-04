-- 다 익은 열매를 따서 과일상자에 담는다.
--
-- 기도제목이 **모두 응답된** 열매는 나무에 그대로 두면 자리만 차지한다. 딴
-- 열매는 나무에서 내려오고 상자에 쌓인다 — 한 해를 지나 상자가 차오르는 것이
-- 그 사람의 응답 기록이 된다.
--
-- **자동으로 따지 않는다.** 응답 체크 한 번에 열매가 사라지면 잘못 누른 사람은
-- 잃어버린 줄 안다. 따는 것은 사람이 누르는 한 걸음으로 둔다.
--
-- 되돌리기는 값 하나를 비우는 것이다(harvested_at = null). 그래서 기도제목이
-- 새로 생기면(= 더 이상 다 익은 열매가 아니면) 화면이 조용히 나무로 되돌린다.

alter table public.prayer_fruits
  add column if not exists harvested_at timestamptz;

-- 상자는 담은 차례대로 쌓는다. 목록이 그 순서를 자주 묻는다.
create index if not exists prayer_fruits_harvested_idx
  on public.prayer_fruits (user_id, harvested_at)
  where harvested_at is not null;
