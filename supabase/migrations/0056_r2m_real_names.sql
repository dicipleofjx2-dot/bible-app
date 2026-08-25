-- R2M 리더·멤버 지정 화면에 **이름**을 보여 준다.
--
-- 지금은 profiles.username 을 그대로 쓰는데 그 칸에는 대부분 이메일 주소가
-- 들어 있다(0049 주석: 82명 중 65명). 리더를 세우고 멤버를 배정하는 자리에서
-- `kim1234@naver.com` 만 늘어놓으면 누가 누구인지 알 수가 없다.
--
-- 실명은 교적부(members.name)에 있다. 그런데 그 표는 교적 열람 권한이 있어야
-- 읽히고(0006), R2M 리더는 대부분 그 권한이 없는 평신도다. 그래서 이름만
-- 돌려주는 함수를 따로 연다 — 표 전체를 열지 않고 필요한 것만 준다.

create or replace function public.r2m_display_names(user_ids uuid[])
returns table (user_id uuid, display_name text)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  -- 이름과 계정을 잇는 정보다. 넓게 열면 교적부 이름·계정 대조표가 된다.
  -- **대표관리자만** 본다(사용자 결정). 리더에게는 예전처럼 닉네임이 나간다 —
  -- 리더를 세우고 멤버를 배정하는 것은 대표관리자가 하는 일이다.
  if not exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true) then
    raise exception '대표관리자만 볼 수 있습니다.';
  end if;

  return query
  select
    u.id,
    coalesce(
      -- 1순위: 교적부 실명
      (select m.name from members m
        where m.user_id = u.id and m.deleted_at is null
        order by m.created_at
        limit 1),
      -- 2순위: 이메일이 아닌 닉네임
      (select p.username from profiles p
        where p.id = u.id and p.username is not null and position('@' in p.username) = 0),
      -- 3순위: 이메일 앞부분만. 여기까지 오면 교적과 안 이어진 계정이라
      -- 관리자가 누구인지 짐작할 실마리가 그것뿐이다.
      (select split_part(p.username, '@', 1) from profiles p where p.id = u.id),
      '이름 없음'
    ) as display_name
  from unnest(user_ids) as u(id);
end;
$$;

comment on function public.r2m_display_names(uuid[]) is
  'R2M 화면에 쓸 이름. 교적부 실명 → 이메일 아닌 닉네임 → 이메일 앞부분 순. 관리자와 R2M 리더만 부를 수 있다.';

revoke all on function public.r2m_display_names(uuid[]) from public;
grant execute on function public.r2m_display_names(uuid[]) to authenticated;

notify pgrst, 'reload schema';
