-- 팝업에 「오늘의 말씀카드」 자리.
--
-- 매 주일 설교로 만든 말씀카드(주중말씀 공유카드)를 데이빗바이블 첫 화면 팝업에 건다.
-- 새 표를 만들지 않고 popup_notices 에 kind 한 칸만 더한다 — 띄우는 길(기간·교회·
-- 「오늘 하루 보지 않기」)이 이미 있다.
--
-- publish_word_card_popup: 다른 앱(말씀광산·스마트주보)이 부르는 한 길.
--   ① 그 교회에서 살아 있는 팝업을 **모두 내리고** ② 말씀카드 팝업 하나를 7일 동안 건다.
--   두 걸음을 화면에서 따로 부르면 사이에서 끊길 때 팝업이 둘 뜨거나 하나도 안 뜬다.

alter table popup_notices add column if not exists kind text not null default 'notice';
alter table popup_notices drop constraint if exists popup_notices_kind_check;
alter table popup_notices add constraint popup_notices_kind_check check (kind in ('notice', 'word_card'));

create or replace function public.publish_word_card_popup(
  p_image_url text,
  p_title text default '오늘의 말씀카드',
  p_body text default null,
  p_link_url text default null,
  p_days integer default 7
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church uuid := public.my_church_id();
  v_id uuid;
begin
  if v_church is null or not public.can_manage_church_content(v_church) then
    raise exception '말씀카드를 팝업에 올릴 권한이 없습니다.';
  end if;
  if coalesce(btrim(p_image_url), '') = '' then
    raise exception '카드 그림 주소가 비어 있습니다.';
  end if;

  update popup_notices set is_active = false where church_id = v_church and is_active;

  insert into popup_notices (church_id, kind, title, body, image_url, link_url, starts_at, ends_at, is_active)
  values (
    v_church, 'word_card',
    coalesce(nullif(btrim(p_title), ''), '오늘의 말씀카드'),
    nullif(btrim(coalesce(p_body, '')), ''),
    p_image_url,
    nullif(btrim(coalesce(p_link_url, '')), ''),
    now(),
    now() + make_interval(days => greatest(coalesce(p_days, 7), 1)),
    true
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.publish_word_card_popup(text, text, text, text, integer) from public, anon;
grant execute on function public.publish_word_card_popup(text, text, text, text, integer) to authenticated;

notify pgrst, 'reload schema';
