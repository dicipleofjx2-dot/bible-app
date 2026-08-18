-- 데이빗바이블을 교회별로 나눈다 — 1단계: 바탕 만들기.
--
-- 지금 데이빗바이블은 한 교회를 전제로 만들어져 있다. 목자편지·공지·게시판·
-- 훈련과정 어디에도 교회 구분이 없어서, 다른 교회가 들어오면 새부대교회 글이
-- 그 교회 성도에게 그대로 보인다.
--
-- 스마트주보는 반대로 처음부터 교회별로 나뉘어 있고(churches + church_id),
-- 두 앱이 같은 데이터베이스를 쓴다. 그러니 새 체계를 만들 것 없이 스마트주보의
-- churches를 그대로 쓴다.
--
-- 이 단계에서는 화면 동작이 하나도 바뀌지 않아야 한다. 지금 있는 자료를 전부
-- 새부대교회로 채우고, 새로 들어오는 자료도 글쓴이의 교회로 자동으로 채워지게
-- 해 둔다. 앱 코드는 다음 단계에서 고친다 — 컬럼만 먼저 넣고 코드를 안 고치면
-- 저장이 막히기 때문에, 트리거로 메꿔 두는 것이 핵심이다.

-- ── 사람은 한 교회에 속한다 ─────────────────────────────────────────────
--
-- 스마트주보의 church_memberships는 "관리 권한이 있는 사람"만 들어 있다.
-- 일반 성도는 그 표에 없으므로, 프로필에 소속 교회를 따로 둔다.
alter table public.profiles add column if not exists church_id uuid
  references churches(id) on delete set null;

create index if not exists profiles_church_idx on public.profiles (church_id);

comment on column public.profiles.church_id is
  '이 사람이 속한 교회. 데이빗바이블의 교회별 내용은 이 값으로 갈린다.';

-- 지금 쓰고 계신 모든 분을 새부대교회로 채운다.
update public.profiles
set church_id = (select id from churches where slug = 'saebudae-church')
where church_id is null;

/** 지금 로그인한 사람의 교회. RLS와 트리거가 함께 쓴다. */
create or replace function public.my_church_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select church_id from profiles where id = auth.uid();
$$;

grant execute on function public.my_church_id() to authenticated, anon;

-- ── 교회에 묶이는 표들 ──────────────────────────────────────────────────
--
-- 성경 본문·통독 콘텐츠·개인 기록(묵상, 하이라이트, 통독 진도)은 교회와 무관하니
-- 건드리지 않는다. 교회마다 달라야 하는 것만 고른다.
do $$
declare
  t text;
  home uuid := (select id from churches where slug = 'saebudae-church');
begin
  foreach t in array array[
    'shepherd_letters',   -- 목자의 편지
    'notices',            -- 공지사항
    'boards',             -- 게시판
    'board_posts',        -- 게시판 글
    'shepherd_qt',        -- 목자의 큐티 나눔
    'support_settings',   -- 후원 정보
    'r2m_courses',        -- 훈련과정
    'posts',              -- 커뮤니티 글
    'prayer_requests'     -- 샬롬기도단
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists church_id uuid references churches(id) on delete cascade',
      t
    );
    execute format('update public.%I set church_id = %L where church_id is null', t, home);
    execute format('create index if not exists %I on public.%I (church_id)', t || '_church_idx', t);
  end loop;
end $$;

-- ── 새 자료는 글쓴이의 교회로 자동으로 채운다 ───────────────────────────
--
-- 앱 코드가 church_id를 보내지 않아도 되게 한다. 이 단계에서 코드를 손대지
-- 않고도 동작이 유지되는 이유가 이것이다.
create or replace function public.set_church_id_from_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.church_id is null then
    new.church_id := public.my_church_id();
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'shepherd_letters', 'notices', 'boards', 'board_posts', 'shepherd_qt',
    'support_settings', 'r2m_courses', 'posts', 'prayer_requests'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_church_id', t);
    execute format(
      'create trigger %I before insert on public.%I for each row execute function public.set_church_id_from_author()',
      t || '_set_church_id', t
    );
  end loop;
end $$;

-- ── 로그인한 사람은 자기 교회 것만 본다 ────────────────────────────────
--
-- 기존 정책을 하나하나 고치지 않고 restrictive 정책을 덧댄다. restrictive는
-- 기존 정책과 **그리고(AND)**로 묶이므로, "원래 볼 수 있던 것 중에서 우리 교회
-- 것만"이 된다. 정책이 여러 개 흩어져 있을 때 한 군데만 고치고 빠뜨리는 실수를
-- 막을 수 있다.
--
-- 로그인하지 않은 경우는 막지 않는다. 교회 홈페이지가 로그인 없이 목자편지와
-- 게시판 글을 읽어 가기 때문이다. 그쪽은 홈페이지가 자기 교회로 걸러서 부른다.
do $$
declare
  t text;
begin
  foreach t in array array[
    'shepherd_letters', 'notices', 'boards', 'board_posts', 'shepherd_qt',
    'support_settings', 'r2m_courses', 'posts', 'prayer_requests'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_church_scope', t);
    execute format(
      'create policy %I on public.%I as restrictive for select
         using (auth.uid() is null or church_id = public.my_church_id())',
      t || '_church_scope', t
    );
  end loop;
end $$;

-- ── 게시판 주소는 교회 안에서만 겹치지 않으면 된다 ──────────────────────
--
-- boards.slug가 전체에서 유일하게 걸려 있어, 다른 교회가 "은혜나눔"을 만들려고
-- 하면 막힌다. 교회별로 유일하면 충분하다.
alter table public.boards drop constraint if exists boards_slug_key;
drop index if exists boards_slug_key;
create unique index if not exists boards_church_slug_key on public.boards (church_id, slug);

-- ── 딸린 표는 부모를 따라간다 ───────────────────────────────────────────
--
-- 주차·미션·댓글처럼 부모에 매달린 것은 컬럼을 따로 두지 않는다. 부모가 이미
-- 교회에 묶여 있어 두 군데를 맞춰야 하는 부담만 늘고, 어긋나면 더 위험하다.
comment on table public.r2m_course_weeks is '교회 구분은 부모(r2m_courses.church_id)를 따른다.';
comment on table public.r2m_missions is '교회 구분은 부모(r2m_courses.church_id)를 따른다.';
comment on table public.comments is '교회 구분은 부모(posts.church_id)를 따른다.';
comment on table public.prayer_comments is '교회 구분은 부모(prayer_requests.church_id)를 따른다.';
