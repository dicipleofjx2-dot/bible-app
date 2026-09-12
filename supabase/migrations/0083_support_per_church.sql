-- 후원 화면을 교회별로 나눈다.
--
-- ## 왜
--
-- `support_settings` 는 `id = 'default'` 한 줄만 허용하는 싱글턴으로 만들어졌다
-- (0028). 그 뒤 0038 이 교회 구분을 넣으면서 그 한 줄이 **새부대교회 줄**이 되었다.
-- 그래서 다른 교회 성도가 로그인하면 후원 화면이 통째로 빈다 — 쿠팡 배너도,
-- 계좌도 없다.
--
-- 그런데 이 화면의 두 가지는 성격이 다르다.
--
-- | 무엇 | 누구의 것 | 교회마다 다른가 |
-- |---|---|---|
-- | 쿠팡파트너스 링크 | 앱(데이빗바이블) 후원 | 아니다 — 모두 같이 쓴다 |
-- | 후원계좌 | 교회 (지금 값의 예금주가 「새부대교회」다) | 그렇다 |
--
-- 그래서 표를 **공용 한 줄 + 교회마다 한 줄**로 만든다. 보여 줄 때는 공용 위에
-- 교회 줄을 덮고, 교회 줄의 빈 칸은 공용 값을 쓴다(`src/db/support.ts`).
-- 교회는 계좌만 적으면 되고 쿠팡 배너는 그대로 살아 있다.

-- ── 싱글턴 족쇄를 푼다 ──────────────────────────────────────────────────
--
-- `check (id = 'default')` 가 걸려 있어 두 번째 줄이 아예 안 들어간다.
-- 제약 이름은 자동으로 붙은 것이라 찾아서 지운다.
do $$
declare
  c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.support_settings'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%default%';
  if c is not null then
    execute format('alter table public.support_settings drop constraint %I', c);
  end if;
end $$;

-- 새 줄은 자기 열쇠를 받아야 한다. 안 그러면 기본값 'default' 로 또 부딪힌다.
alter table public.support_settings
  alter column id set default gen_random_uuid()::text;

-- ── 한 교회에 한 줄, 공용도 한 줄 ───────────────────────────────────────
--
-- 부분 인덱스 둘로 나눈 이유: `unique (church_id)` 는 NULL 을 서로 다른 값으로
-- 보기 때문에 공용 줄이 여러 개 생길 수 있다. (`nulls not distinct` 는 PG15
-- 이상에서만 된다 — 버전에 매이지 않게 이 방식을 쓴다.)
--
-- ⚠️ 이 인덱스들은 **부분 인덱스**다. `on conflict (church_id)` 로는 못 찾는다
-- (조건까지 함께 적어야 한다). 그래서 앱은 upsert 대신 「고치고, 고쳐진 줄이
-- 없으면 넣는다」로 쓴다.
create unique index if not exists support_settings_church_key
  on public.support_settings (church_id)
  where church_id is not null;

create unique index if not exists support_settings_shared_key
  on public.support_settings ((church_id is null))
  where church_id is null;

-- ── 지금 있는 줄을 둘로 가른다 ──────────────────────────────────────────
--
-- 계좌(새부대교회)는 그 교회 줄에 남기고, 쿠팡 링크만 공용 줄로 옮긴다.
-- 두 군데 같은 링크를 두면 한쪽만 고치게 된다.
insert into public.support_settings (id, church_id, coupang_url, bank_name, bank_account, bank_holder)
select 'shared', null, coalesce(max(coupang_url), ''), '', '', ''
  from public.support_settings
 where church_id is not null
   and coupang_url <> ''
having count(*) > 0
on conflict do nothing;

-- 공용 줄이 아직 없으면(쿠팡 링크가 비어 있었던 경우) 빈 줄이라도 하나 둔다.
-- 앱은 이 줄을 고치기만 한다 — 넣는 일은 여기서 끝내 둔다.
insert into public.support_settings (id, church_id)
select 'shared', null
 where not exists (select 1 from public.support_settings where church_id is null);

update public.support_settings
   set coupang_url = ''
 where church_id is not null;

-- ── 보이는 범위 ─────────────────────────────────────────────────────────
--
-- 0038 이 건 restrictive 정책은 `church_id = my_church_id()` 만 통과시킨다.
-- 공용 줄(church_id 가 빈 줄)은 그 비교가 NULL 이라 **로그인한 사람에게만
-- 사라진다.** 0038 때 목자의 편지에서 똑같이 당한 함정이다.
drop policy if exists support_settings_church_scope on public.support_settings;
create policy support_settings_church_scope on public.support_settings
  as restrictive for select
  using (
    auth.uid() is null
    or church_id is null
    or church_id = public.my_church_id()
  );

-- ── 쓰는 사람 ───────────────────────────────────────────────────────────
--
-- 0028 의 is_admin update 정책은 그대로 둔다(정책은 OR 로 묶인다).
-- 여기에 교회 관리자를 더한다 — 0078 의 `can_manage_church_settings` 는
-- 전체 관리자(is_admin)도 통과시키므로, 공용 줄(church_id 가 비어 있으면
-- 교회 권한이 성립하지 않는다)은 전체 관리자만 고칠 수 있다.
drop policy if exists "church admins can write support settings" on public.support_settings;
create policy "church admins can write support settings" on public.support_settings
  for update
  using (public.can_manage_church_settings(church_id))
  with check (public.can_manage_church_settings(church_id));

drop policy if exists "church admins can add support settings" on public.support_settings;
create policy "church admins can add support settings" on public.support_settings
  for insert
  with check (church_id is not null and public.can_manage_church_settings(church_id));

-- ── 새 줄의 church_id 는 앱이 직접 넣는다 ───────────────────────────────
--
-- 0038 의 트리거는 church_id 가 비어 있으면 글쓴이의 교회로 채운다. 그건
-- 편지·공지처럼 「쓴 사람의 교회 것」인 표에 맞는 규칙이고, 여기서는 공용 줄을
-- 만들 수 없게 만든다. 공용 줄은 위에서 이미 만들어 두었으니 그대로 두어도
-- 되지만, 뜻을 분명히 남긴다.
comment on column public.support_settings.church_id is
  '이 후원 정보가 어느 교회 것인가. 비어 있으면 모든 교회가 함께 쓰는 공용 줄이다(쿠팡파트너스 링크).';
