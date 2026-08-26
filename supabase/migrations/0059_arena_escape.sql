-- 성경게임대전 1단계 — 성경 방탈출 기록 (2026-08-26)
--
-- → docs/arena/README.md
--
-- 방 자체(문제·자물쇠·정답)는 여기 없다. 코드(src/lib/arena/rooms.ts)에 있다.
-- 통독 해설과 반대로 간 이유는 문서에 적었다 — 방은 매일 늘지 않고, 자물쇠가
-- 얽힌 중첩 구조라 jsonb 에 넣으면 오타가 배포 뒤에야 드러나기 때문이다.
--
-- 여기 남기는 것은 **누가 어느 방을 몇 초 남기고 나왔는가** 뿐이다.
--
-- Supabase 대시보드 SQL Editor 에서 실행할 것.

create table if not exists public.arena_escape_records (
  id uuid primary key default gen_random_uuid(),
  -- 계정을 지울 때 막히지 않도록 cascade 를 반드시 건다. 규칙 없는 외래키가
  -- 하나만 있어도 auth 사용자 삭제가 조용히 실패한다(오류가 {} 로 온다).
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id text not null,
  -- 나왔는가. 시간을 다 써도 기록은 남긴다(탈출 실패, 점수 0).
  escaped boolean not null,
  -- 남은 시간(초). 이것이 곧 점수다 — 초 단위라 1:1 대결에서 동점이 거의 없다.
  seconds_left integer not null default 0,
  hints_used smallint not null default 0,
  wrong_count smallint not null default 0,
  played_at timestamptz not null default now()
);

alter table public.arena_escape_records enable row level security;

-- 자기 기록만 넣고 자기 기록만 본다. 순위표는 아래 함수(security definer)가
-- 이름을 가려서 내려 준다 — 표를 통째로 열어 주면 순위표가 교인 명부가 된다.
create policy "insert own escape record"
  on public.arena_escape_records for insert
  with check (auth.uid() = user_id);

create policy "read own escape records"
  on public.arena_escape_records for select
  using (auth.uid() = user_id);

create index if not exists arena_escape_records_user_room_idx
  on public.arena_escape_records (user_id, room_id, seconds_left desc);

create index if not exists arena_escape_records_room_idx
  on public.arena_escape_records (room_id, seconds_left desc);

-- ── 방별 최고 기록 다섯 ────────────────────────────────────────────
--
-- 통독 순위표와 같은 규칙이다(0046 참조):
--   · 위 다섯만 보인다. 꼴찌는 아무도 볼 수 없다.
--   · 닉네임에 @ 가 있으면(=이메일 그대로면) 앞 세 글자만 남긴다.
-- 탈출한 기록만 센다 — 실패는 순위에 올리지 않는다.

create or replace function public.arena_escape_ranking(p_room_id text, top_n integer default 5)
returns table (rank integer, display_name text, seconds_left integer, is_me boolean)
language sql
security definer
set search_path = public
stable
as $$
  with best as (
    select r.user_id, max(r.seconds_left) as seconds_left
    from arena_escape_records r
    where r.room_id = p_room_id and r.escaped
    group by r.user_id
  ),
  ranked as (
    select
      row_number() over (order by b.seconds_left desc, b.user_id)::int as rank,
      b.user_id,
      b.seconds_left::int as seconds_left,
      coalesce(p.username, '이름 없음') as raw_name
    from best b
    left join profiles p on p.id = b.user_id
  )
  select
    ranked.rank,
    case
      when position('@' in ranked.raw_name) > 0
        then left(ranked.raw_name, 3) || '***'
      else ranked.raw_name
    end as display_name,
    ranked.seconds_left,
    ranked.user_id = auth.uid() as is_me
  from ranked
  where ranked.rank <= greatest(top_n, 1)
  order by ranked.rank;
$$;

-- ── 방탈출 종합 순위 ───────────────────────────────────────────────
--
-- 방마다의 최고 기록을 **합쳐서** 센다. 한 방만 잘하는 사람보다 여러 방을
-- 두루 나온 사람이 위로 간다 — 대회 예선을 이 점수로 가리기 때문이다.

create or replace function public.arena_escape_total_ranking(top_n integer default 10)
returns table (rank integer, display_name text, total integer, rooms_cleared integer, is_me boolean)
language sql
security definer
set search_path = public
stable
as $$
  with best as (
    select r.user_id, r.room_id, max(r.seconds_left) as seconds_left
    from arena_escape_records r
    where r.escaped
    group by r.user_id, r.room_id
  ),
  summed as (
    select b.user_id, sum(b.seconds_left)::int as total, count(*)::int as rooms_cleared
    from best b
    group by b.user_id
  ),
  ranked as (
    select
      row_number() over (order by s.total desc, s.user_id)::int as rank,
      s.user_id, s.total, s.rooms_cleared,
      coalesce(p.username, '이름 없음') as raw_name
    from summed s
    left join profiles p on p.id = s.user_id
  )
  select
    ranked.rank,
    case
      when position('@' in ranked.raw_name) > 0
        then left(ranked.raw_name, 3) || '***'
      else ranked.raw_name
    end as display_name,
    ranked.total,
    ranked.rooms_cleared,
    ranked.user_id = auth.uid() as is_me
  from ranked
  where ranked.rank <= greatest(top_n, 1)
  order by ranked.rank;
$$;
