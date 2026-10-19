-- 전도 — 교회 전체 전도대상자 표(성만 보이고 이름은 OO).
--
-- 0090 은 대상자 표를 본인만 읽게 했고, 교회에는 이름 없는 숫자(evangelism_summary)와
-- 별명으로 나눈 중보 요청만 보였다. 교회가 「누가 어디까지 왔는지」를 한 표로 보고 싶다는
-- 요청에 따라, **성 한 글자 + OO** 로 가린 이름과 관계·걸음만 돌려주는 함수를 더한다.
--
-- 표(evangelism_targets)의 정책은 그대로 둔다 — 정책을 풀면 실명·메모가 통째로 열린다.
-- 가린 이름은 이 함수 안에서만 만들어지고, 사정(note)은 어떤 경로로도 나가지 않는다.
-- 올린 성도의 이름은 보인다(「전도자와의 관계」를 읽으려면 누가 전도자인지 알아야 한다).
--
-- 성은 첫 글자로 자른다. 두 글자 성(남궁·선우)은 한 글자만 보여 더 가려질 뿐이라
-- 사생활 쪽으로는 안전한 방향이다.

create or replace function public.evangelism_roster(target_campaign_id uuid)
returns table (
  target_id uuid,
  masked_name text,
  relation text,
  owner_name text,
  pray_on date,
  contact_on date,
  gift_on date,
  meet_on date,
  invite_on date,
  attend_on date,
  settle_on date,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    left(btrim(t.name), 1) || 'OO',
    t.relation,
    coalesce(p.username, '익명'),
    max(a.happened_on) filter (where a.kind = 'pray'),
    max(a.happened_on) filter (where a.kind = 'contact'),
    max(a.happened_on) filter (where a.kind = 'gift'),
    max(a.happened_on) filter (where a.kind = 'meet'),
    max(a.happened_on) filter (where a.kind = 'invite'),
    max(a.happened_on) filter (where a.kind = 'attend'),
    max(a.happened_on) filter (where a.kind = 'settle'),
    t.created_at
  from evangelism_targets t
  join evangelism_campaigns c on c.id = target_campaign_id
  left join profiles p on p.id = t.owner_id
  left join evangelism_actions a on a.target_id = t.id
  where t.deleted_at is null
    and t.church_id = c.church_id
    and c.church_id = public.my_church_id()
    and (t.campaign_id = c.id or t.campaign_id is null)
  group by t.id, p.username
  order by t.created_at;
$$;

revoke all on function public.evangelism_roster(uuid) from public, anon;
grant execute on function public.evangelism_roster(uuid) to authenticated;
