# 데이빗스톤 성장ON — 작업 노트

> 기획서(「데이빗스톤 성장기록 앱 통합 기획서」) 1단계 MVP 를 데이빗바이블 안에
> 넣은 것이다. 브랜치 `claude/systematic-fast-development-3cb6og`.

## 1. 컴퓨터에서 이어 작업하기

```bash
git fetch origin claude/systematic-fast-development-3cb6og
git checkout claude/systematic-fast-development-3cb6og
npm install
cp .env.example .env        # EXPO_PUBLIC_SUPABASE_URL / ANON_KEY 를 채운다
npm run web                 # http://localhost:8081
npx tsc --noEmit            # 기존 오류 1건(@/global.css) 말고 새 오류가 없어야 한다
```

**먼저 할 일 — 마이그레이션 실행.** **실행 전에는 화면이 열려도 아무것도
저장되지 않는다(표가 없다).** 두 번 실행해도 터지지 않게 `if not exists` /
`drop policy if exists` 로 감쌌다. 세 가지 길이 있다.

**① 명령 한 줄 (권함).** 580줄을 손으로 붙여 넣다 한 줄이 잘리면 표 하나가
빠진 채로 돌아간다. 파일을 그대로 보내는 실행기를 두었다:

```bash
# https://supabase.com/dashboard/account/tokens 에서 토큰을 만들어
# .env 에 SUPABASE_ACCESS_TOKEN=sbp_... 한 줄을 더한 뒤 (git 에 안 올라간다)
node scripts/apply-migration.mjs 0084_growth_school.sql
```

실행 뒤 표가 정말 섰는지 되물어서 이름을 찍어 준다. 끝나면 토큰은 지워도 된다.

**② Claude 가 대신 실행.** 토큰을 대화에 붙여넣지 않고, claude.ai/code 의
**환경 설정 → API credentials** 에 걸어 두면 프록시가 요청이 VM 을 떠난 뒤
헤더를 붙인다 — 세션은 토큰을 한 번도 보지 못한다. 자세한 절차는 아래
「클라우드 세션에서 실행하기」. 그때 Claude 가 부르는 명령은:

```bash
node scripts/apply-migration.mjs 0084_growth_school.sql --proxy-auth --yes
```

**③ 손으로.** `supabase/migrations/0084_growth_school.sql` 전체를 Supabase
SQL Editor 에 붙여 넣고 한 번 실행한다.

### 클라우드 세션에서 실행하기 (②의 절차)

claude.ai/code 의 클라우드 세션은 기본(**Trusted**)으로 Supabase 에 나갈 수
없다 — `api.supabase.com` 이 허용 목록에 없어 403 이 난다. 둘 중 하나를 한다.

- **API credentials (권함, Pro·Max)**: claude.ai/code → 환경 선택기 →
  이미 있는 환경의 설정 아이콘 → **Update cloud environment** →
  **API credentials** → **Add credential**
  · Credential type: **Bearer**
  · Allowed websites: `api.supabase.com`
  · Custom headers: 이름 `Authorization`, 접두사 `Bearer`, 값에 Supabase 토큰
  → **Connect**. 이 호스트는 네트워크 등급과 무관하게 열리고, **값은 저장 뒤
  다시 볼 수 없다**(세션도 못 본다).
- **네트워크만 여는 경우**: 같은 대화상자의 **Network access** 를 **Custom**
  으로 바꾸고 **Allowed domains** 에 `api.supabase.com` 을 넣는다. 이때는
  토큰을 세션에 따로 줘야 하므로 첫 번째가 낫다.

끝나면 새 세션에서 「0084 실행해줘」라고 하면 된다.

실행됐는지 확인:

```bash
curl -s "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/growth_schools?select=id&limit=1" \
  -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_ANON_KEY"
```

`[]` 가 오면 표가 선 것이고, `relation ... does not exist` 가 오면 아직이다.

### 첫 왕복 (사람이 해 줘야 하는 것)

1. 앱에 로그인 → 성장 탭 → **🪨 데이빗스톤 성장ON**
2. 「학교 새로 만들기」에 학교 이름을 넣는다 → 만든 사람이 최고관리자가 된다
3. 학교 설정에서 학생을 등록하고, 교사·보호자 **초대 코드**를 뽑아 건넨다
4. 홈에서 출결을 찍고 「✍️ 기록하기」로 여러 학생에게 한 번에 기록한다
5. 월말 마감 → 학생을 눌러 「기록에서 초안 만들기」 → 교사 편지를 쓰고
   「보호자에게 보내기」

## 2. 이 구현의 규칙 (고치기 전에 읽을 것)

- **기본값은 「교사만」이다.** 일일 기록의 공개 범위 기본이 `teacher` 이고,
  월간보고서는 `sent` 로 바꾸기 전에 보호자 화면에 한 줄도 안 나간다. 실수로
  새는 쪽이 아니라 **실수로 안 보이는 쪽**으로 기울였다(기획서 §10).
- **보호자는 자기 자녀만 본다.** `growth_guardian_links` 에 이어진 학생만이다.
  그래서 보호자 초대 코드는 **어느 아이의 것인지 정해서** 낸다.
- **상담·건강 기록은 표를 아예 갈랐다**(`growth_mentoring_notes`). 같은 표에
  두고 칼럼 하나로 가리면 정책을 한 번 잘못 고칠 때 통째로 샌다.
- **거르는 일은 전부 DB 정책이 한다.** 화면에서 거르면 화면을 고칠 때마다 새는
  자리가 생긴다(0081 기념관에서 한 판단과 같다).
- **언어모델을 부르지 않는다.** 미성년 스무 명의 학습·건강·관계 기록을 통째로
  밖으로 보내는 일이 §10 과 정면으로 부딪힌다. 월간보고서 초안은
  `src/lib/growth.ts` 의 **규칙**이 만든다 — 없는 일을 짓지 않고, 문장마다 근거
  날짜를 달고, 학생끼리 견주지 않고, **교사의 편지와 가정 실천은 비워 둔다**.
- **평가 색에 빨강을 쓰지 않는다.** 「도움 필요」는 교사가 할 일을 가리키지
  아이를 가리키지 않는다(§7).
- **셈은 전부 `src/lib/growth.ts` 의 순수 함수에 둔다.** 이 리포에는 자동
  검사가 없어서, 규칙이 화면 안에 있으면 검사할 길이 없다.

## 3. 파일 지도

| 자리 | 하는 일 |
|---|---|
| `supabase/migrations/0084_growth_school.sql` | 표 15개 + RLS + 초대 코드 rpc + 비공개 통 |
| `src/lib/growth.ts` | 순수 함수 — 날짜(서울), 균형, 강점, 보고서 초안, 마감 점검, 초대 코드 |
| `src/db/growth.ts` | Supabase 읽기·쓰기 |
| `src/features/growth/useSchool.ts` | 「나는 이 학교에서 누구인가」 한 곳에서 판정 |
| `src/features/growth/ui.tsx` | 카드·입력칸·알약·단계 배지 |
| `src/app/growth-school.tsx` | 오늘의 학교(출결·진행도·학생 카드) / 초대 코드로 들어가기 |
| `src/app/growth-school/record.tsx` | 여러 학생 일괄 기록 |
| `src/app/growth-school/setup.tsx` | 학생 등록·동의 범위·초대 코드·공지 |
| `src/app/growth-school/student/[id].tsx` | 성장요약·기록·지도계획·상담 |
| `src/app/growth-school/activities.tsx` · `activity/[id].tsx` | 체험활동·소감·보호자 공개 이야기 |
| `src/app/growth-school/reports.tsx` · `report/[id].tsx` | 월말 마감센터·월간 성장보고서 |

## 4. 남은 것 (기획서 2·3단계)

- 사진·음성 첨부 UI (통과 업로드 함수 `uploadGrowthMedia` 는 이미 있다)
- 음성 메모 자동 받아쓰기 — 웹은 `src/lib/dictation.web.ts` 를 그대로 쓸 수 있다
- 보호자 1:1 소통, 읽음 확인, 야간 알림 제한
- 월간보고서 PDF — 사명기록관의 인쇄용 HTML(`manuscriptToHtml`)과 같은 방식이
  가장 싸다(브라우저 인쇄 → PDF 저장)
- 학생 자기평가·묵상 화면, 포트폴리오 격자
- 커리큘럼 연동, 졸업 성장앨범, 관리자 웹

## 5. 검증 기록 (2026-09-18)

- `npx tsc --noEmit` — 이 리포의 기존 오류 1건(`@/global.css`) 말고 새 오류 0
- `src/lib/growth.ts` 를 노드로 돌려 **50가지**를 눈으로 대조 — 서울 날짜 경계,
  윤년 월 범위, 기록 없는 축이 0 이 아니라 null 인지, 강점이 두 번 이상만
  잡히는지, 교사가 쓴 「다음 지도 행동」이 제안의 첫 줄에 오는지, 보고서 초안에
  아홉 꼭지가 다 있고 문장마다 날짜가 붙는지, 교사 편지 자리가 비워지는지,
  활동 이야기에 학생 이름이 안 들어가는지, 초대 코드에 헷갈리는 글자(0·O·1·I·L)가
  없는지 — 전부 예상대로
- `npx expo export --platform web` 전체 통과 — 새 화면 여덟이 모두 정적
  내보내기에서 터지지 않고 그려진다(2026-07-25 의 빈 화면 사고가 이 단계에서
  잡히는 종류다)
- **화면을 사람 눈으로는 아직 못 봤다.** 이 환경에서는 번들 SQLite 가 안 열려
  앱이 「저장소를 여는 중입니다…」에서 멈춘다(HANDOFF 「Verification
  environment」). 실제 브라우저·폰에서 다크 모드까지 봐 줘야 한다.
