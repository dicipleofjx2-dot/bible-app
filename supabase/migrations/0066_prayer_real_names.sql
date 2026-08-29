-- 샬롬기도단 목록에 **이름**을 보여 준다.
--
-- 있었던 일: 홍은경 성도님이 기도제목을 올렸는데 "안 올라간다"고 하셨다.
-- 찾아보니 8월 27일 13시 27분과 31분에 **두 건 다 저장돼 있었다**. 4분 간격으로
-- 두 번 올리신 것 자체가 "눌렀는데 안 보여서 다시 쓴" 흔적이다.
--
-- 읽기 정책은 로그인만 하면 다 보이게 열려 있고 화면에도 거르는 코드가 없다.
-- 남은 것은 **글쓴이 이름**이었다. 목록에 이렇게 떴다:
--
--     조영도                      ← 이름
--     irisingod@gmail.com      ← 이메일
--     hong9885@naver.com       ← 홍은경 님 글
--
-- profiles.username 에 이메일이 그대로 들어 있는 계정이 많다(0056 주석: 82명 중
-- 65명). 자기 글이 `hong9885@naver.com` 으로 떠 있으면 목록에서 못 알아본다.
--
-- ── 0056 의 함수를 그대로 못 쓰는 이유 ──────────────────────────────
-- r2m_display_names() 는 **대표관리자만** 부를 수 있다. 그것이 맞다 — 그 함수는
-- 임의의 user_id 목록을 넣어 이름을 캐낼 수 있어서, 넓게 열면 교적부의
-- 이름·계정 대조표가 된다.
--
-- 여기서는 문을 훨씬 좁게 연다. **기도제목이나 댓글을 실제로 올린 사람의 이름만**
-- 돌려준다. 그 글은 어차피 로그인한 성도 모두에게 보이므로, "이 글을 누가 썼나"는
-- 이미 공개된 사실이다. 아무 user_id 나 넣어서 캐낼 수는 없다.

create or replace function public.prayer_author_names()
returns table (user_id uuid, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.uid,
    coalesce(
      -- 1순위: 교적부 실명
      (select m.name from members m
        where m.user_id = a.uid and m.deleted_at is null
        order by m.created_at limit 1),
      -- 2순위: 주보에 적어 둔 이름 (이메일이 아닌 것만)
      (select bp.display_name from bulletin_profiles bp
        where bp.user_id = a.uid
          and bp.display_name is not null
          and position('@' in bp.display_name) = 0
        limit 1),
      -- 3순위: 이 앱의 닉네임 (이메일이 아닌 것만)
      (select p.username from profiles p
        where p.id = a.uid and p.username is not null
          and position('@' in p.username) = 0),
      -- 4순위: 이메일 앞부분. 여기까지 오면 교적과 안 이어진 계정이다.
      -- 이메일을 통째로 보여 주는 것보다는 낫다.
      (select split_part(p.username, '@', 1) from profiles p where p.id = a.uid),
      '이름 없음'
    )
  from (
    -- **글을 올린 사람만.** 이 울타리가 이 함수를 안전하게 만든다.
    select pr.user_id as uid from prayer_requests pr
    union
    select pc.user_id from prayer_comments pc
  ) a;
$$;

revoke all on function public.prayer_author_names() from public, anon;
grant execute on function public.prayer_author_names() to authenticated;

comment on function public.prayer_author_names() is
  '샬롬기도단에 글을 올린 사람들의 표시 이름. 교적 실명 → 주보 이름 → 닉네임 → 이메일 앞부분 순.';
