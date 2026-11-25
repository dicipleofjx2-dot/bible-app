# 웹 배포: Vercel → 호스팅어

데이빗바이블 웹 버전을 `bible.dgaiworks.com`(호스팅어)에서 서비스한다. 앱은 정적
내보내기(`expo export -p web`)라 서버가 필요 없고, 데이터는 계속 Supabase 가 맡는다.

## 구성
- `scripts/gen-htaccess.mjs` — dist 를 읽어 `.htaccess`(깔끔한 주소·동적 화면·https·압축·캐시)를
  만든다. `vercel.json` 의 rewrites 를 대신한다. 동적 화면이 새로 생겨도 규칙을 손으로 보태지 않는다.
- `.github/workflows/deploy-hostinger.yml` — 빌드 → FTPS 업로드. 처음엔 **수동 실행만**.

## 한 번만 하는 설정
1. 호스팅어 hPanel → 도메인 → 서브도메인 → `bible` 추가 (`bible.dgaiworks.com`).
   SSL(무료 Let's Encrypt)이 켜졌는지 확인.
2. hPanel → 파일 → FTP 계정에서 이 서브도메인 폴더만 쓰는 FTP 계정을 만든다.
3. GitHub 저장소 → Settings → Secrets and variables → Actions → Secrets 에 넣는다.
   (값은 채팅에 붙이지 말고 여기에 직접 입력한다)

   | 이름 | 값 |
   |---|---|
   | `EXPO_PUBLIC_SUPABASE_URL` | 로컬 `.env` 와 같은 값 |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 로컬 `.env` 와 같은 값 |
   | `EXPO_PUBLIC_KAKAO_JS_KEY` | (쓰면) 카카오 JavaScript 키 |
   | `EXPO_PUBLIC_VAPID_PUBLIC_KEY` | (쓰면) 웹 푸시 공개키 |
   | `HOSTINGER_FTP_HOST` | FTP 호스트 |
   | `HOSTINGER_FTP_USER` | FTP 사용자 |
   | `HOSTINGER_FTP_PASSWORD` | FTP 비밀번호 |
   | `HOSTINGER_FTP_DIR` | 서브도메인 문서 루트(보통 `/public_html/` 또는 `/domains/bible.dgaiworks.com/public_html/`) — FTP 계정 기준 경로 |

4. Actions 탭 → Deploy to Hostinger → Run workflow. 첫 업로드는 44MB 라 몇 분 걸린다.

## 새 주소로 바뀔 때 같이 고칠 것
- Supabase → Authentication → URL Configuration: Site URL 과 Redirect URLs 에 새 주소 추가.
- 카카오 개발자 콘솔: 앱 대표 도메인·사이트 도메인에 새 주소 추가 (말씀카드 공유).
- 개인정보처리방침 주소를 쓰는 곳(스토어 등록 정보 등).
- 사용자가 홈 화면에 추가해 둔 PWA 는 새 주소로 다시 추가해야 한다.

## 확인 목록 (올린 뒤 직접 눌러 볼 것)
- `/` · `/read` · `/community` (깔끔한 주소)
- `/post/아무숫자` · `/plans/아무글자` · `/library/아무글자/read` (동적 화면)
- 없는 주소 → 안내 화면(404)
- http 로 들어가도 https 로 넘어가는지
- 새로고침(F5)해도 같은 화면이 나오는지
- 로그인·성경 본문이 열리는지 (성경 DB 는 30MB 라 첫 로딩이 느릴 수 있다)

## 자동 배포로 바꾸려면
성공을 확인한 뒤 저장소 Settings → Secrets and variables → Actions → **Variables** 에
`DEPLOY_HOSTINGER` = `true` 를 넣는다. 그러면 main 에 푸시할 때마다 올라간다.
그때 Vercel 은 연결을 끊는다(이중 배포 방지).

## 되돌리기
Vercel 프로젝트를 지우기 전까지는 옛 주소가 그대로 돌아간다. 문제가 있으면 새 주소를
쓰지 않으면 된다.
