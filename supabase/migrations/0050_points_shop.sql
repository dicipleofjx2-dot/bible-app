-- 포인트 교환소.
--
-- ── 왜 앱 안의 것부터인가 ──────────────────────────────────────
--
-- 포인트를 현금이나 상품으로 바꿔 주려면 두 가지에 걸린다. 제휴 수수료를
-- 구매자에게 되돌려주는 캐시백은 제휴 약관에서 대체로 막고 있고, 교회가
-- 포인트를 현금성으로 지급하면 그건 사실상 상품권 발행이라 세무·회계가
-- 애매해진다. 그래서 **교회 밖으로 나가지 않는 것**부터 만든다 — 칭호와 배지는
-- 돈이 한 푼도 안 들고, 순위표에 그대로 드러나므로 오히려 더 잘 보인다.
--
-- ── 잔액을 어떻게 세는가 ───────────────────────────────────────
--
-- 지금 포인트는 표에 쌓아 두는 값이 아니라 **기록에서 그때그때 계산**하는
-- 값이다(퀴즈 점수·암송·3초OX). 그래서 "쓰면 줄어든다"는 개념이 원래 없다.
--
-- 번 점수를 건드리지 않고 **쓴 점수만 따로 적는다.**
--   번 점수(earned) = 지금까지처럼 기록에서 계산
--   쓴 점수(spent)  = 산 물건 값의 합
--   잔액            = earned - spent
--
-- 이렇게 하면 **물건을 샀다고 순위가 떨어지지 않는다.** 순위는 번 점수로 서기
-- 때문이다. 아껴 쓰는 사람이 유리해지면 아무도 안 쓰게 되고, 그러면 교환소를
-- 만든 뜻이 없어진다.

-- ── 1. 파는 것 ─────────────────────────────────────────────────
create table if not exists shop_items (
  id uuid primary key default gen_random_uuid(),
  -- title: 이름 앞에 붙는 칭호 · badge: 이름 뒤에 붙는 표
  kind text not null check (kind in ('title', 'badge')),
  label text not null,
  emoji text not null default '',
  description text not null default '',
  cost integer not null check (cost > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table shop_items enable row level security;

-- 무엇을 파는지는 누구나 본다. 사려면 점수가 있어야 할 뿐이다.
drop policy if exists shop_items_read on shop_items;
create policy shop_items_read on shop_items for select using (true);

-- ── 2. 산 것 ───────────────────────────────────────────────────
create table if not exists shop_purchases (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references shop_items(id) on delete restrict,
  -- 살 때의 값을 그대로 적어 둔다. 나중에 값을 내려도 이미 낸 점수는 그대로여야
  -- 잔액 셈이 맞는다.
  cost_paid integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table shop_purchases enable row level security;

drop policy if exists shop_purchases_own on shop_purchases;
create policy shop_purchases_own on shop_purchases
  for select using (user_id = auth.uid());

-- 사는 것은 함수로만 한다(shop_buy). 화면에서 직접 넣게 두면 값을 안 내고도
-- 넣을 수 있다.

-- ── 3. 지금 달고 있는 것 ───────────────────────────────────────
alter table profiles add column if not exists equipped_title_id uuid references shop_items(id);
alter table profiles add column if not exists equipped_badge_id uuid references shop_items(id);

comment on column profiles.equipped_title_id is '순위표와 프로필에 붙는 칭호. 산 것 중에서만 고를 수 있다.';

-- ── 4. 잔액 ────────────────────────────────────────────────────
create or replace function public.shop_balance()
returns table (earned integer, spent integer, balance integer)
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce((
      -- 점수 셈은 db.ts · 순위표(0049) · 관리자 현황판(0047)과 **같은 숫자**여야 한다.
      select sum(
        case when r.quiz_score >= 100 then 30
             when r.quiz_score >= 90 then 20
             when r.quiz_score >= 80 then 10
             else 0 end
        + case when r.memorization_success then 10 else 0 end
        + case when r.speed_quiz_success then 10 else 0 end
      )::int
      from reading_helper_day_records r where r.user_id = auth.uid()
    ), 0),
    coalesce((select sum(cost_paid)::int from shop_purchases where user_id = auth.uid()), 0),
    coalesce((
      select sum(
        case when r.quiz_score >= 100 then 30
             when r.quiz_score >= 90 then 20
             when r.quiz_score >= 80 then 10
             else 0 end
        + case when r.memorization_success then 10 else 0 end
        + case when r.speed_quiz_success then 10 else 0 end
      )::int
      from reading_helper_day_records r where r.user_id = auth.uid()
    ), 0)
    - coalesce((select sum(cost_paid)::int from shop_purchases where user_id = auth.uid()), 0);
$$;

-- ── 5. 사기 ────────────────────────────────────────────────────
create or replace function public.shop_buy(target_item_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  it record;
  bal integer;
begin
  if uid is null then raise exception '로그인이 필요합니다.'; end if;

  select * into it from shop_items where id = target_item_id and is_active = true;
  if not found then raise exception '지금은 살 수 없는 것입니다.'; end if;

  -- 이미 샀으면 조용히 넘어간다. 두 번 눌렀다고 두 번 빠져나가면 안 된다.
  if exists (select 1 from shop_purchases where user_id = uid and item_id = target_item_id) then
    return '이미 가지고 있어요.';
  end if;

  select balance into bal from shop_balance();
  if bal < it.cost then
    raise exception '점수가 모자라요. % 점이 필요한데 % 점 남았어요.', it.cost, bal;
  end if;

  insert into shop_purchases (user_id, item_id, cost_paid) values (uid, target_item_id, it.cost);
  return '샀어요.';
end;
$$;

-- ── 6. 달기 ────────────────────────────────────────────────────
create or replace function public.shop_equip(target_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  it record;
begin
  if uid is null then raise exception '로그인이 필요합니다.'; end if;

  -- null 을 주면 벗는다.
  if target_item_id is null then
    update profiles set equipped_title_id = null, equipped_badge_id = null where id = uid;
    return;
  end if;

  select * into it from shop_items where id = target_item_id;
  if not found then raise exception '없는 것입니다.'; end if;

  if not exists (select 1 from shop_purchases where user_id = uid and item_id = target_item_id) then
    raise exception '아직 가지고 있지 않아요.';
  end if;

  if it.kind = 'title' then
    update profiles set equipped_title_id = target_item_id where id = uid;
  else
    update profiles set equipped_badge_id = target_item_id where id = uid;
  end if;
end;
$$;

/** 벗기 — 칭호만, 배지만 따로 벗을 수 있어야 한다. */
create or replace function public.shop_unequip(target_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  if target_kind = 'title' then
    update profiles set equipped_title_id = null where id = auth.uid();
  elsif target_kind = 'badge' then
    update profiles set equipped_badge_id = null where id = auth.uid();
  end if;
end;
$$;

-- ── 7. 무엇을 파는가 ───────────────────────────────────────────
--
-- 값은 지금 실제 점수 분포에 맞췄다(2026-08-24 기준 1등 730점 · 5등 240점).
-- 첫 칭호는 며칠만 해도 닿게 싸게 두고, 위로 갈수록 눈에 띄게 벌린다 — 처음
-- 온 사람이 아무것도 못 사면 교환소를 두 번 열어 보지 않는다.
insert into shop_items (kind, label, emoji, description, cost, sort_order)
select * from (values
  ('title', '새싹',     '🌱', '첫걸음을 뗀 분께',                    50,  10),
  ('title', '말씀지기', '📖', '꾸준히 말씀을 지키는 분께',          120,  20),
  ('title', '새벽별',   '🌅', '이른 아침을 말씀으로 여는 분께',     200,  30),
  ('title', '통독러',   '🔥', '멈추지 않고 달리는 분께',            320,  40),
  ('title', '완주자',   '🏁', '한 바퀴를 끝까지 걸어온 분께',       500,  50),
  ('title', '말씀왕',   '👑', '가장 멀리까지 간 분께',              800,  60),
  ('badge', '별',       '⭐', '이름 뒤에 붙는 작은 표',              40,  110),
  ('badge', '올리브',   '🌿', '평안의 표',                           40,  120),
  ('badge', '비둘기',   '🕊️', '성령의 표',                          100,  130),
  ('badge', '보석',     '💎', '귀한 것을 찾은 표',                  180,  140),
  ('badge', '사자',     '🦁', '유다 지파의 사자',                   300,  150),
  ('badge', '면류관',   '👑', '끝까지 지킨 이의 표',                600,  160)
) as v(kind, label, emoji, description, cost, sort_order)
where not exists (select 1 from shop_items);

revoke all on function public.shop_balance() from public;
revoke all on function public.shop_buy(uuid) from public;
revoke all on function public.shop_equip(uuid) from public;
revoke all on function public.shop_unequip(text) from public;
grant execute on function public.shop_balance() to authenticated;
grant execute on function public.shop_buy(uuid) to authenticated;
grant execute on function public.shop_equip(uuid) to authenticated;
grant execute on function public.shop_unequip(text) to authenticated;

notify pgrst, 'reload schema';
