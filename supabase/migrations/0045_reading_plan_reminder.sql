-- 통독 알림을 매일 두 번 보낸다.
--
-- 왜: 35명 중 17명이 첫 이틀 안에 멈췄다. 닷새를 넘긴 사람은 거의 다 남아
-- 있으니, 문제는 재미도 콘텐츠도 아니라 **다음 날 잊는 것**이다. 지금은 들어올
-- 이유를 만들어 주는 것이 아무것도 없다.
--
-- 아침 7시 — 모두에게. 하루를 말씀으로 여는 쪽.
-- 저녁 8시 — **오늘 아직 안 하신 분에게만.** 이미 읽으신 분께 저녁에 또 보내면
--            그건 잔소리다. 두 번째 알림에 가장 빨리 알림을 끄게 만든다.
--
-- 본문(창세기 6~8장 같은)은 아직 안 싣는다. 사람마다 시작일이 달라 오늘 읽을
-- 곳이 다른데, 지금 보내는 구조는 주제 단위 방송이라 한 문구가 모두에게 간다.
-- 눌러서 들어오면 오늘 읽을 곳이 첫 화면에 뜨므로, 잊지 않게 하는 목적은 이걸로
-- 이미 이룬다. 사람마다 본문을 다르게 싣는 것은 다음 걸음이다.

-- ── 1. 받는 사람을 좁힐 수 있게 한다 ────────────────────────────
--
-- 지금까지 outbox 한 줄은 「그 주제를 켠 사람 전부」에게 갔다. 저녁 알림은
-- 그중 일부에게만 가야 하므로 받을 사람을 적을 칸을 둔다. 비워 두면 전처럼
-- 전부에게 간다 — 기존 알림은 손대지 않는다.
alter table push_outbox
  add column if not exists target_user_ids uuid[];

comment on column push_outbox.target_user_ids is
  '이 사람들에게만 보낸다. 비우면 그 주제를 켠 사람 전부. 저녁 통독 알림이 "아직 안 하신 분"만 고를 때 쓴다.';

-- ── 2. 알림을 쌓는 함수 ─────────────────────────────────────────
create or replace function public.reading_plan_enqueue(kind text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  targets uuid[];
  n integer;
begin
  if kind = 'morning' then
    -- 전부에게. 받을 사람을 안 적으면 그 주제를 켠 사람 모두에게 간다.
    insert into push_outbox (topic, title, body, url)
    values (
      'reading_plan',
      '오늘의 통독이 기다리고 있어요',
      '눌러서 오늘 읽을 곳을 확인해 보세요.',
      '/reading-helper'
    );
    return -1;   -- 전체 발송이라 인원을 여기서 세지 않는다
  end if;

  if kind <> 'evening' then
    raise exception '알 수 없는 알림 종류입니다: %', kind;
  end if;

  -- 통독을 시작했는데 **오늘 아직 안 끝낸** 사람만.
  select array_agg(p.user_id) into targets
  from reading_helper_progress p
  where not exists (
    select 1 from reading_helper_day_records r
    where r.user_id = p.user_id
      and r.date = (now() at time zone 'Asia/Seoul')::date
      -- 「마쳤다」의 기준은 앱·달력과 같다: 그날 성경퀴즈 80점 이상.
      and r.quiz_score >= 80
  );

  n := coalesce(array_length(targets, 1), 0);
  -- 아무도 없으면 쌓지 않는다. 다들 하신 날 저녁엔 조용한 것이 맞다.
  if n = 0 then return 0; end if;

  insert into push_outbox (topic, title, body, url, target_user_ids)
  values (
    'reading_plan',
    '오늘 통독, 아직이시죠?',
    '지금 5분이면 됩니다. 눌러서 오늘 읽을 곳을 보세요.',
    '/reading-helper',
    targets
  );
  return n;
end;
$$;

comment on function public.reading_plan_enqueue(text) is
  '통독 알림을 push_outbox 에 쌓는다. evening 은 오늘 아직 안 끝낸 사람만 고른다 — 다 읽으신 분께 또 보내면 잔소리가 된다.';

revoke all on function public.reading_plan_enqueue(text) from public;

-- ── 3. 매일 깨우기 ──────────────────────────────────────────────
--
-- 데이빗바이블은 서버 없이 도는 정적 웹이라 정해진 시각에 무언가를 할 곳이
-- DB 밖에 없다. pg_cron 이 쌓고, pg_net 이 보내는 함수를 깨운다.
--
-- 헤더에 든 것은 **공개 키(anon)** 다. 브라우저에도 나가는 값이라 여기 적어도
-- 새는 것이 아니다. service role 키는 절대 여기 두지 않는다.
--
-- 시각은 UTC 로 적는다. 한국시간 07:00 = UTC 22:00(전날), 20:00 = UTC 11:00.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('reading-plan-morning') where exists (
  select 1 from cron.job where jobname = 'reading-plan-morning'
);
select cron.unschedule('reading-plan-evening') where exists (
  select 1 from cron.job where jobname = 'reading-plan-evening'
);

select cron.schedule('reading-plan-morning', '0 22 * * *', $cron$
  select public.reading_plan_enqueue('morning');
  select net.http_post(
    url := 'https://bhqbrkeoiyhnmdgvofvy.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_Bp3WdeLGODDJVCiJ_tzREw_sWJsKH9H'
    ),
    body := '{}'::jsonb
  );
$cron$);

select cron.schedule('reading-plan-evening', '0 11 * * *', $cron$
  select public.reading_plan_enqueue('evening');
  select net.http_post(
    url := 'https://bhqbrkeoiyhnmdgvofvy.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_Bp3WdeLGODDJVCiJ_tzREw_sWJsKH9H'
    ),
    body := '{}'::jsonb
  );
$cron$);

notify pgrst, 'reload schema';
