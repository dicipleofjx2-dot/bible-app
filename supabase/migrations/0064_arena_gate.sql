-- 방탈출 문 여닫기 (2026-08-26)
--
-- → docs/arena/README.md
--
-- ── 왜 필요한가 ───────────────────────────────────────────────
--
-- 대회를 시작하기도 전에 사람들이 들어와 문제를 다 풀어 버렸다. 포인트에는
-- 반영되지 않았지만 **문제가 노출되었다.** 미리 본 사람이 유리해지면 대회가
-- 대회가 아니다.
--
-- 그래서 문을 잠근다. 대회 예선이 시작되면 저절로 열리고, 관리자가 손으로도
-- 열고 닫을 수 있다.
--
-- ── 관리자는 언제나 들어갈 수 있다 ────────────────────────────
--
-- 잠긴 문을 관리자까지 막으면 대회 전에 아무도 확인을 못 한다. 방이 제대로
-- 도는지 봐야 열 수 있으므로 관리자는 예외로 둔다.
--
-- Supabase 대시보드 SQL Editor 에서 실행할 것.

create table if not exists public.arena_settings (
  -- 한 줄만 있는 표. check 로 못을 박아 두 줄이 될 수 없게 한다.
  id boolean primary key default true,
  rooms_open boolean not null default false,
  -- 닫혀 있을 때 화면에 띄울 말. 비우면 기본 문구가 나온다.
  closed_message text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint arena_settings_single_row check (id)
);

insert into public.arena_settings (id, rooms_open)
values (true, false)
on conflict (id) do nothing;

alter table public.arena_settings enable row level security;

-- 닫혔는지 열렸는지는 누구나 알아야 화면이 안내를 띄운다.
create policy "anyone reads arena settings"
  on public.arena_settings for select using (true);
-- 쓰기는 아래 함수로만.

-- ── 지금 들어갈 수 있는가 ─────────────────────────────────────
--
-- 셋 중 하나면 열린다:
--   1. 관리자다 (대회 전에 확인해야 하므로)
--   2. 관리자가 손으로 열어 두었다
--   3. 예선이 진행 중인 대회가 있고 오늘이 그 기간 안이다

create or replace function public.arena_rooms_open()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    arena_is_admin()
    or coalesce((select rooms_open from arena_settings where id), false)
    or exists (
      select 1 from arena_tournaments t
       where t.status = 'qualifying'
         and (now() at time zone 'Asia/Seoul')::date between t.qualify_from and t.qualify_to
    );
$$;

/** 화면이 안내를 띄울 때 쓰는 것 — 왜 닫혔는지, 언제 열리는지 */
create or replace function public.arena_gate_state()
returns table (
  is_open boolean,
  opened_by_admin boolean,
  closed_message text,
  next_open_from date,
  next_open_to date,
  next_tournament text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    arena_rooms_open(),
    coalesce((select rooms_open from arena_settings where id), false),
    (select s.closed_message from arena_settings s where s.id),
    (select t.qualify_from from arena_tournaments t
      where t.status = 'qualifying' order by t.qualify_from limit 1),
    (select t.qualify_to from arena_tournaments t
      where t.status = 'qualifying' order by t.qualify_from limit 1),
    (select t.name from arena_tournaments t
      where t.status = 'qualifying' order by t.qualify_from limit 1);
$$;

-- ── 관리자가 여닫기 ───────────────────────────────────────────

create or replace function public.arena_set_rooms_open(p_open boolean, p_message text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not arena_is_admin() then
    raise exception '관리자만 할 수 있습니다';
  end if;
  update arena_settings
     set rooms_open = p_open,
         closed_message = p_message,
         updated_at = now(),
         updated_by = auth.uid()
   where id;
end;
$$;

-- ── 문이 닫혀 있으면 기록도 안 남는다 ─────────────────────────
--
-- 화면만 막으면 개발자 도구로 우회할 수 있다. 상금이 걸린 대회라 **기록이
-- 남는 것 자체**를 막아야 한다.

drop policy if exists "insert own escape record" on public.arena_escape_records;

create policy "insert own escape record"
  on public.arena_escape_records for insert
  with check (
    auth.uid() = user_id
    and arena_rooms_open()
    and (
      select count(*)
      from public.arena_escape_records prev
      where prev.user_id = auth.uid()
        and prev.room_id = arena_escape_records.room_id
    ) < 2
  );

-- 겨루기도 같은 방을 쓰므로 함께 잠근다.
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
  if not arena_rooms_open() then
    raise exception '아직 문이 열리지 않았습니다';
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
      if v_try >= 20 then
        raise exception '대결 번호를 만들지 못했습니다. 잠시 후 다시 시도해 주세요';
      end if;
    end;
  end loop;
end;
$$;
