-- 샬롬기도단에 기도제목이 올라오면 기도단원에게만 알린다.
--
-- 지금은 아무에게도 안 간다. 기도제목을 올려도 기도단원이 앱을 열어 보기
-- 전에는 모른다 — 중보를 부탁한 글이 며칠 묵는다.
--
-- ── 누구에게 보내나 ────────────────────────────────────────────────
-- 교적의 샬롬기도팀(member_ministries → org_units.name like '샬롬%')이다.
-- 주보 0072 에서 열 분을 등록해 두었다. 교적이 곧 명단이므로 앱에서 따로
-- 관리하지 않는다 — 사람이 바뀌면 교적만 고치면 된다.
--
-- ── 왜 앱이 아니라 트리거인가 ──────────────────────────────────────
-- 받을 사람 목록을 앱이 정해 보내게 두면, 그 요청을 흉내 내어 아무에게나
-- 알림을 보낼 수 있다. 기도제목 알림은 목회자 폰에 뜨는 것이라 더욱 그렇다.
-- 그래서 **누가 받을지는 서버가 정한다.** 앱은 글만 쓴다.

-- ── 1. 새 알림 종류 ────────────────────────────────────────────────
alter table push_outbox drop constraint if exists push_outbox_topic_check;
alter table push_outbox add constraint push_outbox_topic_check
  check (topic in ('shepherd_letter', 'notice', 'reading_plan', 'prayer'));

-- 이미 알림을 켜 둔 분들에게도 이 종류를 더해 준다. 안 그러면 새 종류라
-- 아무에게도 안 간다 — 「보냈는데 안 온다」의 흔한 원인이다.
alter table app_push_subscriptions
  alter column topics set default array['shepherd_letter', 'notice', 'prayer'];

update app_push_subscriptions
   set topics = array_append(topics, 'prayer')
 where not ('prayer' = any(topics));

-- ── 2. 기도제목이 올라오면 쌓는다 ──────────────────────────────────

create or replace function public.prayer_notify_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  targets uuid[];
  who text;
begin
  select array_agg(distinct m.user_id) into targets
    from member_ministries mm
    join org_units u on u.id = mm.ministry_id
    join members m on m.id = mm.member_id
   where u.unit_type = 'ministry'
     and u.name like '샬롬%'
     and m.user_id is not null
     and m.deleted_at is null
     -- 자기가 올린 글을 자기 폰이 알릴 필요는 없다.
     and m.user_id <> new.user_id;

  if coalesce(array_length(targets, 1), 0) = 0 then
    return new;
  end if;

  -- 올린 사람 이름. 교적 실명이 있으면 그것을 쓴다.
  select coalesce(
    (select mm2.name from members mm2 where mm2.user_id = new.user_id and mm2.deleted_at is null limit 1),
    '한 성도'
  ) into who;

  -- **기도제목 내용은 싣지 않는다.** 잠금화면에 뜨는 글이고 사정이 담긴다.
  -- 누가 올렸는지까지만 알리고, 내용은 앱을 열어 보게 한다.
  insert into push_outbox (topic, title, body, url, target_user_ids)
  values (
    'prayer',
    '샬롬기도단에 기도제목이 올라왔습니다',
    who || ' 님이 기도를 부탁하셨습니다',
    '/prayer-group',
    targets
  );

  return new;
end;
$$;

drop trigger if exists prayer_requests_notify_team on public.prayer_requests;
create trigger prayer_requests_notify_team
  after insert on public.prayer_requests
  for each row execute function public.prayer_notify_team();

revoke all on function public.prayer_notify_team() from public, anon, authenticated;

comment on function public.prayer_notify_team() is
  '기도제목이 올라오면 교적의 샬롬기도팀에게만 알린다. 받을 사람은 서버가 정한다.';
