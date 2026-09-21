# 살림ON 배포

**이 앱은 데이빗바이블과 코드를 한 줄도 공유하지 않는다.** 지금은 `bible-app`
리포의 `salim-on/` 폴더에 들어 있을 뿐이고, 자기 `package.json`·`app.json`·
`vercel.json` 으로 혼자 빌드된다.

> **리포를 따로 못 만들었다.** 깃허브 앱에 리포 생성 권한이 없어
> (`POST /user/repos` → 403) 세션에서 `salim-on` 리포를 만들지 못했다.
> 물품관리ON 때와 같은 자리다. 아래 **② 번**이 그 해결이다.

## 0. 먼저 할 일 — 표 만들기

`supabase/migrations/0001_household.sql` 을 Supabase SQL 편집기에서 실행한다.
**실행 전에는 배포해도 화면만 뜨고 아무것도 저장되지 않는다.**

데이빗바이블과 **같은 Supabase 프로젝트**(`bhqbrkeoiyhnmdgvofvy`)를 쓴다.
표만 `home_*` 로 따로 있고, 계정은 공유된다.

## 1. 지금 바로 배포하기 — 폴더째 올리기

리포를 새로 만들지 않고 이 폴더만 배포한다. Vercel 에 **Root Directory** 설정이
있어서 가능하다.

1. vercel.com → **Add New → Project** → `dicipleofjx2-dot/bible-app` 가져오기
2. **Root Directory** 를 `salim-on` 으로 지정 *(이것을 빠뜨리면 데이빗바이블이 배포된다)*
3. **Branch** 를 `claude/household-management-app-xarfby` 로
4. **Environment Variables** 에 둘을 넣는다 — 없으면 로그인 화면에서 멈춘다

   | 이름 | 값 |
   |---|---|
   | `EXPO_PUBLIC_SUPABASE_URL` | 데이빗바이블 `.env` 의 그 값 |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 데이빗바이블 `.env` 의 그 값 |

5. Deploy

`vercel.json` 이 빌드 명령(`npx expo export -p web`)과 결과 폴더(`dist`),
`/chore/:id` 재작성 규칙까지 들고 있으므로 따로 설정할 것이 없다.

**환경변수를 나중에 더하면 이미 구운 배포에는 반영되지 않는다.** Production 을
다시 배포해야 한다(데이빗바이블에서 한 번 걸려 넘어진 자리다).

## 2. 제 리포로 떼어 내기 (권장)

물품관리ON(`dicipleofjx2-dot/inventory-on`)과 같은 모양으로 만든다.

1. 깃허브에서 **새 비공개 리포 `salim-on`** 을 만든다(README 없이 빈 채로)
2. 이 폴더를 그 리포의 **뿌리**로 올린다

   ```bash
   cd salim-on
   git init -b main
   git add -A
   git commit -m "살림ON — 가사관리 첫 판"
   git remote add origin https://github.com/dicipleofjx2-dot/salim-on.git
   git push -u origin main
   ```

3. Vercel 에서 그 리포를 가져온다. **Root Directory 는 비워 둔다**(이미 뿌리다).
   환경변수는 ①의 표와 같다.

리포를 만들어 두면 이 세션에서 바로 밀어 넣을 수도 있다 — 이름만 알려 주면 된다.

## 3. 앱(안드로이드)으로 굽기

```bash
npx eas build --platform android --profile preview
```

`eas.json` 이 들어 있다. **EAS 무료 플랜 빌드 몫을 확인하고 굽는다**(데이빗바이블
쪽에서 한 달 몫을 하루에 태운 적이 있다).

## 배포 전 점검

```bash
npm install
npm run typecheck      # tsc --noEmit
npm run build:web      # expo export -p web — 11개 경로가 정적 렌더링까지 통과해야 한다
```

`dist/` 가 만들어지면 끝이다. 이 셋은 이 리포에서 이미 통과한 상태로 올려 두었다.
