-- 통독 알림이 보내는 순간 거부되던 것을 고친다.
--
--   new row for relation "push_outbox" violates check constraint
--
-- 0042 가 topic 을 ('shepherd_letter','notice') 둘로 못박아 두었다. 0045 에서
-- 'reading_plan' 을 쓰기 시작했는데 그 제약을 안 넓혔다.
--
-- ⚠️ 눈에 안 띄는 고장이었다. 크론은 새벽에 조용히 돌고, 실패해도 아무도 안
--    본다. "알림이 안 온다"만 남았을 것이다. 시험 삼아 한 줄 넣어 보고서야
--    드러났다 — 넣는 길을 실제로 한 번 밟아 보는 것 말고는 알 방법이 없었다.

alter table push_outbox drop constraint if exists push_outbox_topic_check;
alter table push_outbox
  add constraint push_outbox_topic_check
  check (topic in ('shepherd_letter', 'notice', 'reading_plan'));

-- 이미 알림을 켜 두신 분들(21명)에게 통독 알림도 켜 드린다.
--
-- 새로 켜라고 하면 대부분 안 켠다. 그리고 이분들은 이미 「이 앱의 알림을 받겠다」고
-- 하신 분들이라, 통독 알림도 그 뜻 안에 있다고 보는 것이 자연스럽다.
-- 끄고 싶으면 마이페이지에서 끌 수 있다.
update app_push_subscriptions
   set topics = array_append(topics, 'reading_plan')
 where not (topics @> array['reading_plan']);

-- 앞으로 새로 켜는 사람도 기본으로 받게 한다.
alter table app_push_subscriptions
  alter column topics set default array['shepherd_letter', 'notice', 'reading_plan'];

notify pgrst, 'reload schema';
