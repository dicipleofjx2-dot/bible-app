-- 커뮤니티에 글이 올라오면 알림이 나간다.
--
-- ── 왜 필요한가 ─────────────────────────────────────────────────────
-- 커뮤니티는 지금 아무도 모르게 쌓인다. 9월에 올라온 글이 셋인데, 올린 분은
-- 나눴다고 생각하고 나머지는 앱을 열어 보기 전에는 모른다. 홈의 「안 읽은 글
-- 수」(0052)는 앱을 열어야 보이는 숫자라 이 문제를 못 푼다.
--
-- ── 누가 받나 ───────────────────────────────────────────────────────
-- 알림을 켜 둔 분 전부에서 **글쓴이만 뺀다.** 방금 내가 올린 글이 내 폰에서
-- 울리면 고장으로 보인다(0071 과 같은 원칙).
--
-- ── 왜 앱이 아니라 트리거인가 ──────────────────────────────────────
-- 0071·0075 에서 세운 원칙 그대로다 — **글이 저장되는 자리에서** 알린다.
-- 앱이 보내게 두면 앱으로 쓸 때만 알림이 가고, 받을 사람 목록을 앱이 정하면
-- 그 요청을 흉내 내어 아무에게나 알림을 보낼 수 있다.
--
-- 덧붙여, 커뮤니티 글은 **관리자가 아닌 성도가** 쓴다. 앱에서 부르는 길
-- (send-push 의 enqueue)은 관리자만 통과하므로 애초에 쓸 수 없다.
--
-- ── 글이 막히면 안 된다 ────────────────────────────────────────────
-- 알림 쪽에서 무엇이 터지든 글은 올라가야 한다. 그래서 이 함수는 예외를
-- 통째로 삼킨다 — 성도가 묵상을 나누려는데 "오류"가 뜨는 것보다, 알림 한 번
-- 못 가는 편이 낫다.

-- ── 1. 새 알림 종류 ────────────────────────────────────────────────
alter table push_outbox drop constraint if exists push_outbox_topic_check;
alter table push_outbox add constraint push_outbox_topic_check
  check (topic in ('shepherd_letter', 'notice', 'reading_plan', 'prayer', 'community'));

-- 이미 알림을 켜 둔 분들에게 이 종류를 더해 준다. 새로 켜라고 하면 대부분
-- 안 켠다 — 그리고 이분들은 이미 「이 앱의 알림을 받겠다」고 하신 분들이다.
update app_push_subscriptions
   set topics = array_append(topics, 'community')
 where not ('community' = any(topics));

-- 기본값을 바로잡는다.
--
-- ⚠️ 0071 이 기본값을 ['shepherd_letter','notice','prayer'] 로 바꾸면서
--    **reading_plan 을 빠뜨렸다.** 그 뒤에 알림을 켠 분들(21명 중 3명)은
--    통독 알림을 받지 못하고 있다. 아무 오류도 안 나고, 그분들은 조용히
--    안 받을 뿐이라 드러나지 않았다. 여기서 같이 되돌린다.
alter table app_push_subscriptions
  alter column topics set default
    array['shepherd_letter', 'notice', 'reading_plan', 'prayer', 'community'];

update app_push_subscriptions
   set topics = array_append(topics, 'reading_plan')
 where not ('reading_plan' = any(topics));

-- ── 2. 글이 올라오면 쌓는다 ────────────────────────────────────────

create or replace function public.community_post_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  targets uuid[];
  who text;
  preview text;
begin
  -- 알림을 켜 둔 분들. 글쓴이는 뺀다.
  select array_agg(distinct s.user_id) into targets
    from app_push_subscriptions s
   where s.topics @> array['community']
     and s.user_id <> new.user_id;

  if coalesce(array_length(targets, 1), 0) = 0 then
    return null;
  end if;

  -- 커뮤니티 화면에 뜨는 이름 그대로 쓴다. 화면과 알림에서 이름이 다르면
  -- 누가 썼는지 못 알아본다.
  select coalesce(nullif(btrim(p.username), ''), '한 성도') into who
    from profiles p
   where p.id = new.user_id;

  -- 커뮤니티는 로그인한 모두가 보는 자리라 앞 몇 줄을 실어도 된다(기도제목과
  -- 다른 점이다 — 그쪽은 사정이 담겨서 내용을 안 싣는다). 미리보기가 있어야
  -- 열어 볼지 정할 수 있다.
  preview := btrim(regexp_replace(coalesce(new.body, ''), '\s+', ' ', 'g'));
  if length(preview) > 60 then
    preview := left(preview, 60) || '…';
  end if;

  insert into push_outbox (topic, title, body, url, target_user_ids)
  values (
    'community',
    coalesce(who, '한 성도') || ' 님이 묵상을 나눴습니다',
    coalesce(nullif(preview, ''), '들어와서 읽어 보세요'),
    '/post/' || new.id,
    targets
  );

  -- 쌓아만 두면 아무도 안 보낸다. 보내는 함수를 깨운다(0045·0075 와 같은 방식).
  -- 헤더에 든 것은 **공개 키**다 — 브라우저에도 나가는 값이라 여기 적어도 된다.
  -- service role 키는 절대 여기 두지 않는다.
  perform net.http_post(
    url := 'https://bhqbrkeoiyhnmdgvofvy.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_Bp3WdeLGODDJVCiJ_tzREw_sWJsKH9H'
    ),
    body := '{}'::jsonb
  );

  return null;
exception
  when others then
    -- 알림 때문에 글쓰기가 막히면 안 된다. 여기서 터져도 글은 이미 들어가 있다.
    return null;
end;
$$;

drop trigger if exists posts_notify_community on public.posts;
create trigger posts_notify_community
  after insert on public.posts
  for each row execute function public.community_post_notify();

revoke all on function public.community_post_notify() from public, anon, authenticated;

comment on function public.community_post_notify() is
  '커뮤니티에 글이 올라오면 알림을 쌓고 보내는 함수를 깨운다. 글쓴이는 받지 않는다.';

notify pgrst, 'reload schema';
