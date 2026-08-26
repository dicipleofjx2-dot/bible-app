-- 방탈출 점수를 「최고 기록」에서 「두 번까지, 평균」으로 (2026-08-26)
--
-- → docs/arena/README.md
--
-- ── 왜 바꾸는가 ────────────────────────────────────────────────
--
-- 최고 기록으로 재면 **시간이 남아도는 사람이 이긴다.** 스무 번 들어가서 한 번
-- 잘 나온 것이 한 번 만에 잘한 것을 이긴다. 그건 성경을 아는 것과 상관이 없고,
-- 상금이 걸린 대회에서는 더더욱 그렇다.
--
-- 두 번까지만 치고 그 평균으로 재면 한 번의 운이 절반으로 희석된다.
--
-- ── 실패한 판도 평균에 들어간다 ────────────────────────────────
--
-- 못 나온 판은 0점으로 저장된다(앱이 그렇게 넣는다). 그 0도 평균에 **들어가야**
-- 한다. 빼 주면 "1차를 망치면 그냥 끝까지 안 풀고 나가면 된다"가 되어 두 번
-- 치는 의미가 사라진다.
--
-- ── 세 번째부터는 아예 못 넣는다 ───────────────────────────────
--
-- 아래 함수들이 「처음 두 판」만 세므로 세 번째 기록이 들어와도 점수는 안
-- 바뀐다. 그래도 정책으로 막는다 — 화면만 막으면 개발자 도구로 우회할 수 있고,
-- 이건 상금이 걸린 대회다. 기록이 남는 것 자체를 막아야 화면도 헷갈리지 않는다.
--
-- Supabase 대시보드 SQL Editor 에서 실행할 것.

drop policy if exists "insert own escape record" on public.arena_escape_records;

create policy "insert own escape record"
  on public.arena_escape_records for insert
  with check (
    auth.uid() = user_id
    and (
      select count(*)
      from public.arena_escape_records prev
      -- prev 로 별칭을 준 이유: 별칭 없이 room_id 라고만 쓰면 새 행의 것인지
      -- 세고 있는 표의 것인지 모호해진다. 바깥은 테이블 이름으로 못 박는다.
      where prev.user_id = auth.uid()
        and prev.room_id = arena_escape_records.room_id
    ) < 2
  );

-- ── 방별 순위 — 두 판 평균 ─────────────────────────────────────

create or replace function public.arena_escape_ranking(p_room_id text, top_n integer default 5)
returns table (rank integer, display_name text, seconds_left integer, is_me boolean)
language sql
security definer
set search_path = public
stable
as $$
  with numbered as (
    select
      r.user_id,
      r.seconds_left,
      row_number() over (partition by r.user_id order by r.played_at) as attempt_no
    from arena_escape_records r
    where r.room_id = p_room_id
  ),
  averaged as (
    -- 처음 두 판만. 실패(0점)도 그대로 센다.
    select n.user_id, round(avg(n.seconds_left))::int as score
    from numbered n
    where n.attempt_no <= 2
    group by n.user_id
  ),
  ranked as (
    select
      row_number() over (order by a.score desc, a.user_id)::int as rank,
      a.user_id,
      a.score,
      coalesce(p.username, '이름 없음') as raw_name
    from averaged a
    left join profiles p on p.id = a.user_id
    where a.score > 0
  )
  select
    ranked.rank,
    case
      when position('@' in ranked.raw_name) > 0
        then left(ranked.raw_name, 3) || '***'
      else ranked.raw_name
    end as display_name,
    ranked.score as seconds_left,
    ranked.user_id = auth.uid() as is_me
  from ranked
  where ranked.rank <= greatest(top_n, 1)
  order by ranked.rank;
$$;

-- ── 종합 순위 — 방마다의 평균을 합친다 ─────────────────────────

create or replace function public.arena_escape_total_ranking(top_n integer default 10)
returns table (rank integer, display_name text, total integer, rooms_cleared integer, is_me boolean)
language sql
security definer
set search_path = public
stable
as $$
  with numbered as (
    select
      r.user_id, r.room_id, r.seconds_left, r.escaped,
      row_number() over (partition by r.user_id, r.room_id order by r.played_at) as attempt_no
    from arena_escape_records r
  ),
  per_room as (
    select
      n.user_id,
      n.room_id,
      round(avg(n.seconds_left))::int as score,
      -- 한 번이라도 나온 방은 「나온 방」으로 센다
      bool_or(n.escaped) as ever_escaped
    from numbered n
    where n.attempt_no <= 2
    group by n.user_id, n.room_id
  ),
  summed as (
    select
      pr.user_id,
      sum(pr.score)::int as total,
      count(*) filter (where pr.ever_escaped)::int as rooms_cleared
    from per_room pr
    group by pr.user_id
  ),
  ranked as (
    select
      row_number() over (order by s.total desc, s.user_id)::int as rank,
      s.user_id, s.total, s.rooms_cleared,
      coalesce(p.username, '이름 없음') as raw_name
    from summed s
    left join profiles p on p.id = s.user_id
    where s.total > 0
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
