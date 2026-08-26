-- 성경게임대전 토너먼트 — 예선·대진표·라운드 (2026-08-26)
--
-- → docs/arena/README.md
--
-- 예선(기록전)으로 상위 N명을 뽑고, 32강부터 결승까지 1:1 로 올라간다.
-- 경기는 **비동기**다 — 짝지어진 둘이 같은 방을 각자 편할 때 풀고 점수를
-- 견준다. 마감까지 안 친 사람은 부전패.
--
-- ⚠️ 이 파일에서 **점수 셈법을 새로 쓰지 않는다.** 0060 이 정한 「두 판 평균」을
-- 공통 함수로 빼내어 순위표와 예선이 **같은 것 하나**를 본다. 예선만 따로
-- 세면 "순위표 1등이 예선에서 3등"이 된다.
--
-- Supabase 대시보드 SQL Editor 에서 실행할 것.

-- ── 점수 셈법을 한 곳으로 ─────────────────────────────────────
--
-- 방마다 처음 두 판의 평균을 내고, 그것을 사람별로 합친다.
-- 기간을 주면 그 안에 친 판만 센다(예선용). 안 주면 전체(상시 순위표용).

create or replace function public.arena_escape_scores(
  p_from date default null, p_to date default null
)
returns table (user_id uuid, total integer, rooms_cleared integer)
language sql
security definer
set search_path = public
stable
as $$
  with in_range as (
    select r.*
    from arena_escape_records r
    where (p_from is null or (r.played_at at time zone 'Asia/Seoul')::date >= p_from)
      and (p_to is null or (r.played_at at time zone 'Asia/Seoul')::date <= p_to)
  ),
  numbered as (
    select
      i.user_id, i.room_id, i.seconds_left, i.escaped,
      row_number() over (partition by i.user_id, i.room_id order by i.played_at) as attempt_no
    from in_range i
  ),
  per_room as (
    select
      n.user_id, n.room_id,
      round(avg(n.seconds_left))::int as score,
      bool_or(n.escaped) as ever_escaped
    from numbered n
    where n.attempt_no <= 2          -- 두 판까지만. 0060 과 같은 규칙.
    group by n.user_id, n.room_id
  )
  select
    pr.user_id,
    sum(pr.score)::int as total,
    count(*) filter (where pr.ever_escaped)::int as rooms_cleared
  from per_room pr
  group by pr.user_id;
$$;

-- 상시 종합 순위표도 이제 위 함수를 쓴다(셈법이 한 곳이 되도록).
create or replace function public.arena_escape_total_ranking(top_n integer default 10)
returns table (rank integer, display_name text, total integer, rooms_cleared integer, is_me boolean)
language sql
security definer
set search_path = public
stable
as $$
  with ranked as (
    select
      row_number() over (order by s.total desc, s.user_id)::int as rank,
      s.user_id, s.total, s.rooms_cleared,
      coalesce(p.username, '이름 없음') as raw_name
    from arena_escape_scores() s
    left join profiles p on p.id = s.user_id
    where s.total > 0
  )
  select
    ranked.rank,
    case
      when position('@' in ranked.raw_name) > 0
        then left(ranked.raw_name, 3) || '***'
      else ranked.raw_name
    end,
    ranked.total,
    ranked.rooms_cleared,
    ranked.user_id = auth.uid()
  from ranked
  where ranked.rank <= greatest(top_n, 1)
  order by ranked.rank;
$$;

-- ── 대회 ──────────────────────────────────────────────────────

create table if not exists public.arena_tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- draft(준비) | qualifying(예선 진행 중) | bracket(본선) | done(끝)
  status text not null default 'draft',
  qualify_from date not null,
  qualify_to date not null,
  -- 본선 인원. 2의 거듭제곱만 쓴다(8·16·32).
  bracket_size smallint not null default 16,
  -- 지금 진행 중인 라운드. 「남은 인원」으로 적는다 — 32강이면 32, 결승은 2.
  current_round smallint,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 예선 통과자
create table if not exists public.arena_tournament_entrants (
  tournament_id uuid not null references public.arena_tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seed smallint not null,           -- 1 이 예선 1위
  qualify_score integer not null,
  primary key (tournament_id, user_id)
);

create table if not exists public.arena_tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.arena_tournaments(id) on delete cascade,
  round smallint not null,          -- 남은 인원 (32·16·8·4·2)
  slot smallint not null,           -- 그 라운드 안 순번 0..(round/2-1)
  room_id text not null,            -- 이 경기에서 풀 방
  player_a uuid references auth.users(id) on delete set null,
  player_b uuid references auth.users(id) on delete set null,
  score_a integer, score_b integer,
  escaped_a boolean, escaped_b boolean,
  hints_a smallint, hints_b smallint,
  played_a timestamptz, played_b timestamptz,
  winner uuid references auth.users(id) on delete set null,
  deadline timestamptz,
  unique (tournament_id, round, slot)
);

alter table public.arena_tournaments enable row level security;
alter table public.arena_tournament_entrants enable row level security;
alter table public.arena_tournament_matches enable row level security;

-- 대회·대진표는 누구나 본다. 대회는 구경하는 재미가 절반이다.
create policy "anyone reads tournaments" on public.arena_tournaments for select using (true);
create policy "anyone reads entrants" on public.arena_tournament_entrants for select using (true);
create policy "anyone reads matches" on public.arena_tournament_matches for select using (true);
-- 쓰기 정책은 두지 않는다. 아래 함수로만 바뀐다.

create index if not exists arena_tm_round_idx
  on public.arena_tournament_matches (tournament_id, round, slot);

-- ── 관리자인가 ────────────────────────────────────────────────

create or replace function public.arena_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select p.is_admin from profiles p where p.id = auth.uid()), false);
$$;

-- ── 대회 만들기 ───────────────────────────────────────────────

create or replace function public.arena_tournament_create(
  p_name text, p_from date, p_to date, p_size smallint
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

  insert into arena_tournaments (name, status, qualify_from, qualify_to, bracket_size, created_by)
  values (p_name, 'qualifying', p_from, p_to, p_size, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- ── 예선 마감 → 대진 짜기 ─────────────────────────────────────
--
-- 시드 배정은 흔히 쓰는 방식이다. [1] 에서 시작해 매번 뒤집어 붙인다:
--   [1] → [1,2] → [1,4,2,3] → [1,8,4,5,2,7,3,6] …
-- 둘씩 묶으면 1위는 꼴찌와, 2위는 그 다음과 붙고, 이겨서 올라가면 1위와 2위는
-- **결승에서야** 만난다. 그냥 1-2, 3-4 로 짝지으면 상위 둘이 16강에서 만난다.

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
begin
  if not arena_is_admin() then
    raise exception '관리자만 할 수 있습니다';
  end if;

  select * into v_t from arena_tournaments where id = p_tournament_id;
  if v_t.id is null then raise exception '없는 대회입니다'; end if;
  if v_t.status <> 'qualifying' then raise exception '예선 중인 대회가 아닙니다'; end if;

  -- 예선 점수 상위 N명. 같은 점수면 방을 많이 나온 사람이 위.
  insert into arena_tournament_entrants (tournament_id, user_id, seed, qualify_score)
  select
    p_tournament_id,
    s.user_id,
    row_number() over (order by s.total desc, s.rooms_cleared desc, s.user_id)::smallint,
    s.total
  from arena_escape_scores(v_t.qualify_from, v_t.qualify_to) s
  where s.total > 0
  order by s.total desc, s.rooms_cleared desc, s.user_id
  limit v_t.bracket_size;

  if (select count(*) from arena_tournament_entrants where tournament_id = p_tournament_id) < 2 then
    raise exception '예선을 통과한 사람이 두 명이 안 됩니다';
  end if;

  -- 시드 차례를 만든다
  v_seeds := array[1];
  while array_length(v_seeds, 1) < v_t.bracket_size loop
    v_m := array_length(v_seeds, 1) * 2 + 1;
    v_new := array[]::int[];
    foreach v_i in array v_seeds loop
      v_new := v_new || v_i || (v_m - v_i);
    end loop;
    v_seeds := v_new;
  end loop;

  -- 첫 라운드에 쓸 방. 라운드가 올라갈수록 어려운 방을 쓰도록 난이도 순으로
  -- 골라 둔다. 관리자가 나중에 바꿀 수 있다.
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
      -- 상대가 없으면(인원 부족) 부전승
      case when v_b is null and v_a is not null then v_a
           when v_a is null and v_b is not null then v_b
           else null end,
      now() + interval '3 days'
    );
    v_slot := v_slot + 1;
  end loop;

  update arena_tournaments
     set status = 'bracket', current_round = v_t.bracket_size
   where id = p_tournament_id;
end;
$$;

-- ── 내 경기 치기 ──────────────────────────────────────────────
--
-- 승패는 여기서 가린다. 화면이 아니라 서버가 정해야 다투지 않는다.
--   점수(남은 초) → 나왔는가 → 힌트 적게 쓴 쪽 → 먼저 친 쪽

create or replace function public.arena_tournament_play(
  p_match_id uuid, p_escaped boolean, p_seconds_left integer, p_hints smallint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m arena_tournament_matches;
  v_score int;
begin
  select * into v_m from arena_tournament_matches where id = p_match_id;
  if v_m.id is null then raise exception '없는 경기입니다'; end if;
  if v_m.winner is not null then raise exception '이미 끝난 경기입니다'; end if;
  if v_m.deadline is not null and now() > v_m.deadline then
    raise exception '이 경기의 마감이 지났습니다';
  end if;

  v_score := case when p_escaped then greatest(p_seconds_left, 0) else 0 end;

  if v_m.player_a = auth.uid() then
    if v_m.played_a is not null then raise exception '이미 치셨습니다'; end if;
    update arena_tournament_matches
       set score_a = v_score, escaped_a = p_escaped, hints_a = p_hints, played_a = now()
     where id = p_match_id;
  elsif v_m.player_b = auth.uid() then
    if v_m.played_b is not null then raise exception '이미 치셨습니다'; end if;
    update arena_tournament_matches
       set score_b = v_score, escaped_b = p_escaped, hints_b = p_hints, played_b = now()
     where id = p_match_id;
  else
    raise exception '이 경기의 선수가 아닙니다';
  end if;

  -- 둘 다 쳤으면 승자를 가린다
  select * into v_m from arena_tournament_matches where id = p_match_id;
  if v_m.played_a is not null and v_m.played_b is not null then
    update arena_tournament_matches
       set winner = case
         when v_m.score_a > v_m.score_b then v_m.player_a
         when v_m.score_b > v_m.score_a then v_m.player_b
         when coalesce(v_m.escaped_a, false) and not coalesce(v_m.escaped_b, false) then v_m.player_a
         when coalesce(v_m.escaped_b, false) and not coalesce(v_m.escaped_a, false) then v_m.player_b
         when coalesce(v_m.hints_a, 9) < coalesce(v_m.hints_b, 9) then v_m.player_a
         when coalesce(v_m.hints_b, 9) < coalesce(v_m.hints_a, 9) then v_m.player_b
         when v_m.played_a <= v_m.played_b then v_m.player_a
         else v_m.player_b
       end
     where id = p_match_id;
  end if;
end;
$$;

-- ── 라운드 마감 → 다음 라운드 ─────────────────────────────────

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

  v_next := v_t.current_round / 2;

  if v_next < 2 then
    -- 결승까지 끝났다
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

-- ── 대진표 보기 ───────────────────────────────────────────────
--
-- 이름은 가려서 내려 준다(순위표와 같은 규칙).

create or replace function public.arena_tournament_bracket(p_tournament_id uuid)
returns table (
  match_id uuid, round smallint, slot smallint, room_id text,
  name_a text, name_b text,
  score_a integer, score_b integer,
  played_a boolean, played_b boolean,
  winner_name text, i_am_a boolean, i_am_b boolean,
  deadline timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  with masked as (
    select
      m.*,
      case when position('@' in coalesce(pa.username,'이름 없음')) > 0
           then left(coalesce(pa.username,'이름 없음'), 3) || '***'
           else coalesce(pa.username, '이름 없음') end as ma,
      case when position('@' in coalesce(pb.username,'이름 없음')) > 0
           then left(coalesce(pb.username,'이름 없음'), 3) || '***'
           else coalesce(pb.username, '이름 없음') end as mb,
      case when position('@' in coalesce(pw.username,'이름 없음')) > 0
           then left(coalesce(pw.username,'이름 없음'), 3) || '***'
           else coalesce(pw.username, '이름 없음') end as mw
    from arena_tournament_matches m
    left join profiles pa on pa.id = m.player_a
    left join profiles pb on pb.id = m.player_b
    left join profiles pw on pw.id = m.winner
    where m.tournament_id = p_tournament_id
  )
  select
    masked.id, masked.round, masked.slot, masked.room_id,
    case when masked.player_a is null then null else masked.ma end,
    case when masked.player_b is null then null else masked.mb end,
    masked.score_a, masked.score_b,
    masked.played_a is not null, masked.played_b is not null,
    case when masked.winner is null then null else masked.mw end,
    masked.player_a = auth.uid(), masked.player_b = auth.uid(),
    masked.deadline
  from masked
  order by masked.round desc, masked.slot;
$$;
