-- 후원 화면(쿠팡파트너스 링크 / 후원계좌 정보)의 관리자 편집 가능한 설정값.
-- 코드에 하드코딩하면 계좌번호가 바뀔 때마다 배포가 필요하므로, 싱글턴 행
-- 하나를 관리자가 편집하는 방식으로 둔다 (id는 항상 'default' 고정값).

create table if not exists support_settings (
  id text primary key default 'default' check (id = 'default'),
  coupang_url text not null default '',
  bank_name text not null default '',
  bank_account text not null default '',
  bank_holder text not null default '',
  updated_at timestamptz not null default now()
);

insert into support_settings (id) values ('default')
on conflict (id) do nothing;

alter table support_settings enable row level security;

create policy "public can read support settings" on support_settings
  for select using (true);

create policy "admin can update support settings" on support_settings
  for update using (exists (select 1 from profiles where id = auth.uid() and is_admin));
