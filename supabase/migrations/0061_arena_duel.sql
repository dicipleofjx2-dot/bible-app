-- 둘이 같은 방에 들어가 겨루는 대결 (2026-08-26)
--
-- → docs/arena/README.md
--
-- ── 어떻게 겨루는가 ───────────────────────────────────────────
--
-- 한 사람이 대결을 만들면 여섯 자리 번호가 나온다. 상대가 그 번호를 넣고
-- 들어와 둘 다 준비를 누르면 **같은 방**이 동시에 열린다. 서로의 진행이
-- 화면 위에 보이고, 먼저 나온 사람이 이긴다.
--
-- ── 왜 Realtime 을 안 쓰는가 ──────────────────────────────────
--
-- 이 앱은 Supabase Realtime 을 쓴 적이 없다. 새로 들이는 것이 안 되면 대결이
-- 통째로 죽는다. 화면이 2초마다 상태를 물어보는 것으로 충분하다 — 상대가
-- 어디쯤인지는 2초 늦게 보여도 되고, **승부는 화면이 아니라 여기 저장된
-- 기록으로 가린다.** 나중에 Realtime 을 얹더라도 이 폴링이 그대로 안전망이 된다.
--
-- ── 왜 갱신을 전부 함수로 하는가 ──────────────────────────────
--
-- 표를 직접 UPDATE 하게 두면 상대 칸도 고칠 수 있다. 상금이 걸린 대결이라
-- 「내 칸만」이 정책 한 줄로 보장되어야 하는데 컬럼 단위 제한은 정책으로
-- 표현하기 어렵다. 그래서 쓰기는 전부 security definer 함수로 하고, 함수가
-- auth.uid() 를 보고 host 인지 guest 인지 스스로 고른다.
--
-- Supabase 대시보드 SQL Editor 에서 실행할 것.

create table if not exists public.arena_duels (
  id uuid primary key default gen_random_uuid(),
  -- 여섯 자리 숫자. 숫자로 한 이유는 휴대폰에서 넣기 쉬워서다.
  code text not null,
  room_id text not null,
  host_id uuid not null references auth.users(id) on delete cascade,
  guest_id uuid references auth.users(id) on delete cascade,
  -- waiting(상대 기다리는 중) | playing(둘 다 푸는 중) | done(끝)
  status text not null default 'waiting',
  host_ready boolean not null default false,
  guest_ready boolean not null default false,
  -- 0~3 은 몇 번째 자물쇠를 푸는 중, 4 는 나옴
  host_step smallint not null default 0,
  guest_step smallint not null default 0,
  host_escaped boolean,
  host_seconds_left integer,
  guest_escaped boolean,
  guest_seconds_left integer,
  started_at timestamptz,
  created_at timestamptz not null default now()
);

-- 아직 끝나지 않은 대결끼리만 번호가 겹치면 안 된다. 끝난 대결의 번호는
-- 다시 써도 된다 — 그래야 여섯 자리로 오래 버틴다.
create unique index if not exists arena_duels_open_code_idx
  on public.arena_duels (code) where status <> 'done';

create index if not exists arena_duels_host_idx on public.arena_duels (host_id, created_at desc);
create index if not exists arena_duels_guest_idx on public.arena_duels (guest_id, created_at desc);

alter table public.arena_duels enable row level security;

-- 읽기는 참가한 두 사람만. 쓰기 정책은 두지 않는다(아래 함수로만 바뀐다).
create policy "read own duels"
  on public.arena_duels for select
  using (auth.uid() = host_id or auth.uid() = guest_id);

-- ── 대결 만들기 ───────────────────────────────────────────────

create or replace function public.arena_duel_create(p_room_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_id uuid;
  v_try int := 0;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;

  loop
    v_try := v_try + 1;
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      insert into arena_duels (code, room_id, host_id)
      values (v_code, p_room_id, auth.uid())
      returning id into v_id;
      return v_id;
    exception when unique_violation then
      -- 열려 있는 대결과 번호가 겹쳤다. 다시 뽑는다.
      if v_try >= 20 then
        raise exception '대결 번호를 만들지 못했습니다. 잠시 후 다시 시도해 주세요';
      end if;
    end;
  end loop;
end;
$$;

-- ── 번호로 참가하기 ───────────────────────────────────────────

create or replace function public.arena_duel_join(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duel arena_duels;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;

  select * into v_duel from arena_duels
   where code = p_code and status = 'waiting'
   limit 1;

  if v_duel.id is null then
    raise exception '그 번호로 열린 대결이 없습니다';
  end if;
  if v_duel.host_id = auth.uid() then
    raise exception '자기가 만든 대결에는 상대로 들어갈 수 없습니다';
  end if;
  if v_duel.guest_id is not null then
    raise exception '이미 상대가 들어와 있습니다';
  end if;

  update arena_duels set guest_id = auth.uid() where id = v_duel.id;
  return v_duel.id;
end;
$$;

-- ── 준비 · 시작 ───────────────────────────────────────────────
--
-- 둘 다 준비를 누른 순간 started_at 이 찍히고 playing 이 된다. 화면은 이
-- 시각을 보고 함께 세어 내려간다 — 각자 제 시계로 시작하면 먼저 누른 쪽이
-- 손해를 본다.

create or replace function public.arena_duel_ready(p_duel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duel arena_duels;
begin
  select * into v_duel from arena_duels where id = p_duel_id;
  if v_duel.id is null then
    raise exception '없는 대결입니다';
  end if;

  if v_duel.host_id = auth.uid() then
    update arena_duels set host_ready = true where id = p_duel_id;
  elsif v_duel.guest_id = auth.uid() then
    update arena_duels set guest_ready = true where id = p_duel_id;
  else
    raise exception '이 대결의 참가자가 아닙니다';
  end if;

  update arena_duels
     set status = 'playing', started_at = now()
   where id = p_duel_id
     and host_ready and guest_ready
     and status = 'waiting';
end;
$$;

-- ── 진행 알리기 ───────────────────────────────────────────────

create or replace function public.arena_duel_step(p_duel_id uuid, p_step smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duel arena_duels;
begin
  select * into v_duel from arena_duels where id = p_duel_id;
  if v_duel.id is null then return; end if;

  -- 뒤로 가는 갱신은 무시한다(늦게 도착한 요청이 앞선 진행을 지우지 않게).
  if v_duel.host_id = auth.uid() then
    update arena_duels set host_step = greatest(host_step, p_step) where id = p_duel_id;
  elsif v_duel.guest_id = auth.uid() then
    update arena_duels set guest_step = greatest(guest_step, p_step) where id = p_duel_id;
  end if;
end;
$$;

-- ── 끝냈다고 알리기 ───────────────────────────────────────────

create or replace function public.arena_duel_finish(
  p_duel_id uuid, p_escaped boolean, p_seconds_left integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duel arena_duels;
begin
  select * into v_duel from arena_duels where id = p_duel_id;
  if v_duel.id is null then
    raise exception '없는 대결입니다';
  end if;

  if v_duel.host_id = auth.uid() then
    -- 한 번 적힌 결과는 덮지 않는다
    if v_duel.host_escaped is null then
      update arena_duels
         set host_escaped = p_escaped,
             host_seconds_left = case when p_escaped then greatest(p_seconds_left, 0) else 0 end,
             host_step = case when p_escaped then 4 else host_step end
       where id = p_duel_id;
    end if;
  elsif v_duel.guest_id = auth.uid() then
    if v_duel.guest_escaped is null then
      update arena_duels
         set guest_escaped = p_escaped,
             guest_seconds_left = case when p_escaped then greatest(p_seconds_left, 0) else 0 end,
             guest_step = case when p_escaped then 4 else guest_step end
       where id = p_duel_id;
    end if;
  else
    raise exception '이 대결의 참가자가 아닙니다';
  end if;

  update arena_duels set status = 'done'
   where id = p_duel_id and host_escaped is not null and guest_escaped is not null;
end;
$$;

-- ── 상태 물어보기 (2초마다) ───────────────────────────────────
--
-- 상대의 이름은 여기서 가려서 내려 준다. 순위표와 같은 규칙 —
-- 82명 중 65명의 닉네임이 이메일 주소 그대로다.

create or replace function public.arena_duel_state(p_duel_id uuid)
returns table (
  id uuid,
  room_id text,
  code text,
  status text,
  i_am_host boolean,
  started_at timestamptz,
  my_step smallint,
  opponent_step smallint,
  opponent_name text,
  opponent_joined boolean,
  i_am_ready boolean,
  opponent_ready boolean,
  my_escaped boolean,
  my_seconds_left integer,
  opponent_escaped boolean,
  opponent_seconds_left integer
)
language sql
security definer
set search_path = public
stable
as $$
  with d as (
    select * from arena_duels where arena_duels.id = p_duel_id
      and (host_id = auth.uid() or guest_id = auth.uid())
  ),
  named as (
    select
      d.*,
      (d.host_id = auth.uid()) as is_host,
      coalesce(
        (select p.username from profiles p
          where p.id = case when d.host_id = auth.uid() then d.guest_id else d.host_id end),
        '이름 없음'
      ) as raw_opponent
    from d
  )
  select
    named.id,
    named.room_id,
    named.code,
    named.status,
    named.is_host,
    named.started_at,
    (case when named.is_host then named.host_step else named.guest_step end)::smallint,
    (case when named.is_host then named.guest_step else named.host_step end)::smallint,
    case
      when (case when named.is_host then named.guest_id else named.host_id end) is null then null
      when position('@' in named.raw_opponent) > 0 then left(named.raw_opponent, 3) || '***'
      else named.raw_opponent
    end,
    (case when named.is_host then named.guest_id else named.host_id end) is not null,
    case when named.is_host then named.host_ready else named.guest_ready end,
    case when named.is_host then named.guest_ready else named.host_ready end,
    case when named.is_host then named.host_escaped else named.guest_escaped end,
    case when named.is_host then named.host_seconds_left else named.guest_seconds_left end,
    case when named.is_host then named.guest_escaped else named.host_escaped end,
    case when named.is_host then named.guest_seconds_left else named.host_seconds_left end
  from named;
$$;
