-- 목자의 편지가 올라오면 **어떤 길로 올라오든** 알림이 나간다.
--
-- ── 왜 필요한가 ─────────────────────────────────────────────────────
-- 지금은 앱의 관리 화면(insertLetter)이 글을 올린 뒤 알림 함수를 부른다.
-- 그래서 **앱으로 쓸 때만** 알림이 간다. 사역ON 에서 자료를 받아 넣거나, SQL 로
-- 직접 넣거나, 나중에 다른 화면이 생기면 글은 올라가는데 알림은 안 간다.
-- 「올렸는데 아무도 모른다」가 되고, 그러면 다음부터 그 자리를 안 쓰게 된다.
--
-- 0071(샬롬기도단)에서 세운 원칙 그대로다 — **글이 저장되는 자리에서** 알린다.
-- 앱은 글만 쓴다.
--
-- ── 언제 나가는가 ───────────────────────────────────────────────────
-- · 발행 상태로 새로 들어올 때
-- · 초안으로 넣어 두었다가 **발행으로 바뀔 때**(false → true)
-- 이미 발행된 글을 고치는 것으로는 다시 안 나간다. 오타 하나 고칠 때마다
-- 온 교인의 폰이 울리면 안 된다.
--
-- ── 앱 쪽 호출은 뺀다 ───────────────────────────────────────────────
-- src/db/shepherdLetters.ts 의 queuePush 를 같은 커밋에서 지웠다. 안 지우면
-- 앱으로 올릴 때만 알림이 **두 번** 간다.

create or replace function public.shepherd_letter_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  -- 발행된 것만. 초안은 조용히 둔다.
  if not coalesce(new.is_published, false) then
    return null;
  end if;
  -- 고침은 알리지 않는다. 안 알려진 것이 알려지는 순간만 잡는다.
  if tg_op = 'UPDATE' and coalesce(old.is_published, false) then
    return null;
  end if;

  v_title := nullif(btrim(coalesce(new.title, '')), '');

  insert into push_outbox (topic, title, body, url)
  values (
    'shepherd_letter',
    '목자의 편지에 새소식이 올라왔습니다',
    coalesce(v_title, '들어와서 읽어 보세요'),
    '/shepherd-letters/' || new.id
  );

  -- 쌓아만 두면 아무도 안 보낸다. 보내는 함수를 깨운다(0045 와 같은 방식).
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
end;
$$;

drop trigger if exists shepherd_letters_notify on public.shepherd_letters;
create trigger shepherd_letters_notify
  after insert or update of is_published on public.shepherd_letters
  for each row execute function public.shepherd_letter_notify();

comment on function public.shepherd_letter_notify() is
  '목자의 편지가 발행되면 알림을 쌓고 보내는 함수를 깨운다. 어떤 길로 올라와도 나간다.';
