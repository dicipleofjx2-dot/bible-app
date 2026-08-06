-- 계좌이체 + 관리자 수동확인 방식의 결제. 포트원/토스 같은 PG사는 사업자등록과
-- 심사에 시간이 걸려서, 그 전까지 실제로 돈을 받을 수 있는 유일한 경로다.
-- 흐름: 사용자가 후원계좌(support_settings, 0028)로 입금 → 앱에서 "입금했어요"를
-- 누르며 입금자명을 남김 → pending 행 생성 → 관리자가 통장에서 확인하고 승인 →
-- paid/active로 바뀌며 열람 권한이 열린다.
--
-- ⚠️ 이 마이그레이션의 핵심은 0021_personal_library.sql의 구멍을 막는 것이다.
-- 거기 있던 "manage own subscription" 정책은 for all + user_id만 확인해서,
-- 누구나 클라이언트에서 status:'active' 행을 직접 insert 하면 월 5,000원짜리
-- 구독전용 콘텐츠를 공짜로 열람할 수 있었다. 실제로 앱의 "정기후원 시작하기"
-- 버튼이 정확히 그 동작을 하고 있었다 (결제가 전혀 일어나지 않음).

-- ============================================================
-- 1. 컬럼 추가 — 입금 대조에 필요한 정보
-- ============================================================

-- 통장에 찍히는 이름은 앱 계정 이름과 다를 수 있어서(가족 명의 등) 따로 받는다.
alter table purchases add column if not exists depositor_name text not null default '';
alter table purchases add column if not exists approved_at timestamptz;
alter table purchases add column if not exists approved_by uuid references auth.users(id);

alter table subscriptions add column if not exists depositor_name text not null default '';
alter table subscriptions add column if not exists amount integer not null default 5000;
alter table subscriptions add column if not exists requested_at timestamptz not null default now();
alter table subscriptions add column if not exists approved_at timestamptz;
alter table subscriptions add column if not exists approved_by uuid references auth.users(id);

-- 구독에도 '입금 확인 대기' 상태가 필요하다.
alter table subscriptions drop constraint if exists subscriptions_status_check;
alter table subscriptions add constraint subscriptions_status_check
  check (status in ('pending', 'active', 'canceled', 'past_due'));

-- 구매에는 '거절' 상태가 필요하다. 입금이 확인되지 않은 신청을 'refunded'로
-- 적으면 실제로 환불한 건과 구분이 안 되므로 별도 상태로 둔다.
alter table purchases drop constraint if exists purchases_status_check;
alter table purchases add constraint purchases_status_check
  check (status in ('pending', 'paid', 'refunded', 'rejected'));

-- 한 사람이 대기중/활성 구독을 동시에 여러 개 갖지 못하게 막는다. 해지된
-- (canceled) 과거 기록은 남겨야 하므로 부분 유니크 인덱스를 쓴다.
create unique index if not exists subscriptions_one_open_per_user
  on subscriptions (user_id)
  where status in ('pending', 'active');

-- ============================================================
-- 2. 이미 공짜로 켜져 있던 구독 정리
-- ============================================================
-- 지금까지 활성화된 구독은 단 한 건도 결제를 거치지 않았다(위 설명 참고).
-- 그대로 두면 유료 콘텐츠가 계속 무료로 열린다. 삭제하지 않고 pending으로
-- 되돌려서 관리자 입금확인 목록에 남긴다 — 실제로 후원 의사가 있던 분이라면
-- 관리자가 확인 후 승인해줄 수 있고, 아니면 거절하면 된다.
update subscriptions
  set status = 'pending',
      depositor_name = case when depositor_name = '' then '(결제 연동 전 체험용)' else depositor_name end
  where status = 'active';

-- 같은 이유로, 혹시 DEV ONLY 정책을 켜둔 채 만들어진 paid 구매가 있다면
-- 관리자가 다시 확인하도록 pending으로 되돌린다. 승인 이력(approved_at)이
-- 있는 건은 정상 승인이므로 건드리지 않는다.
update purchases
  set status = 'pending',
      depositor_name = case when depositor_name = '' then '(결제 연동 전 체험용)' else depositor_name end
  where status = 'paid' and approved_at is null;

-- ============================================================
-- 3. 구독 RLS 재작성 — 여기가 실제로 구멍을 막는 부분
-- ============================================================

drop policy if exists "manage own subscription" on subscriptions;

-- 0021의 주석 처리된 "DEV ONLY" 정책이 혹시 수동으로 켜져 있었다면 함께 제거한다.
-- 그 정책이 살아 있으면 클라이언트가 자기 구매를 직접 paid로 바꿀 수 있어서,
-- 아래 관리자 승인 절차를 통째로 우회하게 된다.
drop policy if exists "DEV ONLY client can mark own purchase paid" on purchases;

-- 거절된 신청을 사용자가 다시 올릴 수 있어야 한다(입금자명 오타 등). 변경 후
-- 상태는 여전히 pending으로만 제한되므로 스스로 paid를 만들 수는 없다.
drop policy if exists "update own pending purchase" on purchases;
create policy "update own pending purchase" on purchases
  for update using (auth.uid() = user_id and status in ('pending', 'rejected'))
  with check (auth.uid() = user_id and status = 'pending');

-- 사용자는 자기 구독을 'pending'으로만 신청할 수 있다. 'active'로 바로 넣는 건
-- with check에서 막힌다.
create policy "insert own pending subscription" on subscriptions
  for insert with check (auth.uid() = user_id and status = 'pending');

-- 사용자가 스스로 할 수 있는 유일한 상태 변경은 해지다. using은 변경 전 행,
-- with check는 변경 후 행에 적용되므로 pending/active → canceled 한 방향만 열린다.
create policy "cancel own subscription" on subscriptions
  for update using (auth.uid() = user_id and status in ('pending', 'active'))
  with check (auth.uid() = user_id and status = 'canceled');

-- ============================================================
-- 4. 관리자 승인 권한
-- ============================================================
-- 0019_admin_can_delete_rooms.sql 등에서 이미 쓰는 profiles.is_admin 패턴을 그대로 따른다.

create policy "admin can read all purchases" on purchases
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin can update purchases" on purchases
  for update using (exists (select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin can read all subscriptions" on subscriptions
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin can update subscriptions" on subscriptions
  for update using (exists (select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin));

-- 신청자 이름 표시는 profiles를 따로 조회해서 붙인다. profiles는 0001_init.sql의
-- "profiles are viewable by everyone" 정책으로 이미 읽을 수 있으므로 새 정책이
-- 필요 없다 (profiles 정책 안에서 profiles를 다시 조회하면 무한 재귀가 난다 —
-- 0007_fix_room_members_recursion.sql에서 겪은 것과 같은 문제).
-- purchases/subscriptions.user_id는 auth.users를 참조하고 있어 PostgREST가
-- profiles로 자동 조인을 걸지 못하는 점도 같은 이유로 클라이언트에서 처리한다.
