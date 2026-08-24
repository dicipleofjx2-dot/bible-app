-- 두 가지를 고친다.
--   1. 사면 바로 달리게 한다
--   2. 내 칭호·배지를 내 화면에서도 볼 수 있게 한다

-- ── 1. 사면 바로 단다 ─────────────────────────────────────────
--
-- 사고 나서 「달기」를 또 눌러야 했다. 그래서 사 놓고도 아무 데도 안 나와
-- "어디가 달라진 거지?"가 됐다 — 실제로 그랬다.
--
-- **그 종류를 아직 아무것도 안 달고 있을 때만** 자동으로 단다. 이미 달고 있는
-- 것이 있으면 건드리지 않는다. 새것을 하나 샀다고 지금 달고 있던 것이 말없이
-- 바뀌면 그건 더 나쁘다.
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

  if exists (select 1 from shop_purchases where user_id = uid and item_id = target_item_id) then
    return '이미 가지고 있어요.';
  end if;

  select balance into bal from shop_balance();
  if bal < it.cost then
    raise exception '점수가 모자라요. % 점이 필요한데 % 점 남았어요.', it.cost, bal;
  end if;

  insert into shop_purchases (user_id, item_id, cost_paid) values (uid, target_item_id, it.cost);

  if it.kind = 'title' then
    update profiles set equipped_title_id = target_item_id
     where id = uid and equipped_title_id is null;
  else
    update profiles set equipped_badge_id = target_item_id
     where id = uid and equipped_badge_id is null;
  end if;

  return '샀어요.';
end;
$$;

revoke all on function public.shop_buy(uuid) from public;
grant execute on function public.shop_buy(uuid) to authenticated;

-- 이미 사 두고 못 달고 계신 분들을 한 번 달아 드린다. 지금은 한 분뿐이지만,
-- 그분에게는 산 것이 여태 아무 데도 안 보였다.
update profiles p
   set equipped_title_id = (
     select sp.item_id from shop_purchases sp
       join shop_items si on si.id = sp.item_id
      where sp.user_id = p.id and si.kind = 'title'
      order by si.cost desc, sp.created_at
      limit 1
   )
 where p.equipped_title_id is null
   and exists (
     select 1 from shop_purchases sp join shop_items si on si.id = sp.item_id
      where sp.user_id = p.id and si.kind = 'title'
   );

update profiles p
   set equipped_badge_id = (
     select sp.item_id from shop_purchases sp
       join shop_items si on si.id = sp.item_id
      where sp.user_id = p.id and si.kind = 'badge'
      order by si.cost desc, sp.created_at
      limit 1
   )
 where p.equipped_badge_id is null
   and exists (
     select 1 from shop_purchases sp join shop_items si on si.id = sp.item_id
      where sp.user_id = p.id and si.kind = 'badge'
   );

-- ── 2. 내 칭호·배지 ───────────────────────────────────────────
--
-- 지금까지 산 칭호는 **순위표 다섯 등 안에 들 때만** 보였다. 다섯 등 밖인
-- 사람은 사고도 영영 못 본다. 자기 화면에서는 언제나 보여야 한다.
create or replace function public.my_shop_look()
returns table (display_name text, title_label text, title_emoji text, badge_emoji text)
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce(p.username, '이름 없음'),
    coalesce(t.label, ''),
    coalesce(t.emoji, ''),
    coalesce(b.emoji, '')
  from profiles p
  left join shop_items t on t.id = p.equipped_title_id
  left join shop_items b on b.id = p.equipped_badge_id
  where p.id = auth.uid();
$$;

comment on function public.my_shop_look() is
  '내 이름과 지금 달고 있는 칭호·배지. 내 화면에 보여 주기 위한 것이라 가리지 않는다 — 남에게 나가지 않는다.';

revoke all on function public.my_shop_look() from public;
grant execute on function public.my_shop_look() to authenticated;

notify pgrst, 'reload schema';
