-- 여호수아의 전쟁 — 둘이 하는 아케이드 (2026-10-18)
--
-- → docs/arcade/README.md
--
-- 한 사람이 방을 만들면 여섯 자리 초대 번호가 나온다. 상대가 번호를 넣고 들어와
-- 둘 다 준비를 누르면 **같은 전쟁 넷**이 동시에 열린다. 문제는 번호에서 만든
-- 씨앗으로 정하므로 둘이 똑같은 판을 본다. 겨루기이자 힘을 합치는 것이다 —
-- 둘의 점수를 더한 「연합 점수」가 문턱을 넘으면 함께 이긴다.
--
-- 구조는 0061(arena_duels)을 그대로 따른다. Realtime 대신 화면이 2초마다
-- 묻고, 쓰기는 전부 security definer 함수로 한다(표를 직접 고치게 두면 상대 칸도
-- 고칠 수 있다). 포인트는 주지 않는다 — 판정을 서버에서 재현할 수 없어서다.
--
-- Supabase 대시보드 SQL Editor 에서 실행할 것.

create table if not exists public.joshua_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  host_id uuid not null references auth.users(id) on delete cascade,
  guest_id uuid references auth.users(id) on delete cascade,
  -- waiting(상대 기다리는 중) | playing(싸우는 중) | done(끝)
  status text not null default 'waiting',
  host_ready boolean not null default false,
  guest_ready boolean not null default false,
  -- 몇 번째 전쟁까지 마쳤나(0~4)
  host_stage smallint not null default 0,
  guest_stage smallint not null default 0,
  host_score integer not null default 0,
  guest_score integer not null default 0,
  host_done boolean not null default false,
  guest_done boolean not null default false,
  started_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists joshua_rooms_open_code_idx
  on public.joshua_rooms (code) where status <> 'done';
create index if not exists joshua_rooms_host_idx on public.joshua_rooms (host_id, created_at desc);
create index if not exists joshua_rooms_guest_idx on public.joshua_rooms (guest_id, created_at desc);

alter table public.joshua_rooms enable row level security;

create policy "read own joshua rooms"
  on public.joshua_rooms for select
  using (auth.uid() = host_id or auth.uid() = guest_id);

create or replace function public.joshua_create()
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
      insert into joshua_rooms (code, host_id) values (v_code, auth.uid())
      returning id into v_id;
      return v_id;
    exception when unique_violation then
      if v_try >= 20 then
        raise exception '초대 번호를 만들지 못했습니다. 잠시 후 다시 시도해 주세요';
      end if;
    end;
  end loop;
end;
$$;

create or replace function public.joshua_join(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room joshua_rooms;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;
  select * into v_room from joshua_rooms
   where code = p_code and status = 'waiting' limit 1;
  if v_room.id is null then
    raise exception '그 번호로 열린 방이 없습니다';
  end if;
  if v_room.host_id = auth.uid() then
    raise exception '자기가 만든 방에는 상대로 들어갈 수 없습니다';
  end if;
  if v_room.guest_id is not null then
    raise exception '이미 상대가 들어와 있습니다';
  end if;
  update joshua_rooms set guest_id = auth.uid() where id = v_room.id;
  return v_room.id;
end;
$$;

create or replace function public.joshua_ready(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room joshua_rooms;
begin
  select * into v_room from joshua_rooms where id = p_room_id;
  if v_room.id is null then
    raise exception '없는 방입니다';
  end if;
  if v_room.host_id = auth.uid() then
    update joshua_rooms set host_ready = true where id = p_room_id;
  elsif v_room.guest_id = auth.uid() then
    update joshua_rooms set guest_ready = true where id = p_room_id;
  else
    raise exception '이 방의 참가자가 아닙니다';
  end if;
  update joshua_rooms set status = 'playing', started_at = now()
   where id = p_room_id and host_ready and guest_ready and status = 'waiting';
end;
$$;

-- 한 전쟁을 마칠 때마다 알린다. 뒤로 가는 갱신은 무시한다.
create or replace function public.joshua_progress(p_room_id uuid, p_stage smallint, p_score integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score integer := least(greatest(p_score, 0), 400);
  v_stage smallint := least(greatest(p_stage, 0), 4);
begin
  update joshua_rooms
     set host_stage = greatest(host_stage, v_stage),
         host_score = case when v_stage >= host_stage then v_score else host_score end
   where id = p_room_id and host_id = auth.uid() and not host_done;
  update joshua_rooms
     set guest_stage = greatest(guest_stage, v_stage),
         guest_score = case when v_stage >= guest_stage then v_score else guest_score end
   where id = p_room_id and guest_id = auth.uid() and not guest_done;
end;
$$;

create or replace function public.joshua_finish(p_room_id uuid, p_score integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room joshua_rooms;
  v_score integer := least(greatest(p_score, 0), 400);
begin
  select * into v_room from joshua_rooms where id = p_room_id;
  if v_room.id is null then
    raise exception '없는 방입니다';
  end if;
  if v_room.host_id = auth.uid() then
    if not v_room.host_done then
      update joshua_rooms set host_done = true, host_score = v_score, host_stage = 4
       where id = p_room_id;
    end if;
  elsif v_room.guest_id = auth.uid() then
    if not v_room.guest_done then
      update joshua_rooms set guest_done = true, guest_score = v_score, guest_stage = 4
       where id = p_room_id;
    end if;
  else
    raise exception '이 방의 참가자가 아닙니다';
  end if;
  update joshua_rooms set status = 'done'
   where id = p_room_id and host_done and guest_done;
end;
$$;

-- 상대 이름은 가려서 내려 준다(이메일 그대로인 닉네임이 많다 — 0061 과 같은 규칙).
create or replace function public.joshua_state(p_room_id uuid)
returns table (
  id uuid,
  code text,
  status text,
  i_am_host boolean,
  started_at timestamptz,
  my_stage smallint,
  opponent_stage smallint,
  my_score integer,
  opponent_score integer,
  opponent_name text,
  opponent_joined boolean,
  i_am_ready boolean,
  opponent_ready boolean,
  my_done boolean,
  opponent_done boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with d as (
    select * from joshua_rooms r where r.id = p_room_id
      and (r.host_id = auth.uid() or r.guest_id = auth.uid())
  ),
  named as (
    select d.*, (d.host_id = auth.uid()) as is_host,
      coalesce(
        (select p.username from profiles p
          where p.id = case when d.host_id = auth.uid() then d.guest_id else d.host_id end),
        '이름 없음') as raw_opponent
    from d
  )
  select
    named.id, named.code, named.status, named.is_host, named.started_at,
    (case when named.is_host then named.host_stage else named.guest_stage end)::smallint,
    (case when named.is_host then named.guest_stage else named.host_stage end)::smallint,
    case when named.is_host then named.host_score else named.guest_score end,
    case when named.is_host then named.guest_score else named.host_score end,
    case
      when (case when named.is_host then named.guest_id else named.host_id end) is null then null
      when position('@' in named.raw_opponent) > 0 then left(named.raw_opponent, 3) || '***'
      else named.raw_opponent
    end,
    (case when named.is_host then named.guest_id else named.host_id end) is not null,
    case when named.is_host then named.host_ready else named.guest_ready end,
    case when named.is_host then named.guest_ready else named.host_ready end,
    case when named.is_host then named.host_done else named.guest_done end,
    case when named.is_host then named.guest_done else named.host_done end
  from named;
$$;
