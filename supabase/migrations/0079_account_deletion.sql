-- 계정 삭제 — 구글 플레이 정책(앱 안에서 계정을 지울 수 있어야 한다)에 맞추기 위한 준비.
--
-- 지금까지 계정 삭제가 «조용히» 실패한 까닭은, auth.users(id) 를 가리키면서
-- on delete 규칙이 없는 외래키가 남아 있었기 때문이다. 하나라도 걸리면 삭제가 막히고
-- JS 클라이언트는 500 본문을 삼켜 빈 오류 객체 {} 만 돌려준다.
--
-- 이 파일이 하는 일은 셋이다.
--   1) 규칙 없는 외래키를 찾아 규칙을 붙인다(무엇을 바꿨는지 NOTICE 로 남긴다).
--   2) 본인이 자기 계정을 지우는 함수 public.delete_my_account() 를 만든다.
--   3) 지우기 전에 무엇이 사라지는지 미리 세어 보는 public.my_account_summary() 를 만든다.

-- ── 1. 규칙 없는 외래키에 규칙 붙이기 ─────────────────────────────────
-- 칸 이름으로 «소유자»와 «행위자»를 가른다.
--   소유자(user_id·owner_id·author_id·member_id…) → 계정과 함께 지운다(cascade)
--   행위자(created_by·updated_by·recorded_by…)   → 이력은 남기고 사람만 지운다(set null)
--   다만 not null 인 칸은 set null 을 걸 수 없으므로 cascade 로 간다.
do $$
declare
  r record;
  is_owner boolean;
  can_null boolean;
  action text;
begin
  for r in
    select
      con.oid              as con_oid,
      con.conname          as con_name,
      rel.relname          as table_name,
      nsp.nspname          as schema_name,
      att.attname          as column_name,
      att.attnotnull       as not_null
    from pg_constraint con
    join pg_class rel      on rel.oid = con.conrelid
    join pg_namespace nsp  on nsp.oid = rel.relnamespace
    join pg_class fref     on fref.oid = con.confrelid
    join pg_namespace fnsp on fnsp.oid = fref.relnamespace
    join unnest(con.conkey) with ordinality as k(attnum, ord) on true
    join pg_attribute att  on att.attrelid = con.conrelid and att.attnum = k.attnum
    where con.contype = 'f'
      and fnsp.nspname = 'auth'
      and fref.relname = 'users'
      and con.confdeltype = 'a'          -- 'a' = NO ACTION (규칙이 없는 것)
      and array_length(con.conkey, 1) = 1
  loop
    is_owner := r.column_name in (
      'user_id', 'owner_id', 'author_id', 'member_id', 'leader_id',
      'host_id', 'guest_id', 'id'
    );
    can_null := not r.not_null;

    if is_owner or not can_null then
      action := 'cascade';
    else
      action := 'set null';
    end if;

    execute format(
      'alter table %I.%I drop constraint %I',
      r.schema_name, r.table_name, r.con_name
    );
    execute format(
      'alter table %I.%I add constraint %I foreign key (%I) references auth.users(id) on delete %s',
      r.schema_name, r.table_name, r.con_name, r.column_name, action
    );

    raise notice '고침: %.% (%) → on delete %', r.schema_name, r.table_name, r.column_name, action;
  end loop;
end $$;

-- ── 2. 지우기 전에 무엇이 사라지는지 미리 보기 ────────────────────────
-- 화면에서 「이런 것들이 함께 지워집니다」를 정직하게 보여 주기 위한 함수.
create or replace function public.my_account_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result jsonb := '{}'::jsonb;
  t record;
  n bigint;
begin
  if uid is null then
    raise exception '로그인이 필요합니다';
  end if;

  -- user_id 로 개인 기록을 담고 있는 표만 센다(공개 글은 따로 안내한다)
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'user_id'
      and tb.table_type = 'BASE TABLE'
      and c.table_name in (
        'reading_helper_progress', 'reading_helper_day_records',
        'qt_records', 'gratitude_entries', 'prayer_requests', 'prayer_logs',
        'reading_plan_progress', 'notes', 'word_notes', 'shop_purchases',
        'arena_escape_records'
      )
  loop
    execute format('select count(*) from public.%I where user_id = $1', t.table_name)
      into n using uid;
    if n > 0 then
      result := result || jsonb_build_object(t.table_name, n);
    end if;
  end loop;

  return result;
end $$;

grant execute on function public.my_account_summary() to authenticated;

-- ── 3. 본인 계정 지우기 ───────────────────────────────────────────────
-- 서비스 롤 열쇠를 앱에 넣지 않기 위해 DB 함수로 만든다.
-- security definer 로 돌지만 auth.uid() 로 «부른 사람 자신»만 지운다.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception '로그인이 필요합니다';
  end if;

  -- 위 1번에서 규칙을 붙였으므로 여기서 지우면 개인 기록은 함께 지워지고(cascade)
  -- 남겨야 할 이력의 작성자 칸은 비워진다(set null).
  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
  '로그인한 본인의 계정을 지운다. 개인 기록은 함께 지워지고, 공동체에 남긴 글의 작성자 칸은 비워진다.';
