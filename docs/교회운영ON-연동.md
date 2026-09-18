# 교회운영ON 에 물품관리ON 붙이기

두 앱은 **같은 Supabase 프로젝트**를 쓴다. 표만 다르다(`inv_*`). 그래서 계정을
새로 만들 필요가 없고, 권한도 이 앱의 정책(`inv_role`)이 그대로 판정한다.

## 1. 교회를 관리 공간에 매단다

`0002_church_link.sql` 을 실행하면 `inv_orgs.church_slug` 가 생긴다. 교회운영ON 이
쓰는 슬러그를 그대로 적는다.

```sql
update public.inv_orgs set church_slug = 'sbd' where id = '<관리 공간 id>';
```

**이건 여는 값이 아니다.** 정책은 그대로 `inv_can_read` 하나뿐이라, 슬러그를
안다고 남의 교회 물품이 열리지 않는다. 구성원이 아니면 빈 목록이 온다.

## 2. 링크 걸기

| 목적 | 주소 |
|---|---|
| 그 교회의 물품으로 바로 | `https://<이 앱 주소>/church/<슬러그>` |
| 특정 관리 공간으로 | `https://<이 앱 주소>/<관리공간 id>` |
| 물품 찾기 화면으로 | `https://<이 앱 주소>/<관리공간 id>/search?q=마이크` |

관리 공간이 하나면 `/church/<슬러그>` 가 곧장 그 공간으로 들어간다. 여럿이면
고르는 화면이 뜬다.

## 3. 로그인 이어받기 (선택)

주소(origin)가 다르면 브라우저 저장소가 갈라져, 교회운영ON 에서 로그인해도 이
앱은 로그아웃 상태다. 한 번 더 로그인하게 두어도 길은 끊기지 않지만, 매끄럽게
넘기려면 토큰을 **우물정(#) 뒤에** 실어 `/handoff` 로 보낸다.

```js
// 교회운영ON 쪽
const { data } = await supabase.auth.getSession();
const s = data.session;
if (s) {
  location.href =
    `https://<이 앱 주소>/handoff#access_token=${s.access_token}` +
    `&refresh_token=${s.refresh_token}&next=${encodeURIComponent('/church/sbd')}`;
}
```

- **`?` 가 아니라 `#` 인 이유**: 조각(fragment)은 서버로 전송되지 않는다. 질의에
  실으면 Vercel 접근 기록과 중간 장비 로그에 토큰이 그대로 남는다.
- 이 앱은 세션을 연 뒤 **주소창에서 토큰을 지운다**(`history.replaceState`).
  남겨 두면 뒤로 가기와 방문 기록에 남는다.
- 토큰 없이 `/handoff?next=/church/sbd` 로 보내도 된다. 그때는 로그인 화면으로
  넘기고, 로그인하면 그 자리로 간다.

## 4. iframe 으로 품는 경우

- 이 앱은 프레임 안에서도 그려진다. 다만 **카메라 촬영은 프레임 안에서 막히는
  브라우저가 있다** — 「촬영」이 아무 반응이 없으면 새 탭으로 열어 준다.
- 로그인 이어받기는 iframe 안에서 더 자주 막힌다(서드파티 저장소 차단). 프레임
  안에서 쓸 생각이면 **새 탭으로 여는 쪽**을 기본으로 두는 편이 낫다.

## 5. 권한을 저쪽에서 주고 싶을 때

구성원 표는 `inv_members(org_id, user_id, role)` 이고, 넣고 빼는 것은 이 앱의
관리자(대표·공간 관리자)만 할 수 있다. 교회운영ON 에서 직원을 담당자로 올리고
싶다면, 그쪽 서버에서 `service_role` 로 이 표에 직접 넣으면 된다.

```sql
insert into public.inv_members (org_id, user_id, role, display_name)
values ('<관리 공간 id>', '<auth.users.id>', 'keeper', '김집사')
on conflict (org_id, user_id) do update set role = excluded.role;
```

등급은 `manager`(공간 관리자) · `keeper`(담당자) · `member`(일반) ·
`viewer`(열람 전용) 넷이다. 대표 관리자는 `inv_orgs.owner_id` 가 정한다.
