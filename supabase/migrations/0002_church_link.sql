-- 교회운영ON 연동 — 관리 공간을 교회에 매단다.
--
-- 교회운영ON 은 이 앱의 관리 공간 id 를 모른다. 아는 것은 자기 쪽 교회 슬러그
-- 뿐이다. 그래서 그 슬러그를 여기 적어 두고, `/church/<슬러그>` 로 들어오면
-- 찾아 들어가게 한다.
--
-- **여는 값이 아니다.** 정책은 그대로 inv_can_read 하나뿐이라, 슬러그를 안다고
-- 남의 교회 물품이 열리지 않는다. 구성원이 아니면 빈 목록이 온다.

alter table public.inv_orgs
  add column if not exists church_slug text;

create index if not exists inv_orgs_church_idx
  on public.inv_orgs (church_slug)
  where church_slug is not null;
