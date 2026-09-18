# 내 컴퓨터에서 물품관리ON 작업하기

윈도우 기준으로 적었다. 맥도 명령은 거의 같다.

## 0. 준비 (한 번만)

| 무엇 | 어디서 | 확인 |
|---|---|---|
| Node.js LTS (22.x) | https://nodejs.org | `node -v` |
| Git | https://git-scm.com | `git -v` |
| VS Code | https://code.visualstudio.com | — |

안드로이드 스튜디오는 필요 없다. 웹으로 확인하고 APK 는 EAS 가 클라우드에서 굽는다.

## 1. 내려받아 띄우기

```bash
git clone <이 리포 주소>
cd inventory-on
cp .env.example .env      # 윈도우: copy .env.example .env
npm install
npm run web               # http://localhost:8081
```

`.env` 에 넣을 값은 **데이빗바이블과 같은 것**이다(같은 Supabase 프로젝트를 쓴다).
Supabase 대시보드 → Settings → API 의 Project URL 과 **anon public** 키.

> `service_role` 키는 절대 넣지 않는다. 그 키는 모든 정책을 무시한다.
> `.env` 를 고치면 개발 서버를 껐다 켜야 반영된다.

## 2. 고친 뒤

```bash
npm run typecheck     # tsc --noEmit — 이 리포의 유일한 자동 검사다
npm run build:web     # 정적 내보내기가 되는지 (배포 전에 한 번)
```

자동 테스트는 없다. 화면은 직접 눌러 봐야 한다.

## 3. 데이터베이스

`supabase/migrations/` 를 번호 순서대로 Supabase SQL Editor 에 붙여넣고 Run.

- `0001_inventory.sql` — 표와 정책. **이미 실행돼 있다**(데이빗바이블에서
  `0084_inventory.sql` 이라는 이름으로 돌렸다). 다시 돌려도 안전하다
  (`if not exists`/`drop policy if exists` 로 적혀 있다).
- `0002_church_link.sql` — 교회운영ON 연동용 칸. 붙일 때 돌린다.

## 4. 배포 (웹)

Vercel 에 이 리포를 새 프로젝트로 연결한다.

1. vercel.com → Add New → Project → 이 리포 선택
2. Framework Preset: **Other** (설정은 `vercel.json` 에 들어 있다)
3. Environment Variables 에 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` 추가
4. Deploy

주소를 정하고 나면 **Supabase → Authentication → URL Configuration → Redirect URLs**
에 `https://<새 주소>/**` 를 더해 둔다. 안 그러면 메일 확인 링크가 딴 데로 튄다.

> 환경 변수를 바꾸면 **Production 배포를 다시 눌러야** 한다. 이미 만들어진
> 배포에는 소급되지 않는다.

## 5. 앱(APK)

```bash
npx eas login
npm run build:android
```

끝나면 나오는 `expo.dev/.../builds/<id>` 주소를 폰에서 열어 설치한다.
무료 플랜은 한 달 빌드 수가 정해져 있으니 고칠 것을 모아 한 번에 굽는다.

## 6. 자주 막히는 곳

| 증상 | 까닭 |
|---|---|
| 로그인은 되는데 목록이 비어 있다 | 그 관리 공간의 구성원이 아니다. 정책이 가린 것이지 오류가 아니다 |
| 표가 없다는 오류 | 마이그레이션을 안 돌렸다 |
| 사진이 안 보인다 | 비공개 통이라 서명 주소가 필요하다. 로그아웃 상태이거나 구성원이 아니다 |
| 카메라가 반응이 없다 | iframe 안에서는 막는 브라우저가 있다. 새 탭으로 연다 |
| `npm install` 이 503 | `npm install --prefer-offline --fetch-retries=5` 로 다시 |
