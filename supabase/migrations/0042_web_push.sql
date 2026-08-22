-- 데이빗바이블 웹푸시 — 목자의 편지와 알림마당에 새 글이 올라오면 알린다.
--
-- 데이빗바이블은 Vercel 에 **정적 웹**으로 나간다(expo export -p web). 서버가
-- 없으므로 알림을 *받는* 것은 브라우저가 하고, *보내는* 쪽은 Supabase Edge
-- Function 이 맡는다. VAPID 비밀키는 그 함수만 쥔다.
--
-- 스마트주보의 push_subscriptions 와 **다른 표다.** 저쪽은 교회 교적부의
-- members 를 가리키고, 이쪽은 데이빗바이블 계정(auth.users)을 가리킨다.
-- 한 표에 담으려다가는 두 앱의 사람 개념이 섞인다.

create table if not exists app_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  /** 그 브라우저 하나를 가리키는 주소. 같은 기기가 다시 허락하면 이것이 같다. */
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  /** 무엇을 받을지. 나중에 종류가 늘어도 표를 안 바꾸도록 목록으로 둔다. */
  topics text[] not null default array['shepherd_letter', 'notice'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_push_user_idx on app_push_subscriptions (user_id);

drop trigger if exists app_push_set_updated_at on app_push_subscriptions;
create trigger app_push_set_updated_at before update on app_push_subscriptions
  for each row execute function set_updated_at();

alter table app_push_subscriptions enable row level security;

-- 자기 것만 보고 지운다. 남의 구독을 읽으면 그 사람에게 알림을 보낼 수 있게 된다.
drop policy if exists app_push_self_select on app_push_subscriptions;
create policy app_push_self_select on app_push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists app_push_self_insert on app_push_subscriptions;
create policy app_push_self_insert on app_push_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists app_push_self_update on app_push_subscriptions;
create policy app_push_self_update on app_push_subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists app_push_self_delete on app_push_subscriptions;
create policy app_push_self_delete on app_push_subscriptions
  for delete using (user_id = auth.uid());

/**
 * 알림 받기 — 브라우저가 준 구독을 담는다.
 *
 * 같은 기기가 다시 허락하면 덮어쓴다. 브라우저가 구독을 갱신하면 endpoint 는
 * 그대로인 채 열쇠만 바뀌는 일이 있어서, 새로 넣으면 한 기기에 두 줄이 된다.
 */
create or replace function public.app_push_subscribe(
  target_endpoint text,
  target_p256dh text,
  target_auth text,
  target_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sub_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;

  insert into app_push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), target_endpoint, target_p256dh, target_auth, target_user_agent)
  on conflict (endpoint)
  do update set user_id = excluded.user_id,
                p256dh = excluded.p256dh,
                auth = excluded.auth,
                user_agent = excluded.user_agent,
                updated_at = now()
  returning id into sub_id;

  return sub_id;
end;
$$;

/** 알림 끄기. 그 기기 하나만 끊는다 — 다른 기기는 계속 받는다. */
create or replace function public.app_push_unsubscribe(target_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from app_push_subscriptions
  where endpoint = target_endpoint and user_id = auth.uid();
$$;

revoke all on function public.app_push_subscribe(text, text, text, text) from public;
revoke all on function public.app_push_unsubscribe(text) from public;
grant execute on function public.app_push_subscribe(text, text, text, text) to authenticated;
grant execute on function public.app_push_unsubscribe(text) to authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 보낼 거리를 쌓아 두는 곳
-- ════════════════════════════════════════════════════════════════════
--
-- 글을 올리는 순간 바로 보내지 않고 여기 한 줄을 남긴다. 보내는 일은 Edge
-- Function 이 이 줄을 집어다 한다.
--
-- 왜 곧장 안 보내나: 글쓰기와 알림보내기를 한 몸으로 묶으면, 알림이 실패할 때
-- 글까지 못 올리게 된다. 글은 이미 올라갔는데 알림만 못 간 것이 훨씬 낫다.
-- 쌓아 두면 나중에 다시 시도할 수도 있다.

create table if not exists push_outbox (
  id uuid primary key default gen_random_uuid(),
  topic text not null check (topic in ('shepherd_letter', 'notice')),
  title text not null,
  body text not null,
  url text not null,
  /** 아직 안 보냈으면 null. 보냈으면 그 시각. */
  sent_at timestamptz,
  sent_count integer,
  error text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists push_outbox_pending_idx on push_outbox (created_at)
  where sent_at is null;

alter table push_outbox enable row level security;

-- 관리자만 쌓고 본다. 보내는 쪽(Edge Function)은 service role 로 읽으므로
-- 정책을 거치지 않는다.
drop policy if exists push_outbox_admin on push_outbox;
create policy push_outbox_admin on push_outbox
  for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

do $$
begin
  if not exists (select 1 from information_schema.tables where table_name = 'app_push_subscriptions') then
    raise exception '푸시 구독 표가 만들어지지 않았습니다.';
  end if;
  raise notice '데이빗바이블 웹푸시 준비가 됐습니다.';
end $$;

notify pgrst, 'reload schema';
