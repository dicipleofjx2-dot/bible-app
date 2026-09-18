# 내 컴퓨터에서 데이빗바이블 작업하기

이 문서 하나만 따라 하면 **내 컴퓨터에서 앱을 띄우고, 고치고, 배포**까지 된다.
윈도우 기준으로 적었고, 맥은 다른 부분만 따로 표시했다.

---

## 0. 한 번만 하는 준비

| 무엇 | 어디서 | 확인 |
|---|---|---|
| **Node.js LTS (22.x)** | https://nodejs.org (LTS 쪽) | `node -v` → `v22.…` |
| **Git** | https://git-scm.com/download/win | `git -v` |
| **VS Code** | https://code.visualstudio.com | — |
| 크롬 | 이미 있으면 그대로 | 웹으로 확인할 때 쓴다 |

> 안드로이드 스튜디오는 **필요 없다.** 이 앱은 웹으로 확인하고, APK 는 EAS 가
> 클라우드에서 구워 준다.

윈도우는 **PowerShell** 이나 **Git Bash** 아무 쪽이나 좋다. 아래 명령은 둘 다에서
그대로 돈다.

---

## 1. 소스 내려받기

```bash
cd C:\Users\dicip\Documents
git clone https://github.com/dicipleofjx2-dot/bible-app.git
cd bible-app
```

이미 받아 둔 게 있으면 최신으로만 맞춘다.

```bash
git fetch origin
git checkout main
git pull origin main
```

**작업 중인 가지(branch)를 볼 때**는 그 이름으로 옮긴다. 예를 들어 물품관리ON 은
아직 `main` 이 아니라 아래 가지에 있다.

```bash
git fetch origin claude/design-ui-improvement-ujulou
git checkout claude/design-ui-improvement-ujulou
```

---

## 2. 열쇠(.env) 만들기

`.env` 는 **깃에 올라가지 않는다**(`.gitignore` 에 걸려 있다). 컴퓨터마다 직접
만들어야 한다. 같은 폴더에 있는 `.env.example` 을 복사해 값만 채운다.

```bash
cp .env.example .env      # 윈도우 PowerShell: copy .env.example .env
```

| 칸 | 어디서 가져오나 |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 대시보드 → 프로젝트 → Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 같은 화면의 **anon public** 키 |
| `EXPO_PUBLIC_KAKAO_JS_KEY` | (말씀카드 공유를 쓸 때만) developers.kakao.com → 데이빗바이블 → 앱 설정 → 플랫폼 키 → JavaScript 키 |
| `EXPO_PUBLIC_VAPID_PUBLIC_KEY` | (웹 푸시를 쓸 때만) |

**주의 두 가지**
- `service_role` 키는 절대 `.env` 에 넣지 않는다. 그 키는 모든 정책을 무시한다.
  앱이 쓰는 것은 `anon` 키뿐이다.
- `.env` 를 고치면 **개발 서버를 껐다 켜야** 반영된다. Expo 는 켤 때 한 번만 읽는다.

---

## 3. 실행

```bash
npm install          # 처음 한 번, 그리고 package.json 이 바뀌었을 때
npm run web          # 브라우저로 띄우기
```

뜨면 터미널에 주소가 나온다(보통 http://localhost:8081). 크롬에서 연다.

- 폰으로 보고 싶으면 `npm start` 뒤 QR 코드를 **Expo Go** 앱으로 찍는다.
  (단, 이 앱은 성경 데이터를 기기에 두는 구조라 Expo Go 에서 안 되는 화면이 있다.
  확실한 것은 웹이나 APK 다.)
- **8081 이 이미 쓰이고 있다**고 하면 다른 번호로 연다: `npx expo start --web --port 8090`

성경 본문 데이터(`assets/bible-data/bible.db`, 30MB)는 이미 깃에 들어 있다.
따로 만들 필요가 없다.

---

## 4. 고치기 전에 · 고친 뒤에

```bash
npx tsc --noEmit     # 타입 검사. 이 리포는 이것이 사실상 유일한 자동 검사다
npm run lint         # 거슬리는 것 훑기(경고는 예전 것이 여럿 남아 있다)
```

`tsc` 가 깨끗하면 대개 화면도 뜬다. **이 리포에는 자동 테스트가 없다** — 화면은
직접 열어 눌러 봐야 한다.

---

## 5. 데이터베이스 바꾸는 일(마이그레이션)

`supabase/migrations/` 의 `.sql` 파일은 **저절로 실행되지 않는다.** 번호 순서대로
사람이 직접 돌린다.

1. Supabase 대시보드 → **SQL Editor** → New query
2. 아직 안 돌린 파일의 내용을 통째로 붙여넣기
3. **Run**

지금 기준으로 **`0084_inventory.sql`(물품관리ON)이 아직 실행 전**이다. 이걸 돌리기
전에는 물품관리 화면이 열려도 아무것도 저장되지 않는다(표가 없다).

돌아갔는지 확인하려면(로그인 없이):

```bash
curl -s "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/inv_orgs?select=id&limit=1" \
  -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_ANON_KEY"
```

표가 없으면 `relation "public.inv_orgs" does not exist`, 있으면 `[]` 가 온다.
(빈 배열이 정상이다 — 남의 줄은 정책이 가린다.)

---

## 6. 올리고 배포하기

```bash
git add -A
git commit -m "무엇을 왜 바꿨는지"
git push origin <지금-가지-이름>
```

- **`main` 에 올라가면 Vercel 이 알아서 웹을 배포한다**(https://dicipleofjx-bible.vercel.app).
  빠르고 공짜다. 쿼터 걱정은 EAS(앱 빌드)에만 있다.
- 작업 가지에서 `main` 으로 합치는 것은 GitHub 에서 Pull request 로 한다.
- 환경 변수를 Vercel 에서 바꿨다면 **Production 배포를 다시 한 번** 눌러야 한다.
  이미 만들어진 배포에는 소급되지 않는다.

---

## 7. 앱(APK) 굽기 — 필요할 때만

`app.json` 의 플러그인·권한·아이콘을 바꿨다면 웹만 배포해서는 폰 앱에 안 들어간다.
그때만 굽는다.

```bash
npx eas login                 # expo.dev 계정
npm run build:android         # preview 프로필, APK
```

끝나면 `expo.dev/.../builds/<id>` 주소가 나온다. 폰에서 그 주소를 열어 설치한다.
**무료 플랜은 한 달 빌드 수가 정해져 있다** — 고칠 것을 모아 두었다가 한 번에 굽는다.

> 물품관리ON 은 카메라 권한 문구가 `app.json` 에 새로 들어갔다. **폰에서 카메라로
> 찍어 등록하려면 APK 를 한 번 다시 구워야 한다.** 웹은 배포만 하면 된다.

---

## 8. 자주 막히는 곳

| 증상 | 까닭과 해결 |
|---|---|
| `npm install` 이 503 으로 죽는다 | 레지스트리가 잠깐 막힌 것. `npm install --prefer-offline --fetch-retries=5` 로 다시 |
| 화면은 뜨는데 로그인·저장이 안 된다 | `.env` 가 없거나 서버를 안 껐다 켠 것 |
| 표가 없다는 오류 | 5번 마이그레이션을 안 돌린 것 |
| 포트 8081 이 이미 쓰인다 | 다른 창에서 이미 켜 둔 것. `--port 8090` 으로 따로 켠다 |
| 사진이 안 보인다 | 비공개 보관함이라 서명 주소가 필요하다. 로그인 상태인지, 그 관리 공간의 구성원인지 확인 |
| PowerShell 이 스크립트를 막는다 | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |

---

## 9. (선택) 컴퓨터에서 Claude Code 쓰기

웹이 아니라 내 컴퓨터의 터미널에서 같이 작업하고 싶다면:

```bash
npm install -g @anthropic-ai/claude-code
cd C:\Users\dicip\Documents\bible-app
claude
```

리포 안의 `CLAUDE.md` · `AGENTS.md` · `HANDOFF.md` 를 알아서 읽는다. 지금까지의
판단과 함정이 전부 `HANDOFF.md` 에 적혀 있으니, **무엇을 고치기 전에 그 문서부터
읽는 것**이 가장 빠르다.

---

## 한 장 요약

```bash
git clone https://github.com/dicipleofjx2-dot/bible-app.git
cd bible-app
cp .env.example .env     # Supabase URL / anon key 채우기
npm install
npm run web              # http://localhost:8081
npx tsc --noEmit         # 고친 뒤 확인
git push origin main     # 웹은 자동 배포
```
