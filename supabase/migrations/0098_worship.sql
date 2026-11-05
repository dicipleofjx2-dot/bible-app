-- 예배 — 홈 첫 칸. 매주 예배 링크와 예배별 보고서.
--
-- ## 왜 따로 만드나
--
-- 주보 앱에도 `worship_services` 가 있다(0032). 그것은 **그 주 주보에 실리는
-- 예배 순서**다 — 주보 한 장에 매여 있어서 지난주 주보를 지우면 함께 사라진다.
-- 여기 필요한 것은 **계속 있는 예배**다: 「주일 1부 장년예배」는 주보와 상관없이
-- 해마다 그 자리에 있고, 성도는 그 칸을 눌러 이번 주 영상을 본다. 두 표의
-- 수명이 다르므로 한 표에 담지 않는다.
--
-- ## 세 표로 가른 까닭
--
--   · `worship_meetings`       — 예배 칸. 장년·다음세대·청년으로 나뉜다.
--   · `worship_reports`        — 그 날 그 예배의 보고서. **성도도 읽는다.**
--   · `worship_report_private` — 같은 보고서의 **대표관리자만 보는 부분.**
--
-- 비공개 부분을 보고서 표의 칼럼 하나로 두지 않는다. **RLS 는 줄 단위다** —
-- 보고서 한 줄을 읽을 수 있는 사람에게 그 줄의 모든 칼럼이 함께 나간다.
-- 칼럼으로 가려 둔 척하면 성도 화면이 그 칸을 부르지 않을 뿐, 막혀 있지는 않다.
-- 0084(성장ON)에서 상담·건강 기록을 표째 가른 것과 같은 판단이다.

-- ── 누가 쓰고 누가 보는가 ───────────────────────────────────────────────
--
-- 0078 의 can_manage_church_* 를 쓰지 않는다. 그 둘은 주보편집자(editor)와
-- 관리자(admin)만 보는데 **대표관리자(owner)가 빠져 있다** — has_church_role 은
-- 서열이 아니라 역할 목록을 그대로 맞춰 보기 때문이다. 예배 보고서에서 대표가
-- 빠지면 안 되므로 여기서 쓰는 두 함수는 owner 를 또박또박 적어 둔다.

/** 보고서를 쓸 수 있는가 — **관리자 이상**(대표관리자·관리자, 그리고 앱 전체관리자). */
create or replace function public.can_write_worship(target_church_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (select 1 from profiles where id = auth.uid() and is_admin)
    or (
      target_church_id is not null
      and public.has_church_role(target_church_id, array['owner', 'admin'])
    );
$$;

/**
 * 보고서의 비공개 부분을 볼 수 있는가 — **대표관리자만.**
 *
 * 앱 전체관리자(profiles.is_admin)도 통과시킨다. 이 앱에서 그 표시는 대표관리자
 * 한 사람의 것으로 쓰여 왔다(0056 이 그 표시를 「대표관리자」라 부르며 교적
 * 실명을 그 사람에게만 열었다).
 */
create or replace function public.can_read_worship_private(target_church_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (select 1 from profiles where id = auth.uid() and is_admin)
    or (
      target_church_id is not null
      and public.has_church_role(target_church_id, array['owner'])
    );
$$;

grant execute on function public.can_write_worship(uuid) to authenticated;
grant execute on function public.can_read_worship_private(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- 1. worship_meetings — 예배 칸
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.worship_meetings (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) on delete cascade,
  -- 장년 · 다음세대 · 청년. 교회가 예배를 묶어 부르는 세 덩이다.
  congregation text not null check (congregation in ('adult', 'next', 'youth')),
  name text not null,
  -- 「주일 오전 11:00」처럼 **사람이 읽는 대로** 적는다. 요일·시각을 숫자로 받아
  -- 두면 「주일 1·2부」나 「셋째 주만」 같은 교회의 실제 사정을 담지 못한다.
  meets_at text,
  /**
   * 늘 같은 링크 — 생중계 주소·재생목록·유튜브 채널.
   *
   * 그 주 영상은 보고서(worship_reports.video_url)에 적는다. 두 자리를 둔
   * 까닭: 매주 주소를 갈아 끼우면 지난주 영상으로 가는 길이 사라진다.
   */
  link_url text,
  link_label text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 지울 때도 줄을 남긴다. 통째로 지우면 그 예배에 딸린 보고서가 함께 사라진다.
  deleted_at timestamptz
);

create index if not exists worship_meetings_church_idx
  on public.worship_meetings (church_id, congregation, sort_order)
  where deleted_at is null;

alter table public.worship_meetings enable row level security;

-- 성도는 자기 교회의 **살아 있는** 예배를 본다.
drop policy if exists worship_meetings_read on public.worship_meetings;
create policy worship_meetings_read on public.worship_meetings
  for select using (
    deleted_at is null
    and is_active
    and church_id = public.my_church_id()
  );

-- 관리자 이상은 꺼 둔 것까지 본다(관리 화면에서 되살려야 한다).
--
-- 주의: 정책 여럿은 OR 로 묶인다. 그래서 **성도 화면도 조건을 스스로 적어야
-- 한다** — 2026-11 에 알림팝업이 관리자 화면에만 두 달째 떠 있던 것이 이것
-- 때문이었다(src/db/popupNotices.ts 주석).
drop policy if exists worship_meetings_write on public.worship_meetings;
create policy worship_meetings_write on public.worship_meetings
  for all
  using (public.can_write_worship(church_id))
  with check (public.can_write_worship(church_id));

-- ════════════════════════════════════════════════════════════════════════
-- 2. worship_reports — 보고서(공개)
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.worship_reports (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) on delete cascade,
  meeting_id uuid not null references public.worship_meetings(id) on delete cascade,
  held_on date not null default current_date,
  /** 그 주 영상. 비워도 된다 — 예배 칸에 늘 같은 링크가 걸려 있다. */
  video_url text,
  preacher text,
  sermon_title text,
  passage text,
  attendance integer check (attendance >= 0),
  /** 성도가 읽는 본문. 비공개 부분은 다음 표에 따로 있다. */
  body text not null default '',
  author_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists worship_reports_meeting_idx
  on public.worship_reports (meeting_id, held_on desc)
  where deleted_at is null;

-- 한 예배의 한 날에 보고서는 하나. 두 벌이 생기면 어느 것이 그 날의 보고인지
-- 알 수 없고, 비공개 부분이 어느 쪽에 붙었는지도 흐려진다.
create unique index if not exists worship_reports_one_per_day
  on public.worship_reports (meeting_id, held_on)
  where deleted_at is null;

alter table public.worship_reports enable row level security;

drop policy if exists worship_reports_read on public.worship_reports;
create policy worship_reports_read on public.worship_reports
  for select using (
    deleted_at is null
    and church_id = public.my_church_id()
  );

drop policy if exists worship_reports_write on public.worship_reports;
create policy worship_reports_write on public.worship_reports
  for all
  using (public.can_write_worship(church_id))
  with check (public.can_write_worship(church_id));

-- ════════════════════════════════════════════════════════════════════════
-- 3. worship_report_private — 같은 보고서의 대표관리자 전용 부분
-- ════════════════════════════════════════════════════════════════════════
--
-- 보고서 한 줄에 하나뿐이라 report_id 가 그대로 기본키다.
--
-- **쓰는 사람과 읽는 사람이 다르다.** 부서 관리자가 적고 대표관리자가 읽는다 —
-- 대표에게 올리는 보고가 그런 모양이다. 그래서 적은 사람 자신에게만 한 줄
-- 예외를 둔다(author_id = auth.uid()). 자기가 적은 것을 다시 못 읽으면 고치려
-- 할 때 무엇이 적혀 있는지 모른 채 덮어쓰게 된다.

create table if not exists public.worship_report_private (
  report_id uuid primary key references public.worship_reports(id) on delete cascade,
  church_id uuid references churches(id) on delete cascade,
  body text not null default '',
  /** 헌금처럼 숫자로만 적기 어려운 것은 글로 남긴다. 금액 칸을 따로 두지 않는다. */
  offering_note text,
  author_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.worship_report_private enable row level security;

drop policy if exists worship_report_private_read on public.worship_report_private;
create policy worship_report_private_read on public.worship_report_private
  for select using (
    public.can_read_worship_private(church_id)
    or author_id = auth.uid()
  );

drop policy if exists worship_report_private_write on public.worship_report_private;
create policy worship_report_private_write on public.worship_report_private
  for all
  using (public.can_write_worship(church_id))
  with check (public.can_write_worship(church_id) and author_id = auth.uid());

-- ── 교회와 시각은 손으로 적지 않는다 ────────────────────────────────────
--
-- church_id 는 0038 의 트리거가 글쓴이의 교회로 채운다. 화면이 보내지 않아도
-- 되고, 보내더라도 남의 교회로 적을 수는 없다(RLS 가 with check 로 막는다).

drop trigger if exists worship_meetings_set_church_id on public.worship_meetings;
create trigger worship_meetings_set_church_id before insert on public.worship_meetings
  for each row execute function public.set_church_id_from_author();

drop trigger if exists worship_reports_set_church_id on public.worship_reports;
create trigger worship_reports_set_church_id before insert on public.worship_reports
  for each row execute function public.set_church_id_from_author();

drop trigger if exists worship_report_private_set_church_id on public.worship_report_private;
create trigger worship_report_private_set_church_id before insert on public.worship_report_private
  for each row execute function public.set_church_id_from_author();

drop trigger if exists worship_meetings_set_updated_at on public.worship_meetings;
create trigger worship_meetings_set_updated_at before update on public.worship_meetings
  for each row execute function public.set_updated_at();

drop trigger if exists worship_reports_set_updated_at on public.worship_reports;
create trigger worship_reports_set_updated_at before update on public.worship_reports
  for each row execute function public.set_updated_at();

drop trigger if exists worship_report_private_set_updated_at on public.worship_report_private;
create trigger worship_report_private_set_updated_at before update on public.worship_report_private
  for each row execute function public.set_updated_at();

-- ── 들어갔는지 스스로 확인한다 ──────────────────────────────────────────
--
-- 표만 생기고 정책이나 트리거가 빠지면 「화면에는 되는데 저장이 안 된다」가
-- 되거나, 더 나쁘게는 비공개 부분이 열린 채로 남는다.
do $$
declare
  missing text[] := array[]::text[];
  p text;
begin
  foreach p in array array[
    'worship_meetings_read', 'worship_meetings_write',
    'worship_reports_read', 'worship_reports_write',
    'worship_report_private_read', 'worship_report_private_write'
  ] loop
    if not exists (select 1 from pg_policies where policyname = p) then
      missing := missing || p;
    end if;
  end loop;
  if array_length(missing, 1) is not null then
    raise exception '정책이 빠졌습니다: %', missing;
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'worship_reports_set_church_id') then
    raise exception '교회를 채우는 트리거가 빠졌습니다.';
  end if;

  raise notice '0098 적용 완료 — 예배 세 표와 정책이 준비됐습니다.';
end $$;

notify pgrst, 'reload schema';
