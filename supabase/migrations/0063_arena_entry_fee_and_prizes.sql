-- 대회 참가비와 상금 포인트 (2026-08-26)
--
-- → docs/arena/README.md
--
-- ── 정한 것 ───────────────────────────────────────────────────
--
-- · 본선 참가비 **20포인트**. 하루에 벌 수 있는 것(50점)의 절반 이하이고,
--   가장 싼 배지(40점)보다 싸다. 부담 없이 「걸린 것」만 만든다.
-- · 예선은 **공짜**. 참가비는 본선에 오를 때 자동으로 빠진다 — 포인트가 없는
--   새 교인도 예선에는 다 들어온다.
-- · 상금 재원은 **참가비 + 교회 출연 포인트**. 참가비만으로는 상금이 너무 작다
--   (20×16 = 320점, 말씀왕 칭호 하나가 800점이다).
-- · 참가비를 못 내면 **자리가 다음 순위 사람에게** 넘어간다.
--
-- ── 상금 나누는 법 ────────────────────────────────────────────
--
-- 라운드마다 **똑같은 총액**(풀 ÷ 라운드 수)을 그 라운드 승자들이 나눈다.
-- 올라갈수록 사람이 절반씩 줄므로 1인당 상금은 자동으로 두 배씩 커진다.
--
--   16명·풀 1,020점이면 → 1라운드 승 31 · 2라운드 63 · 준결승 127 · 우승 255
--   우승자가 받는 합계 476점 (참가비 20을 빼면 순이익 456점)
--
-- 비율을 따로 정하지 않아도 「이길수록 커진다」가 저절로 된다.
--
-- ── 통독 순위표는 건드리지 않는다 ─────────────────────────────
--
-- 대회 상금은 **교환소에서 쓸 수 있는 잔액**에만 들어가고 통독 순위표에는
-- 반영하지 않는다. 통독 순위는 「통독을 얼마나 성실히 했나」이지 「게임을
-- 잘하나」가 아니다. 섞으면 순위표가 무슨 뜻인지 알 수 없게 된다.
--
-- Supabase 대시보드 SQL Editor 에서 실행할 것.

alter table public.arena_tournaments
  add column if not exists entry_fee integer not null default 20,
  add column if not exists sponsor_points integer not null default 0,
  -- 본선이 시작될 때 확정된다(참가비 합 + 출연). 그 뒤로는 안 바뀐다 —
  -- 상금이 도중에 바뀌면 무엇을 보고 겨루는지 알 수 없다.
  add column if not exists prize_pool integer not null default 0;

-- ── 포인트 원장 ───────────────────────────────────────────────
--
-- 대회로 오간 포인트만 여기 적는다. 통독 점수는 그날그날의 기록에서 계산하고
-- 교환소 지출은 shop_purchases 에 있다 — 이 셋을 합친 것이 잔액이다.

create table if not exists public.arena_point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 음수면 나간 것(참가비), 양수면 들어온 것(상금)
  amount integer not null,
  reason text not null,               -- 'entry_fee' | 'prize'
  tournament_id uuid references public.arena_tournaments(id) on delete cascade,
  round smallint,
  created_at timestamptz not null default now()
);

-- 같은 대회·같은 라운드에 두 번 주거나 두 번 걷지 않는다.
create unique index if not exists arena_point_ledger_once_idx
  on public.arena_point_ledger (user_id, tournament_id, reason, coalesce(round, 0));

create index if not exists arena_point_ledger_user_idx
  on public.arena_point_ledger (user_id, created_at desc);

alter table public.arena_point_ledger enable row level security;

create policy "read own ledger" on public.arena_point_ledger
  for select using (auth.uid() = user_id);
-- 쓰기 정책은 없다. 아래 함수로만 오간다.

-- ── 잔액 셈을 한 곳으로 ───────────────────────────────────────
--
-- 0055 의 shop_balance() 안에 있던 셈을 사람 지정이 되는 함수로 빼낸다.
-- 진출자를 뽑을 때 **남의 잔액**을 봐야 하는데, auth.uid() 로 굳어 있으면
-- 같은 셈을 한 벌 더 쓰게 된다 — 그러면 반드시 어긋난다.

create or replace function public.points_balance_of(p_user uuid)
returns table (earned integer, spent integer, balance integer)
language sql
security definer
set search_path = public
stable
as $$
  with e as (
    select coalesce(sum(
      case when r.quiz_score >= 100 then 30
           when r.quiz_score >= 90 then 20
           when r.quiz_score >= 80 then 10
           else 0 end
      + case when r.memorization_success then 10 else 0 end
      + case when r.speed_quiz_success then 10 else 0 end
    )::int, 0) as earned
    from reading_helper_day_records r
    where r.user_id = p_user
      and r.date >= reading_helper_points_since()
  ),
  p as (
    select coalesce((select penalty from reading_helper_penalties() where user_id = p_user), 0) as penalty
  ),
  s as (
    select coalesce(sum(cost_paid)::int, 0) as spent
    from shop_purchases where user_id = p_user
  ),
  l as (
    select
      coalesce(sum(case when amount > 0 then amount else 0 end)::int, 0) as prizes,
      coalesce(sum(case when amount < 0 then -amount else 0 end)::int, 0) as fees
    from arena_point_ledger where user_id = p_user
  )
  select
    -- 「모은 점수」에 대회 상금을 더해 보여 준다. 화면에 안 보이는 돈이 잔액에만
    -- 있으면 성도가 계산을 못 따라간다.
    greatest(e.earned - p.penalty, 0) + l.prizes,
    s.spent + l.fees,
    greatest(greatest(e.earned - p.penalty, 0) + l.prizes - s.spent - l.fees, 0)
  from e, p, s, l;
$$;

-- 교환소가 쓰던 함수는 이제 위 함수를 부르기만 한다(셈이 한 곳이 되도록).
create or replace function public.shop_balance()
returns table (earned integer, spent integer, balance integer)
language sql
security definer
set search_path = public
stable
as $$
  select * from points_balance_of(auth.uid());
$$;

-- ── 상금표 ────────────────────────────────────────────────────
--
-- 라운드마다 풀÷라운드수 를 그 라운드 승자들이 나눈다.
-- 본선이 시작되기 전에는 예상 풀(참가비×정원 + 출연)로 미리 보여 준다 —
-- **「1등 하면 얼마」를 알아야 나가고 싶어진다.**

create or replace function public.arena_tournament_prizes(p_tournament_id uuid)
returns table (round smallint, winners integer, per_winner integer, is_final boolean)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_t arena_tournaments;
  v_pool int;
  v_rounds int;
  v_r int;
  v_round int;
  v_winners int;
begin
  select * into v_t from arena_tournaments where id = p_tournament_id;
  if v_t.id is null then return; end if;

  -- 아직 안 걷었으면 정원이 다 찬다고 보고 미리 셈한다
  v_pool := case when v_t.prize_pool > 0
                 then v_t.prize_pool
                 else v_t.entry_fee * v_t.bracket_size + v_t.sponsor_points end;

  v_rounds := 0;
  v_winners := v_t.bracket_size;
  while v_winners > 1 loop
    v_rounds := v_rounds + 1;
    v_winners := v_winners / 2;
  end loop;
  if v_rounds = 0 then return; end if;

  v_round := v_t.bracket_size;
  for v_r in 1..v_rounds loop
    v_winners := v_round / 2;
    round := v_round::smallint;
    winners := v_winners;
    per_winner := (v_pool / v_rounds) / v_winners;
    is_final := (v_round = 2);
    return next;
    v_round := v_round / 2;
  end loop;
end;
$$;

-- ── 대회 만들기 (참가비·출연 포인트를 받는다) ─────────────────

create or replace function public.arena_tournament_create(
  p_name text, p_from date, p_to date, p_size smallint,
  p_entry_fee integer default 20, p_sponsor integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not arena_is_admin() then
    raise exception '관리자만 대회를 열 수 있습니다';
  end if;
  if p_size not in (4, 8, 16, 32) then
    raise exception '본선 인원은 4·8·16·32 중 하나여야 합니다';
  end if;
  if p_to < p_from then
    raise exception '예선 끝나는 날이 시작하는 날보다 앞설 수 없습니다';
  end if;
  if p_entry_fee < 0 or p_sponsor < 0 then
    raise exception '참가비와 출연 포인트는 0 이상이어야 합니다';
  end if;

  insert into arena_tournaments
    (name, status, qualify_from, qualify_to, bracket_size, entry_fee, sponsor_points, created_by)
  values (p_name, 'qualifying', p_from, p_to, p_size, p_entry_fee, p_sponsor, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- ── 예선 마감 → 참가비를 걷고 대진을 짠다 ─────────────────────
--
-- 참가비를 못 내는 사람은 건너뛰고 **다음 순위 사람이 올라온다.**

create or replace function public.arena_tournament_start_bracket(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t arena_tournaments;
  v_seeds int[];
  v_new int[];
  v_m int;
  v_i int;
  v_slot int;
  v_a uuid; v_b uuid;
  v_room text;
  v_rooms text[];
  v_cand record;
  v_taken int := 0;
  v_bal int;
begin
  if not arena_is_admin() then
    raise exception '관리자만 할 수 있습니다';
  end if;

  select * into v_t from arena_tournaments where id = p_tournament_id;
  if v_t.id is null then raise exception '없는 대회입니다'; end if;
  if v_t.status <> 'qualifying' then raise exception '예선 중인 대회가 아닙니다'; end if;

  -- 예선 점수 순으로 훑으며 참가비를 낼 수 있는 사람만 정원까지 채운다.
  for v_cand in
    select s.user_id, s.total, s.rooms_cleared
    from arena_escape_scores(v_t.qualify_from, v_t.qualify_to) s
    where s.total > 0
    order by s.total desc, s.rooms_cleared desc, s.user_id
  loop
    exit when v_taken >= v_t.bracket_size;

    select balance into v_bal from points_balance_of(v_cand.user_id);
    if coalesce(v_bal, 0) < v_t.entry_fee then
      continue;   -- 참가비가 모자란다 → 자리는 다음 사람에게
    end if;

    v_taken := v_taken + 1;
    insert into arena_tournament_entrants (tournament_id, user_id, seed, qualify_score)
    values (p_tournament_id, v_cand.user_id, v_taken::smallint, v_cand.total);

    if v_t.entry_fee > 0 then
      insert into arena_point_ledger (user_id, amount, reason, tournament_id)
      values (v_cand.user_id, -v_t.entry_fee, 'entry_fee', p_tournament_id)
      on conflict do nothing;
    end if;
  end loop;

  if v_taken < 2 then
    raise exception '참가비를 낼 수 있는 통과자가 두 명이 안 됩니다';
  end if;

  -- 시드 차례. [1] 에서 시작해 매번 뒤집어 붙인다 — 1위와 2위는 결승에서야 만난다.
  v_seeds := array[1];
  while array_length(v_seeds, 1) < v_t.bracket_size loop
    v_m := array_length(v_seeds, 1) * 2 + 1;
    v_new := array[]::int[];
    foreach v_i in array v_seeds loop
      v_new := v_new || v_i || (v_m - v_i);
    end loop;
    v_seeds := v_new;
  end loop;

  v_rooms := array['ark', 'jonah', 'goliath', 'storm', 'jericho', 'lions', 'joseph', 'furnace',
                   'temptation', 'redsea', 'philippi', 'carmel', 'tomb', 'peter'];

  v_slot := 0;
  while v_slot < v_t.bracket_size / 2 loop
    select user_id into v_a from arena_tournament_entrants
      where tournament_id = p_tournament_id and seed = v_seeds[v_slot * 2 + 1];
    select user_id into v_b from arena_tournament_entrants
      where tournament_id = p_tournament_id and seed = v_seeds[v_slot * 2 + 2];

    v_room := v_rooms[(v_slot % array_length(v_rooms, 1)) + 1];

    insert into arena_tournament_matches
      (tournament_id, round, slot, room_id, player_a, player_b, winner, deadline)
    values (
      p_tournament_id, v_t.bracket_size, v_slot, v_room, v_a, v_b,
      case when v_b is null and v_a is not null then v_a
           when v_a is null and v_b is not null then v_b
           else null end,
      now() + interval '3 days'
    );
    v_slot := v_slot + 1;
  end loop;

  -- 상금 풀을 확정한다. 실제로 걷은 참가비 + 교회 출연.
  update arena_tournaments
     set status = 'bracket',
         current_round = v_t.bracket_size,
         prize_pool = v_taken * v_t.entry_fee + v_t.sponsor_points
   where id = p_tournament_id;
end;
$$;

-- ── 라운드 마감 → 상금을 주고 다음 라운드를 짠다 ──────────────

create or replace function public.arena_tournament_close_round(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t arena_tournaments;
  v_next int;
  v_slot int;
  v_a uuid; v_b uuid;
  v_rooms text[];
  v_prize int;
begin
  if not arena_is_admin() then
    raise exception '관리자만 할 수 있습니다';
  end if;

  select * into v_t from arena_tournaments where id = p_tournament_id;
  if v_t.id is null or v_t.status <> 'bracket' then
    raise exception '본선 중인 대회가 아닙니다';
  end if;

  -- 아직 승자가 안 정해진 경기를 정리한다.
  --   한 사람만 쳤으면 그 사람 승(상대는 부전패)
  --   둘 다 안 쳤으면 시드가 앞선(예선 성적이 좋은) 사람 승
  update arena_tournament_matches m
     set winner = case
       when m.played_a is not null and m.played_b is null then m.player_a
       when m.played_b is not null and m.played_a is null then m.player_b
       else (
         select e.user_id from arena_tournament_entrants e
          where e.tournament_id = p_tournament_id
            and e.user_id in (m.player_a, m.player_b)
          order by e.seed
          limit 1
       )
     end
   where m.tournament_id = p_tournament_id
     and m.round = v_t.current_round
     and m.winner is null
     and (m.player_a is not null or m.player_b is not null);

  -- 이 라운드 승자들에게 상금. 같은 라운드에 두 번 주지 않는다(원장의 unique).
  select per_winner into v_prize
    from arena_tournament_prizes(p_tournament_id)
   where round = v_t.current_round;

  if coalesce(v_prize, 0) > 0 then
    insert into arena_point_ledger (user_id, amount, reason, tournament_id, round)
    select m.winner, v_prize, 'prize', p_tournament_id, v_t.current_round
      from arena_tournament_matches m
     where m.tournament_id = p_tournament_id
       and m.round = v_t.current_round
       and m.winner is not null
    on conflict do nothing;
  end if;

  v_next := v_t.current_round / 2;

  if v_next < 2 then
    update arena_tournaments set status = 'done', current_round = null where id = p_tournament_id;
    return;
  end if;

  v_rooms := array['redsea', 'philippi', 'carmel', 'tomb', 'peter', 'temptation', 'furnace'];

  v_slot := 0;
  while v_slot < v_next / 2 loop
    select winner into v_a from arena_tournament_matches
      where tournament_id = p_tournament_id and round = v_t.current_round and slot = v_slot * 2;
    select winner into v_b from arena_tournament_matches
      where tournament_id = p_tournament_id and round = v_t.current_round and slot = v_slot * 2 + 1;

    insert into arena_tournament_matches
      (tournament_id, round, slot, room_id, player_a, player_b, winner, deadline)
    values (
      p_tournament_id, v_next, v_slot,
      v_rooms[(v_slot % array_length(v_rooms, 1)) + 1],
      v_a, v_b,
      case when v_b is null and v_a is not null then v_a
           when v_a is null and v_b is not null then v_b
           else null end,
      now() + interval '3 days'
    )
    on conflict (tournament_id, round, slot) do nothing;
    v_slot := v_slot + 1;
  end loop;

  update arena_tournaments set current_round = v_next where id = p_tournament_id;
end;
$$;

-- ── 내 대회 포인트 내역 ───────────────────────────────────────

create or replace function public.arena_my_point_history()
returns table (amount integer, reason text, tournament_name text, round smallint, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select l.amount, l.reason, t.name, l.round, l.created_at
  from arena_point_ledger l
  left join arena_tournaments t on t.id = l.tournament_id
  where l.user_id = auth.uid()
  order by l.created_at desc
  limit 50;
$$;
