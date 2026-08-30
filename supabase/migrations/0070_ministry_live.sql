-- 목회동행 실시간 알림 줄.
--
-- 사역ON(같은 DB 의 ministry 스키마)에서 「성도와 함께 보기」를 켜면 줄 하나가 생기고,
-- 끄거나 사역을 마치면 사라진다. 그래서 홈의 띠는 **켜 두신 동안에만** 뜬다.
--
-- 여기에는 위치가 들어가지 않는다 — 제목·상태·열쇠뿐이다. 누구나 읽는 표라
-- 좌표를 두면 걸어 다니신 길이 통째로 새어 나간다. 지도와 사진은 열쇠로 여는
-- 사역ON 화면이 그리고, 무엇을 가릴지도 그쪽이 정한다.

create table if not exists public.ministry_live (
  id          text primary key,
  title       text not null,
  kind        text,
  note        text,
  token       text not null,
  status      text not null default 'RUNNING',
  started_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.ministry_live enable row level security;

-- 읽기는 누구나(로그인 안 한 성도도 홈에서 본다).
-- 쓰기 정책은 만들지 않는다 — 사역ON 이 직접 연결로만 쓴다.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ministry_live' and policyname = 'ministry_live_read'
  ) then
    create policy ministry_live_read on public.ministry_live for select using (true);
  end if;
end $$;
