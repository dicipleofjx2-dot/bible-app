# BibleApp — Handoff / Status Reference

Last updated: **2026-09-03** (책갈피 절 번호 작업은 미커밋). Everything through `3175923` is **committed
on local `main` and deployed to production**
(https://dicipleofjx-bible.vercel.app). See "This session (2026-08-19)"
immediately below for the newest work; older session notes follow in
reverse order and are still accurate for their areas.

~~**Not pushed to origin.**~~ **Stale — corrected 2026-08-19 (later
session).** `main` and `origin/main` are both at `20a5256`;
`git log origin/main..main` is empty and the working tree is clean.
`08a3b50`/`3175923` did reach the remote. The habit the old note asked
for is still right — **check `git log origin/main..main` yourself rather
than believing this file** — but don't act on the claim that the remote
is behind.

Native (Android APK via EAS) is a separate story — see "⚠️ EAS build
quota" below before offering to build one. The quota note is from July;
re-check current quota before relying on it.

## This session (2026-09-03) — 중보기도 나무

새 화면 두 개(`/prayer-tree`, `/prayer-tree/manage`)와 마이그레이션
`0076_prayer_tree.sql`. **마이그레이션은 아직 실행 안 됐다** — 실행 전에는
화면이 열려도 열매를 심지 못한다(표가 없다).

- **열매 하나 = 기도 대상자 한 사람.** 그 사람의 기도제목 중 응답된 비율
  하나로 열매의 **크기(34→62px)와 색(연둣빛→노랑→주황→진홍)**이 정해진다.
  셈은 전부 `src/lib/prayerTree.ts` 의 순수 함수(`fruitLook`)에 있다 — 화면을
  못 띄우는 환경에서도 검사가 되도록 상태·그리기를 섞지 않았다.
- **0/0 은 0 으로 둔다.** 기도제목을 아직 안 넣은 열매가 「다 응답됨」으로
  붉게 익어 버리면 안 된다.
- 나무는 SVG 한 장(`TreeCanvas`), **열매는 그 위에 얹은 진짜 View** 다. 사진이
  들어가고 눌러야 하므로 SVG 안에 넣지 않았다.
- 덜 익은 열매 색은 잎(#4E7C41)보다 **밝은 쪽**으로 잡았다. 처음에 같은 채도의
  초록으로 두었더니 응답 없는 열매가 잎에 묻혀 안 보였다(스크린샷으로 확인).
  흰 테(boxShadow 2px)도 그래서 둘렀고, 밝은 열매의 첫 글자는 갈색으로 쓴다.
- **위치는 0~1 비율로 담는다**(`pos_x`/`pos_y`). 화면 크기를 담으면 폰과 웹에서
  자리가 어긋난다. 나무 크기는 `onLayout` 이 아니라 **창 너비에서 계산**한다 —
  이 환경에서 onLayout 이 안 오는 일이 있었다(아래 「Verification environment」).
- 위치 지정은 **열매를 고른 뒤 나무를 누르는** 한 동작뿐이다(드래그 아님).
- 기도카드는 열매의 익은 색을 카드 테두리로 그대로 잇는다 — 「이 열매가 그
  카드」가 설명 없이 읽히도록.
- **응답 시각은 표의 트리거가 채운다**(0076). 화면이 채우면 기기 시계가 틀어진
  만큼 기록이 틀어진다.
- 기도음악: 본인 유튜브 재생목록 주소를 `prayer_tree_settings` 에 저장하고,
  웹은 iframe(`PrayerMusicPlayer.web.tsx`) · 앱은 WebView 로 그 자리에서 튼다.
  유튜브 앱으로 넘기지 않는다 — 넘기면 앱을 나가고 나무가 다시 그려진다.
  주소 해석(`parsePrayerMusicUrl`)은 playlist/watch?list/youtu.be/shorts/아이디만
  붙여넣기까지 받는다.
- **사생활**: 이 세 표에는 공유 스위치가 없다. 정책은 `user_id = auth.uid()`
  하나뿐이고 관리자 예외도 두지 않았다 — 남의 병·가정사가 그대로 적히는 표다.
- 들어가는 길: 성장 탭(🌳 중보기도 나무), 마이페이지(🌳 중보기도 나무 가꾸기).

**검증 (2026-09-03)**: `tsc --noEmit` 통과(이 리포의 유일한 기존 오류
`@/global.css` 포함해 새 오류 없음). `fruitLook`/`ripenessLabel`/
`parsePrayerMusicUrl` 을 노드로 돌려 19가지 입력(0/0, 음수, 응답이 전체를 넘는
값, 유튜브 주소 9종)의 결과를 눈으로 대조 — 전부 예상대로. `expo start --web`
+ Playwright(Chromium)로 **실제 브라우저에서** 나무·기도카드·가꾸기 화면·음악
iframe을 그려 스크린샷으로 확인했다(콘솔 에러 0). 그 과정에서 로그인 전에
`load()` 가 그냥 돌아가 돌림표가 영영 도는 것을 찾아 고쳤다.

**사람이 봐 줘야 하는 것**: (1) `0076_prayer_tree.sql` 실행, (2) 로그인 상태의
왕복(열매 심기·사진 올리기·위치 옮기기·응답 체크 → 열매가 자라고 익는지),
(3) 다크 모드, (4) 폰에서 WebView 음악 재생.

## This session (2026-08-28) — 달력에 히브리력 절기·성경·역사

**미커밋** (`src/lib/hebrew-calendar-events.ts` 새 파일, `src/lib/hebrew-date.ts`,
`src/app/calendar.tsx`).

달력 칸에 히브리 날짜만 떠 있던 것에 그 날의 **유대 절기 / 성경에서 이 날 /
역사에서 이 날**을 붙였다. 칸을 누르면 뜨던 모달을 스크롤 가능한 시트로 늘렸다.

- 데이터는 `hebrew-calendar-events.ts` 한 곳. 키는 `${monthKey}-${day}`.
- **성경 항목은 본문이 날짜를 직접 말하는 것만 `ref`를 붙였다.** 전통에만
  근거한 것(모세의 죽음 아달 7일, 아브 9일의 정탐꾼 등)은 본문에 "전통"이라고
  적었다. 근거 없이 단정하지 않는 것이 이 표의 규칙이다.
- **본문끼리 어긋나는 곳은 감추지 않고 양쪽을 다 적었다** — 아브 7일/10일
  (왕하 25:8 vs 렘 52:12), 아달 25일/27일(렘 52:31 vs 왕하 25:27).
- 윤년 처리: Intl이 `Adar I`/`Adar II`를 주는데 부림절과 아달월 사건은
  **뒤쪽 아달(Adar II)**에서 지키므로 `normalizeMonthKey()`가 `Adar II`를
  `Adar`로 합친다. 윤달은 `AdarI` 키로 따로 두고 푸림 카탄만 붙였다.
- 하누카는 그 해 키슬레브가 29일이냐 30일이냐에 따라 끝이 테벳 2일도 3일도
  되므로 표를 두지 않고 **최대 이레를 거슬러 올라가며 키슬레브 25일을 찾는다**
  (`hanukkahDay()`).
- 달력 칸은 높이를 건드리지 않으려고 점 대신 **히브리 날짜를 강조색+굵게**로
  칠해 "누를 것이 있다"를 알린다.
- `getRawParts()`가 부를 때마다 `Intl.DateTimeFormat`을 새로 만들고 있던 것을
  모듈 단위로 한 번만 만들게 고쳤다. 한 면이 42칸이라 체감이 있다.

**검증 (2026-08-28)**: `tsc --noEmit` 통과. 유대력 표준 달력에서 가져온 정답
13건(로쉬 하샤나·욤 키푸르·초막절·하누카 첫날/여드레째·부림절·유월절·샤부옷·
티샤 베아브 + 윤년 5784의 부림절이 아달 II에 오는지, 아달 I엔 푸림 카탄인지)과
대조해 **13/13 일치**. 하누카 여드레가 키슬레브 25→테벳 2로 끊김 없이 이어지고
아흐레째엔 사라지는 것도 확인. 라이브(`expo start --web`)에서 강조색
(`rgb(188,92,53)`=accent)·모달 내용·빈 날의 "기록 없습니다" 분기·콘솔 무에러까지
확인. 다만 이 세션 탭도 `innerWidth === 0`이라 **스크롤 시트가 실제로 잘
스크롤되는지는 사람이 봐 줘야 한다**(아브 9일이 항목 7개로 가장 길다).

**남은 것**: 다크 모드에서 배지(accentSoft 바탕 + accent 글자)가 어떻게 보이는지
눈으로 확인. 영어 전환(`bibleapp-english-toggle`)은 이 화면에 아직 안 붙였다.

## This session (2026-08-19, 이어서 2) — AI 목회 플랫폼 전환 시작

**미커밋.** 데이빗바이블·스마트주보·홈페이지를 200개 교회가 쓰는 플랫폼으로 바꾸는
작업이 시작됐다. **설계와 진행 상황은 `Documents\dg-smart-bulletin\docs\PLATFORM.md`에
전부 적혀 있다 — 이 영역을 건드리기 전에 그것부터 읽을 것.**

이 리포에서 바뀐 것은 하나뿐이다. **마이페이지에서 아무 교회나 고르던 것을 없앴다**
(`src/app/profile.tsx`, `src/db/profile.ts`). 교회가 하나일 땐 편했지만 여러 교회가
들어오면 그건 남의 교회 목자편지·기도제목·게시판을 읽는 길이다. 이제 초대 코드
(`redeem_invite` RPC)로만 들어온다.

**화면만 고친 게 아니다.** `profiles`는 본인 행을 update할 수 있어서 목록만 없애면
요청을 직접 보내 여전히 아무 교회나 들어갈 수 있었다. `dg-smart-bulletin`의
`supabase/migrations/0026_platform.sql`에 `profiles_guard_church_change` 트리거를
넣어 DB에서 막았다. **그 마이그레이션은 아직 실행 안 됐다** — 실행 전까지 이 화면의
초대 코드 넣기는 동작하지 않는다.

참고: 이 리포의 `0038_multi_church.sql`(라이브 적용됨)이 그 바탕이다.

## This session (2026-08-19, 이어서) — 책갈피에 절 번호

**아직 커밋 안 됨** (`src/app/read.tsx`, `src/db/userData.ts`,
`src/features/bible/BookmarkSheet.tsx`). 아래 "Known follow-ups"에 있던
"책갈피 이름이 창세기 1장 · 뒷부분에서 멈춘다"를 해결한 것.

- `reading_bookmarks`에 `verse INTEGER` 컬럼 추가. 기존 설치용
  `ALTER TABLE ... ADD COLUMN`을 `.catch(() => {})`와 함께 나란히 두었다
  (finance_entries/meditation_notes와 같은 방식).
- `read.tsx`가 절마다 `onLayout`으로 세로 위치를 재서 `verseOffsets` Map에
  담고, `verseAtTop(y)`이 "시작점이 화면 위로 이미 지나간 절 중 가장 아래
  것"을 고른다. 절 하나가 화면보다 길 수 있어서 "화면 안에서 시작하는 첫
  절"로 잡으면 안 된다.
- **`verse`는 이름표에만 쓴다. 돌아가는 자리는 여전히 스크롤 값이다.**
  이게 설계의 핵심 — 측정이 안 와도(예전 책갈피, 늦은 기기) 책갈피는
  멀쩡히 동작하고 이름만 예전처럼 "· 뒷부분"으로 돌아간다.
  `positionLabel()`(BookmarkSheet.tsx)이 그 갈림길이다.
- `verseOffsets`는 장이 바뀔 때 비운다. 안 그러면 새 본문이 그려지기 전에
  꽂은 책갈피에 앞 장의 절 번호가 붙는다.

**검증 (2026-08-19)**: `tsc --noEmit` 통과, lint 문제 수가 변경 전과 같음
(33개, 전부 기존 것). 라이브로 확인한 것 — 책갈피를 꽂고/목록에 뜨고/빼는
왕복이 새 컬럼으로 정상 동작(콘솔 에러 없음), 측정이 없을 때 옛 이름표로
안전하게 내려감. `verseAtTop`은 **실제 DOM의 `offsetTop` 값**(RN-web의
`onLayout`과 같은 기준)을 뽑아 13개 스크롤 값에 대해 눈에 보이는 정답 절과
대조 — 전부 일치.

**확인 못 한 것**: `onLayout`이 실제로 발화하는지. 이 세션의 브라우저 탭은
`innerWidth === 0`이라 합성(compositing)이 아예 없어 ResizeObserver가 돌지
않는다(아래 "Verification environment" 참고). 그래서 여기서는 항상 옛
이름표만 나온다. **진짜 브라우저나 폰에서 "창세기 1장 12절"로 나오는지는
사람이 봐 줘야 한다.**

## This session (2026-08-19) — summary

Two commits, both live.

**`08a3b50` — 쿠팡 바로가기 빈 화면 수정 (production bug, my own doing).**
`public/coupang.html` had been committed with its CSS truncated
mid-property (`text-decorati`) and the `</style>` tag gone entirely, so
browsers swallowed the whole document body *and* the script as
stylesheet text → **completely blank page** on the user's phone for
several days. The redirect code never even ran. Rebuilt the file whole,
removed a leftover fragment of an older version at the end.
**Lesson:** static HTML is invisible to `tsc` and lint. After editing
one, count tag pairs (`<style>`/`</style>`, `<script>`/`</script>`,
`<body>`/`</body>`) and re-fetch the **deployed URL** — not just the
local file — to confirm.

**`3175923` — 성경읽기: 연필 제거 → 꾹 누르기, 책갈피 + 이어보기.**
See `src/app/read.tsx`, `src/features/bible/BookmarkSheet.tsx`,
`src/db/userData.ts` (new `reading_bookmarks` table). Design notes:

- The per-verse ✎ button is gone; long-press the verse itself
  (`unstable_pressDelay` 160ms + `delayLongPress` 500ms ≈ 0.7s, verse
  dims to 0.55 while held). **There is deliberately no short-press
  handler** — that's what makes scrolling safe, structurally rather than
  by tuning. A dismissible one-line hint (`read.longPressHintSeen` in
  AsyncStorage) replaces the affordance the pencil used to provide.
- Verses with a note show an inline 📝. Reading area is
  `userSelect: 'none'` (text selection fought the long-press); the sheet's
  verse text is `selectable` so copying is still possible.
- **이어보기** (automatic): `read.lastPosition` in AsyncStorage —
  `{bookId, chapter, translation, y, contentHeight}`.
- **책갈피** (deliberate): `reading_bookmarks`, one per
  `(book_id, chapter, translation)`. Button sits between 이전 장 / 다음 장.

**Why position is stored as scroll offset, not verse number:** the first
attempt keyed off verse numbers via `onLayout`, which appeared never to
fire — so the whole design was changed. **That diagnosis was wrong**: the
verification tab was hidden, so no frames were painted and hence no
ResizeObserver/`onLayout`/`scroll` events at all. `onLayout` is fine on
real devices. The scroll-based design was kept because it's genuinely more
robust, but it costs label precision: the list reads "창세기 1장 · 뒷부분"
rather than "창세기 1:12". **If verse numbers in labels are wanted, add
`onLayout` measurement for the label only — the jump itself uses the
stored scroll offset and needs no change.** This option was offered to the
user; no answer yet.

Two traps worth remembering in `read.tsx`:
- The save-position effect will clobber the position you're about to
  restore (writing `y: 0` before the restore lands). Guarded by skipping
  the save while `pendingScroll` is set, then saving once right after
  restoring.
- When content height is unknown (`0`), do **not** clamp the target
  scroll — clamping to 0 throws away the remembered position. Restore
  primarily on `onContentSizeChange`, with a `setTimeout` fallback for
  devices where that signal is late or absent.

### Verification environment (read this before debugging "broken" APIs)

Both the Browser pane **and** Claude-in-Chrome tabs run
`document.visibilityState === 'hidden'` in this setup. No frames are
painted, so `onLayout`, `onContentSizeChange`, browser-emitted `scroll`
events, and `requestAnimationFrame` never fire, and `setTimeout` is
throttled. **Check `document.visibilityState` before concluding an API is
broken.** Workarounds that did work:
- Drive scroll handlers with `el.scrollTop = N` followed by
  `el.dispatchEvent(new Event('scroll'))`.
- RN-web `Pressable.onPress` needs a `click` event dispatched on top of
  `mousedown`+`mouseup` — mouse events alone are silently ignored.
  `onLongPress` works with `mousedown` + waiting.

### Deploying (worktree isolation)

Deploys go from a detached worktree so a concurrent session's
uncommitted work isn't swept in. `.vercel` is gitignored and does **not**
come along, so `vercel --prod --yes` in a fresh worktree will silently
**create a new Vercel project** with no env vars and fail the build (this
happened — a stray `bibleapp-coupang-fix` project was created and later
deleted). Always:

```
git worktree add <scratch> <commit>
cp .env <scratch>/.env            # expo export needs EXPO_PUBLIC_* at build time
cd <scratch> && npm install
npx vercel link --yes --project bible-app
npx vercel --prod --yes
```

Then confirm with `npx vercel project ls` that no new project appeared,
and clean up with `git worktree remove --force`.

## ⚠️ EAS build quota exhausted — no more Android builds until 2026-08-01
This account is on **EAS's free plan** (limited Android builds/month). A
debugging session on 2026-07-25 burned through the whole month's quota
(6+ `eas build --platform android --profile preview` calls chasing two
native bugs — see below). The next build attempt fails immediately with
"This account has used its Android builds from the Free plan this month."
**Resets 2026-08-01.** User explicitly chose to wait rather than upgrade
to a paid plan — don't offer to build-and-check as if it were free; batch
fixes and verify via `adb`/logcat against the *currently installed* APK
first (see below), and only spend a build once confident.

## ⚠️ Static web export + imperative router calls don't mix
`app.json`'s `"web": {"output": "static"}` means Expo Router prerenders
every route to static HTML at build time in a Node.js SSR-like pass. On
2026-07-25, `RootLayout` called `router.replace('/intro')` **imperatively
inside a bare `useEffect`** to force every launch through an intro screen
— this rendered a **completely blank page** on both local dev and the
deployed site (confirmed by a real user report and reproduced locally:
React logs "An error occurred in the `<Content>` component" with no
further detail, `#root` ends up with zero rendered content, and nothing
in the DOM shows an actual error message since there's no error
boundary). **Fixed by switching to the declarative `<Redirect href="..."
/>` component** (expo-router's documented mechanism for "always redirect
here"), gated by a `useRef` flag (not `useState`, so deciding to redirect
doesn't itself trigger a re-render) so it only fires once per app session.
**Lesson: never call `router.push`/`router.replace` imperatively from a
plain `useEffect` in a layout that's part of the static-export tree —
use `<Redirect>` instead**, and after any change to `_layout.tsx`
specifically, load the site fresh (not just click-test) to make sure it
still boots at all before considering the change done.

## This session (2026-07-29) — summary
New feature area: a native "데이빗북스" e-book library bolted onto
BibleApp (reusing its existing Supabase project rather than a separate
one — see the "why" below), plus reviving the 말씀카드 editor that got
dropped when bible-quiz-app was merged into 성경통독도우미. Committed
and pushed as `1c91ae0`.

**Why 데이빗북스 lives here instead of its own app**: it started as a
separate project (`personal-library-app`, React+Vite web app) with its
own plan to get a Supabase project. That project creation hit Supabase's
free-tier limit (2 projects per **account**, not per organization — new
orgs don't help). Rather than pay for Pro or free up a slot, the user
decided to fold the whole feature into 데이빗바이블 and reuse its
already-connected Supabase project (`bhqbrkeoiyhnmdgvofvy.supabase.co`).
`personal-library-app` is now abandoned.

1. **`books`/`purchases`/`subscriptions` tables** —
   `supabase/migrations/0021_personal_library.sql`. Deliberately does
   **not** add a new `profiles` column for admin status; reuses the
   `profiles.is_admin` boolean that already existed (0019). RLS lets a
   user insert/update only their own `pending` purchase — never `paid`
   directly (that's meant for a real payment-verification server, not
   built yet — no PortOne account/keys). A commented-out "DEV ONLY"
   policy exists in the migration for locally testing the purchase flow
   before real payment is wired up.
2. **Screens**: home tile "📕 데이빗북스" → `src/app/library.tsx` (grid,
   locked/unlocked badges) → `src/app/library/[id].tsx` (detail, buy/
   subscribe buttons, table of contents) → `src/app/library/[id]/read.tsx`
   (reader — paragraph text with font-size control for text-based books,
   or a file viewer for uploaded EPUB/PDF books; free-tier books and the
   first ~15 paragraphs of paid books are always readable, the rest is
   gated by `hasBookAccess()` in `src/db/library.ts`).
3. **Admin CMS** (`src/app/library/admin.tsx`, linked from 마이페이지 as
   "📚 데이빗북스 관리" when `profiles.is_admin`): register a book via
   form or bulk JSON paste, upload a cover image (`expo-image-picker` →
   `book-covers` Storage bucket, `0023_book_covers_bucket.sql`), or
   upload the actual book file (`expo-document-picker` → `book-files`
   bucket, `0024_book_files_bucket.sql`, format auto-detected from the
   file extension).
4. **PDF viewing bug (black screen) — root-caused and fixed twice**.
   First attempt: the reader's `flex: 1` chain collapsed to 0 height on
   web (confirmed via `getBoundingClientRect()` showing a literal 0×0
   iframe) — Native's Yoga layout always resolves `flex: 1` to a real
   size regardless of ambiguous ancestors, but web's CSS flexbox doesn't
   guarantee that, so a real user still saw a black screen after that fix
   (verified `Content-Type`/CORS on the Supabase Storage response were
   fine — not a server issue). **Root cause was actually that neither
   `<iframe src="...pdf">` (web) nor `react-native-webview` (native)
   reliably renders PDFs — Android WebView in particular often has no
   built-in PDF renderer at all.** Fixed by wrapping the file URL with
   Google's viewer (`https://docs.google.com/gview?embedded=true&url=...`,
   `src/components/pdfViewerUrl.ts`) so the PDF renders as a normal
   webpage instead of relying on a local PDF plugin — confirmed by the
   user directly ("아주 훌륭하게 읽힌다"). EPUB files don't have an in-app
   renderer yet — they open via `Linking.openURL` instead.
5. **말씀카드 revived** — the style editor (drag position, font size,
   text color, bold/italic, gradient templates) that existed in the now-
   retired `bible-quiz-app` repo (`app/word-card.tsx`, commit `4595098`)
   never made it into 성경통독도우미 during the merge. Ported into
   `src/app/reading-helper/word-card.tsx`, entry point added to
   `reading-helper/index.tsx` ("💌 말씀카드 만들기"). Adaptations from the
   original: the old AsyncStorage-based "quiz score ≥ 90 + daily card
   limit" gating has no equivalent in 성경통독도우미's Supabase-backed
   progress tracking, so that gate was dropped (available to anyone who's
   started the reading plan); theme API calls swapped for
   `useTheme()`/`ThemedText`/`ThemedView`. Three follow-up improvements
   in the same session: (a) dragging was jerky because every pixel of
   movement called `setState` and re-rendered the whole screen — switched
   to `Animated.ValueXY` + imperative `pan.setValue()`, no per-frame
   re-render; (b) a custom photo (via `expo-image-picker`) can now be used
   as the card background instead of only the 4 gradient templates; (c) an
   optional "새부대교회 데이빗바이블" watermark toggle, bottom-center,
   semi-transparent pill background so it stays legible over any
   background.
6. **New dependencies**: `expo-image-picker`, `expo-document-picker`,
   `react-native-webview`, `react-native-view-shot`, `expo-sharing` (the
   last one auto-added its config plugin to `app.json`).

Scope intentionally left out (told to the user explicitly, not a
surprise): real payment (no PortOne account yet — purchases stay
`pending` until a verification server exists), and DOM-Selection-based
highlight/notes/memo features from the original `personal-library-app`
web prototype — React Native has no Selection/Range API, so that needs a
different interaction model (e.g. long-press) if it's wanted, not a
straight port.

## This session (2026-07-26) — summary
Follow-on session, mostly UI/feature work with no architectural surprises.
Home tile relabeling twice (매일Q.T was already done before this session;
this session did 말씀노트→Q.T묵상, 암송구절→구절묵상), admin powers for
성경통독방 (enter + delete any room), a new 마이페이지 (My Page) with
login/signup + auth-gating for 3 screens, a 순종일기 rename (was 영성일기),
a full 말씀카드 (verse card) feature with Supabase-hosted random background
images and web-only KakaoTalk sharing, and an intro-screen caption crediting
the background photo.

1. **Admin room powers**: `profiles.is_admin` admins can now (a) **delete**
   any 성경통독방 via a new RLS policy
   (`supabase/migrations/0019_admin_can_delete_rooms.sql`) + a UI condition
   change in `rooms/[id].tsx` (`{(isOwner || isAdmin) && (...)}`), and (b)
   **enter** any room directly from the room-browse list in
   `bible-reading.tsx` without needing a join code (`canEnterDirectly =
   alreadyMember || isAdmin`).
2. **마이페이지 (`profile.tsx`)** — new 홈 grid tile (👤, last slot of row 3),
   houses login/signup (`<AuthForm />` when logged out) and, when logged
   in, email display + editable nickname + a **"💌 말씀카드 만들기"** entry
   point (added mid-session, see #4) + sign-out.
3. **Hard auth-gate for 성경통독/커뮤니티/샬롬기도단**: previously these
   screens rendered an inline `<AuthForm />` when logged out; now they
   `return <Redirect href="/profile" />` instead — you can't enter them at
   all while logged out, only reach the login form via 마이페이지. Same
   pattern applied in all three files, `AuthForm` import removed from each.
   The 홈 grid tile press handler also short-circuits early:
   `router.push(item.requiresAuth && !session ? '/profile' : item.href)`.
4. **말씀카드 (verse card) feature** — build a shareable "verse card" image
   from either a saved 암송구절 or freely-typed text, over a random
   background photo, share to KakaoTalk (web only).
   - `src/db/verseCards.ts`: `getRandomCardBackgroundUrl()` lists the
     Supabase Storage bucket `verse-card-backgrounds` and returns a random
     file's public URL. Bucket created via
     `supabase/migrations/0020_verse_card_backgrounds_bucket.sql` (public
     bucket + a `select` policy on `storage.objects`); 20 compressed photos
     uploaded by the user from `C:\Users\dicip\Documents\이미지폴더`
     (originals) via `C:\Users\dicip\Documents\말씀카드-업로드용\card-01.jpg`
     … `card-20.jpg` (~5.1MB total, compressed with PowerShell +
     `System.Drawing`). **Deliberately not bundled into the app** — the
     user rejected that approach specifically because of app-size growth;
     always re-lists the bucket rather than assuming a fixed file count, so
     new photos can be added/removed from the Supabase dashboard with no
     app update.
   - `src/lib/kakaoShare.ts`: web-only Kakao JS SDK loader +
     `shareVerseCard()`. `isKakaoShareAvailable = Platform.OS === 'web' &&
     !!process.env.EXPO_PUBLIC_KAKAO_JS_KEY`. **Native KakaoTalk share is
     NOT implemented** — would need the native Kakao SDK, a key hash
     registration, and a rebuild; native users just see it disabled with an
     explanatory string.
   - `src/app/verse-card.tsx`: mode toggle 'saved' (pick from your own
     저장된 암송구절, enriched with book name + verse text the same way
     `notes.tsx` does) vs 'custom' (free-text reference + body); live card
     preview (background image + dark scrim + overlaid text, 4:5 aspect,
     max width 360); "🔄 이미지 변경" re-rolls the background; share button
     disabled with explanatory copy when Kakao isn't available.
   - **Entry point moved mid-session**: originally added as its own 홈 grid
     tile (💌, requiresAuth); the user asked for it to live **inside
     마이페이지 instead** — the 홈 tile was removed, and a "💌 말씀카드
     만들기" `Pressable` was added to `profile.tsx`'s logged-in section
     (same `{session && (...)}` block as email/nickname/sign-out). The
     route (`/verse-card`) and its own `!session` guard in the screen
     itself are unchanged — still reachable by direct URL, still redirects
     to a "로그인해주세요" message if hit while logged out.
   - **Kakao Developer app**: a new app named "데이빗바이블" was created at
     developers.kakao.com (app ID `1524349`). Its **JavaScript key**
     (`앱 설정 → 플랫폼 키 → JavaScript 키`) is what `EXPO_PUBLIC_KAKAO_JS_KEY`
     needs — currently set in **both** the local `.env` (gitignored, not in
     git) **and** Vercel's Production environment variables (Project →
     Settings → Environments → Production → Environment Variables — this
     is where Vercel's redesigned console keeps them now, NOT a separate
     top-level "Environment Variables" nav item). 앱 대표 도메인 and the
     Web platform's 사이트 도메인 were both set to
     `https://dicipleofjx-bible.vercel.app`. **Adding/changing a Vercel env
     var does not retroactively apply to already-built deployments** — you
     must explicitly re-trigger a **Production** deploy afterward (the
     Deployments list has separate Production vs Preview entries per
     commit; redeploying from the "..." menu on the wrong one silently
     produces a Preview build on a `*.vercel.app` preview subdomain, not
     the real production domain — this tripped us up once this session,
     caught by checking the "Environment" field on the deployment detail
     page).
5. **순종일기 rename** (was 영성일기) — label change only, no route/table
   rename: `spiritual-journal.tsx` header text + `privacy-policy.tsx` prose
   mention. The route file and `diary_entries` table are still named/spelled
   the old way; only user-facing text changed.
6. **Home tile relabeling**: 말씀노트→**Q.T묵상**, 암송구절→**구절묵상**
   (매일Q.T was already renamed in a slightly earlier commit this session,
   from 말씀묵상). Labels only — hrefs (`/word-notes`, `/notes`) and screen
   internals untouched. Worth noting there are now two "Q.T"-labeled tiles
   (매일Q.T → `/meditation`, Q.T묵상 → `/word-notes`) since that's what was
   asked for — flag to the user if this reads as confusing in practice.
7. **Intro caption**: `intro.tsx` now shows a small caption below the
   "시작하기" button crediting the background photo — "모라비안 선교사
   죠셉스미스가 제네덴달에서 선교하던 때에 마을 사람들에게 성경말씀에
   순종하도록 가르친 장소였던 배나무(PeerTree)입니다." White
   85%-opacity text with a dark text-shadow for legibility over the photo;
   the button + caption were regrouped into one `bottomGroup` wrapper
   `View` (positioned `top: height * 0.58`) instead of the button having
   its own separate absolute position, so the caption sits directly below
   it with a small `marginTop` gap.

## Previous session (2026-07-25) — summary
Long session covering: a new 성경연구 hub + 성경지도 (OpenBible.info
integration), a full app rebrand (name/icon/splash from a user-supplied
photo), a brand-new full-screen intro/welcome screen, a real native
launch-crash fix, a login redirect fix, and a web toolbar layout fix.
Full writeups are in "Recent changes" below; the two `⚠️` sections above
are the two hard-won lessons most worth not re-learning.

1. **성경연구 hub** (`bible-study.tsx`) consolidates 성경검색/주석/성경지도
   into one screen, reached from a new 🧭 홈 grid tile; 검색/주석 were
   removed from both the web and native tab bars (still reachable, just
   not as standalone tabs anymore). 성경지도 (`bible-maps.tsx`) lists all
   66 books and opens each one's OpenBible.info geography page externally
   — no in-app map rendering, no new native dependencies. See "Core
   features" #1/#15/#16.
2. **Real native crash, finally root-caused via `adb logcat` on the actual
   device** (not guessed): `[RNScreens] Attempt to insert TabsScreen at
   index 6; BottomNavigationView supports at most 6 items`. Android's
   native bottom tab bar hard-caps at 6; `app-tabs.tsx` had 7. **This was
   invisible to every prior web-only verification session** — the web tab
   bar has no such limit. Fixed by dropping 말씀노트 from the native tab
   bar (still reachable elsewhere). See "Established workflow patterns"
   for the adb/wireless-debugging setup that made this possible.
3. **App rebrand**: name → 데이빗바이블, icon/splash/adaptive-icon/
   favicon/store assets regenerated from a user-supplied AI-generated
   mockup photo (cropped via PowerShell + `System.Drawing` — no
   ImageMagick/sharp available on this machine).
4. **New intro/welcome screen**, shown on every launch — went through
   **three failed architectures** before landing on one that actually
   works; see "Recent changes" for the full blow-by-blow if this needs
   touching again. Final shape: `src/app/intro.tsx` is a real Stack route
   (not a locally-toggled overlay), `_layout.tsx` forces every launch
   through it via `<Redirect href="/intro" />` (see ⚠️ above for why not
   `router.replace` in a `useEffect`), and "시작하기" leaves via
   `router.replace('/')` — plain in-app navigation, same as every other
   link in the app. **Verified working end-to-end** on both local dev and
   the deployed site via direct click tests.
5. Login now redirects to home (`AuthForm.tsx`, `router.replace('/')` on
   successful sign-in).
6. Web top toolbar's 📅 date button could crowd every tab out of view on
   a narrow viewport/larger font scaling (`flexShrink:0` on a long
   KST+Hebrew date string) — user caught this on a **different phone's
   browser** hitting the live site. Fixed with `maxWidth:'40%'` +
   ellipsis truncation; verified at 390px width.

## What this app is

성경앱 — a Korean-first Bible app (React Native + Expo Router, web-first via
`expo start --web`, deployed to Vercel). Backend is Supabase (Postgres +
Auth + RLS). Community features (posts, reading rooms, reading plans) all
live in Supabase; Bible text/commentary/QT-schedule data is bundled as a
local SQLite file shipped with the app (via `expo-sqlite`), built by
`scripts/build-bible-db.mjs` from source data in `scripts/bible-source-data/`.

- Repo: `dicipleofjx2-dot/bible-app` on GitHub
- Deployed (web): https://dicipleofjx-bible.vercel.app — auto-deploys on
  push to `main`, no build-quota concern (that's EAS/native-only).
- Native: EAS project `dicipleofjx2/BibleApp`, package
  `com.dicipleofjx2.bibleapp`. Preview APK installs are ad-hoc sideloads
  (not Play Store) via `eas build --platform android --profile preview
  --non-interactive`, which prints an `expo.dev/.../builds/<id>` link the
  user opens on their phone to install. **See the ⚠️ quota note above
  before running this.**
- Local dev: `.claude/launch.json` has a `bibleapp-web` preview config
  (npm script `web` → `expo start --web`, port 8081) — but see "Dev
  server" note below, this is frequently occupied by another session.

## Tech stack

- Expo ~57, React Native 0.86, React 19.2, TypeScript ~6, Expo Router
  (file-based routing under `src/app`)
- Supabase JS client (`src/lib/supabase.ts`), env vars
  `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`
  (also configured in EAS's "preview" environment for cloud builds)
- `EXPO_PUBLIC_KAKAO_JS_KEY` (this session) — web-only KakaoTalk share for
  말씀카드. In local `.env` (gitignored — never committed) **and** Vercel's
  Production environment variables (see summary #4 above for exactly where
  Vercel hides that page now, and the Production-vs-Preview redeploy gotcha).
- Local Bible text/commentary/QT data via `expo-sqlite` (bundled `.db` file,
  see `src/db/bible.ts`, `src/db/commentary.ts`)
- **IMPORTANT project-specific instruction (see `AGENTS.md`/`CLAUDE.md`):
  Expo has changed recently — check the versioned docs at
  https://docs.expo.dev/versions/v57.0.0/ before writing Expo-specific code.**

## Directory map

```
src/
  app/                      # Expo Router screens (file-based routing)
    intro.tsx                # 시작 화면 — every launch redirects here first
                             #   (see _layout.tsx + the ⚠️ static-export
                             #   note above). Full-bleed background photo
                             #   (assets/images/intro-background.jpg, a
                             #   user-supplied garden-bench photo, baked-in
                             #   title/subtitle/church name) + a live
                             #   "시작하기 →" button (NOT a tap-zone over
                             #   baked pixels) that does router.replace('/'),
                             #   plus (added this session) a small caption
                             #   below the button crediting the photo —
                             #   both live inside one `bottomGroup` wrapper
                             #   View, see this session's summary above.
    verse-card.tsx            # 말씀카드 — build+share a verse card image
                             #   (saved 암송구절 or custom text, over a
                             #   random Supabase-hosted background,
                             #   KakaoTalk share on web). Reached from
                             #   마이페이지's "💌 말씀카드 만들기", NOT its own
                             #   홈 grid tile (moved this session). Own
                             #   `!session` guard even though its only
                             #   linked entry point already requires login.
    bible-study.tsx           # 성경연구 hub — 3-row list linking to
                             #   /search, /commentary, /bible-maps.
                             #   Reached from 홈's 🧭 tile.
    bible-maps.tsx            # 성경지도 — lists all 66 books, tapping one
                             #   opens https://www.openbible.info/geo/preview/<slug>
                             #   externally (Linking.openURL, no in-app map
                             #   rendering, no new deps). 5 books with no
                             #   OpenBible geo data (Philemon/James/1-3 John)
                             #   render disabled with "지도 없음".
    search.tsx / commentary.tsx  # Moved OUT of (tabs)/ this session —
                             #   now standalone Stack routes (own native
                             #   header + back button), reached only via
                             #   /bible-study, no longer separate tabs.
    (tabs)/                 # Bottom-tab screens
      index.tsx             # 홈 — 4x3 emoji menu grid (app launcher), 12
                             #   tiles ending in 👤마이페이지. Tile press:
                             #   `router.push(item.requiresAuth && !session
                             #   ? '/profile' : item.href)`. 💌말씀카드 is
                             #   NOT a tile here (moved into 마이페이지 this
                             #   session, see summary #4).
      meditation.tsx        # 말씀묵상 — QT passage + note-taking + "오늘의 성경통독"
      word-notes.tsx        # 말씀노트 — all-notes list. Real tab on web;
                             #   dropped from the NATIVE tab bar this
                             #   session (Android's 6-tab cap — see summary
                             #   above), still reachable via 말씀묵상's link
                             #   + the home grid on native.
      read.tsx               # 읽기 — free Bible reading, verse actions
      bible-reading.tsx     # 성경통독 — reading plan CRUD + 성경통독방 (rooms) CRUD
      notes.tsx               # 암송구절 — verse highlights/memorization
      community.tsx         # 커뮤니티 — post feed, room invite banner
                             # ^ web tab order: 홈-묵상-노트-읽기-통독-암송-커뮤니티
                             #   (검색/주석 removed this session — see summary)
    plans/[slug].tsx        # single reading-plan detail (chapter grid, progress)
    plans.tsx               # read-only plans list
    rooms.tsx / rooms/[id].tsx  # reading rooms (성경통독방) — admins can now
                             #   delete any room and enter any room directly
                             #   (this session, see summary #1)
    post/[id].tsx            # single community post + comments
    profile.tsx              # 마이페이지 — skin picker (always visible) +,
                             #   when logged in, email/nickname editor,
                             #   "💌 말씀카드 만들기" link, sign-out; when
                             #   logged out, `<AuthForm />` inline (this is
                             #   the ONLY screen that still shows the inline
                             #   login form — 성경통독/커뮤니티/샬롬기도단
                             #   hard-redirect here instead, see summary #3)
    spiritual-journal.tsx / priorities.tsx / kingdom-finance.tsx
                             # 순종일기(was 영성일기, renamed this session)/
                             #   우선순위/천국재정 — local-SQLite-only, each
                             #   has its own embedded InlineCalendar
    prayer-group.tsx         # 샬롬기도단 — hard-gated (Redirect to /profile
                             #   if logged out, this session — see summary #3)
    calendar.tsx             # 달력 — standalone info-only month-grid screen
  db/                       # All Supabase/SQLite data-access functions live here
    plans.ts / rooms.ts / community.ts / prayer.ts / bible.ts /
    commentary.ts / profile.ts / userData.ts /
    verseCards.ts             # getRandomCardBackgroundUrl() — lists the
                             #   verse-card-backgrounds Storage bucket and
                             #   returns one random file's public URL (this
                             #   session, see summary #4)
  features/                # Larger reusable UI pieces (AuthForm, BookChapterPicker, VerseActionSheet)
    auth/AuthForm.tsx        # Redirects to '/' on successful sign-in
  lib/                      # supabase client, auth context, hebrew-date calc, skin/theme context
    kakaoShare.ts             # Web-only Kakao JS SDK loader + shareVerseCard()
                             #   (this session, see summary #4 for the full
                             #   Kakao Developer app / env var setup)
  components/               # ThemedText/ThemedView/UI primitives
    inline-calendar.tsx      # `InlineCalendar` — reusable embedded month-grid
                             #   date picker, used by 영성일기/우선순위/천국재정
    app-tabs.tsx              # NATIVE tab bar (NativeTabs). **Max 6
                             #   triggers — Android hard-caps
                             #   BottomNavigationView there.** Currently:
                             #   홈/말씀묵상/읽기/성경통독/암송구절/커뮤니티.
    app-tabs.web.tsx          # WEB tab bar (custom scrollable pill). No
                             #   tab-count limit, but the 📅 date button
                             #   must stay capped (maxWidth:'40%' +
                             #   numberOfLines=1) or it can crowd every tab
                             #   out of view — see summary above.
  constants/theme.ts        # Spacing scale, MaxContentWidth (800), colors
assets/
  images/intro-background.jpg  # 시작 화면 background (894×1830, cropped
                             #   from a user-supplied AI-generated garden-
                             #   bench photo mockup — the phone-bezel chrome
                             #   AND the design's own baked-in button text
                             #   were both cropped out; the live "시작하기"
                             #   button is a real RN component, not a
                             #   tap-zone over pixels).
  images/icon.png, splash-icon.png, android-icon-*.png, favicon.png
  store/icon-512.png, feature-graphic-1024x500.png
                             # All regenerated this session from the same
                             #   source photo (square crop of the tree
                             #   trunk + "Pear Tree" sign, safe-zone padded
                             #   for adaptive-icon masking). Generated via
                             #   PowerShell + System.Drawing (no
                             #   ImageMagick/sharp on this machine).
                             #   android-icon-monochrome.png is a plain
                             #   grayscale desaturation, not a proper
                             #   alpha-silhouette — a reasonable-effort
                             #   approximation, not spec-correct for
                             #   Android 13+ themed icons.
supabase/migrations/        # 0001–0020, applied in order manually via Supabase SQL Editor
                             #   (0019 = admin room-delete policy, 0020 =
                             #   verse-card-backgrounds Storage bucket, both
                             #   this session, both confirmed run)
scripts/                    # build-bible-db.mjs + bible-source-data/*.json (source texts)
                             #   NOTE: ESV.bdb/NLT.bdb/개역개정.bdb/바른성경.bdb
                             #   are untracked on purpose (commercially-
                             #   licensed translation text — never `git add`
                             #   these without asking the user first, even
                             #   though there's no .gitignore entry for them).
```

## Core features (as of this session)

Features #1–#14 (홈 grid, 달력, 말씀묵상, 읽기/검색/암송구절, 성경통독 tab,
plans detail, rooms, 커뮤니티, 말씀노트, web toolbar scroll, 주석 caching,
영성일기/우선순위/천국재정, 샬롬기도단, 4색 하이라이트) are unchanged from
prior sessions except where called out below — see git log / the actual
screens for current behavior rather than trusting a re-paraphrase here.
**This session added:**

15. **성경연구 (`bible-study.tsx`)** — a hub screen listing 성경검색/주석/
    성경지도, reached from 홈's 🧭 tile (which replaced the separate
    관주검색/주석 tiles). `search.tsx`/`commentary.tsx` moved out of
    `(tabs)/` to standalone Stack routes and were dropped from both tab
    bars — they're reachable only through this hub now (or a direct
    `/search`, `/commentary` URL, which still works, same route paths as
    before the move).
16. **성경지도 (`bible-maps.tsx`)** — lists all 66 books (구약/신약
    sections, using this app's own `books.book_order` so it can't drift
    from the bundled `bible.db`), tapping a book opens
    `https://www.openbible.info/geo/preview/<slug>` externally via
    `Linking.openURL` — a Google-Earth-based interactive map + place
    directory hosted by OpenBible.info (CC BY license, attribution shown
    at the top of the screen). 5 books have no OpenBible geo data
    (Philemon/James/1-3 John) and render disabled with "지도 없음" instead
    of linking to a 404. No in-app map rendering, no new native
    dependencies (deliberately avoided given the app already had one
    unresolved native-crash investigation in flight this session).
17. **시작 화면 (`intro.tsx`)** — see the 2026-07-25 session summary and ⚠️
    note above for the full architecture + the failed attempts that
    preceded it; the photo-credit caption below the button was added
    2026-07-26, see that session's summary #7.
18. **데이빗바이블 rebrand** — see 2026-07-25 session summary above.
19. **관리자 방 관리** — admins (`profiles.is_admin`) can delete any
    성경통독방 and enter any room directly without a join code. See
    2026-07-26 summary #1.
20. **마이페이지 (`profile.tsx`)** + **hard auth-gate** for 성경통독/
    커뮤니티/샬롬기도단 — see 2026-07-26 summary #2/#3.
21. **말씀카드 (`verse-card.tsx`)** — build+share a verse card, reached from
    마이페이지. See 2026-07-26 summary #4 for the full Supabase Storage +
    Kakao Developer app setup.
22. **순종일기 rename** (was 영성일기) — label only. See 2026-07-26 summary #5.

## Established workflow patterns (important — follow these)

- **Never commit without an explicit "커밋해줘" / "모두 커밋" etc.**
- **Never `git push` without an explicit "배포해줘".** Vercel auto-deploys
  on push to `main` — this is fast and free (no quota concern), unlike EAS
  native builds (see ⚠️ at the top of this file).
- After committing, this doc's "Last updated" line and the "Recent changes"
  section below should be refreshed.
- Migrations in `supabase/migrations/` are **not** auto-applied — always
  give the user the **raw SQL inline in the chat message** and ask them to
  run it in the Supabase SQL Editor, then confirm afterward. To verify a
  migration actually ran without needing to log in: `curl` the PostgREST
  endpoint with the anon key —
  `curl -s "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/<table>?select=<col>&limit=1" -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_ANON_KEY"`.
  As of this session, migrations 0001–0018 have all been run and confirmed;
  `supabase/migrations/` matches the live DB.
- Claude normally cannot log in to the app (password entry is off-limits),
  so anything gated behind auth needs the user to manually verify most
  sessions.

### Native device testing (adb) — this session's setup, worth reusing
Real device: Samsung Galaxy S22 Ultra (SM-S918N). **USB debugging never
worked** (Windows never exposed a working ADB interface for this phone —
likely needs the official Samsung USB driver, never installed).
**Wireless debugging worked reliably**:
1. Phone: 설정 → 개발자 옵션 → 무선 디버깅 on → tap the words "무선
   디버깅" (not the toggle) → "코드로 새 기기 페어링" → gives a pairing
   IP:port + 6-digit code.
2. `adb pair <ip>:<pairing-port> <6-digit-code>` (non-interactive, no prompt).
3. Back on the main 무선 디버깅 screen, get the **connection** IP:port
   (different port than pairing) → `adb connect <ip>:<connect-port>`.
4. **The connect port is ephemeral** — changes on every reconnect/toggle.
   If `adb devices` comes back empty later, don't assume pairing was lost;
   just ask for the current port and re-`adb connect` (re-pairing usually
   isn't needed).
5. `adb.exe` lives at
   `C:\Users\dicip\AppData\Local\Temp\claude\platform-tools-dl\platform-tools\`
   (standalone platform-tools zip from `dl.google.com`, no Android Studio)
   — that's a temp path, re-download if it's gone in a future session.
6. In Git Bash, prefix `adb shell` commands touching `/sdcard/...` paths
   with `export MSYS_NO_PATHCONV=1`, or MSYS mangles the leading slash into
   a Windows path.
7. **Debugging technique that actually worked** for "is this button really
   broken or is it my testing tool": `adb shell uiautomator dump
   /sdcard/ui.xml` + `adb pull` gives the exact on-device view hierarchy
   (bounds, `clickable`, `enabled`) by `content-desc`/`text` — far more
   reliable than guessing coordinates. `adb shell input tap X Y` scripts
   real taps at exact coordinates. Combined with `adb logcat -d -v
   threadtime` (clear with `-c` first, reproduce, then dump) for the actual
   crash/FATAL EXCEPTION trace.

### Browser-pane web verification — hard-won caveats from this session
The Claude Browser-pane tool's clicks/state-reads were **repeatedly
unreliable** this session in ways that cost enormous time before landing
on a trustworthy method — several rounds of "the bug is fixed" / "no it
isn't" turned out to be tooling artifacts, not real flip-flops in the app.
**Before spending more than ~2 rounds chasing a click/state bug via this
tool, switch to one of the methods below instead of continuing to guess:**
- **Most reliable: render the state visibly** (a temporary on-screen
  `<Text>` showing the value you care about) and read it via
  `get_page_text` — this is unambiguous in a way DOM/fiber introspection
  isn't. Remove it once you've confirmed the fix.
- Reading React internals directly (`__reactContainer$...` on the root DOM
  node, walking `.child`/`.sibling`, matching `fiber.type.name`) **stops
  working reliably on a minified production build** (names become single
  letters) and gave **self-contradictory results across calls** even in
  dev — don't trust it as a primary signal, only as a last resort, and
  cross-check with the visible-`<Text>` method before believing it.
- Calling an `onPress` handler directly via a fiber's `memoizedProps`
  (bypassing all DOM click simulation) can report "called successfully"
  while still not reflecting reality — likely reading a stale/wrong fiber.
  Don't treat this as proof either.
- `computer.left_click` on a tab that's done several full `navigate()`
  hard-reloads (or after closing a sibling tab) can silently no-op. Open a
  **fresh tab** (`tabs_create`) and `navigate()` there once instead of
  reusing a well-traveled tab.
- `navigate()`/`preview_start` can occasionally hang and report a timeout
  even though the navigation actually completed a few seconds later —
  check `tabs_context` for the tab's actual current origin before
  concluding the tool is stuck.
- A **fresh** Browser-pane tab can hit `<SQLiteProviderSuspense>` blank-page
  failures that an **already-warmed-up** tab (or the tool's *own*
  `preview_start{name:...}` launch) doesn't, seemingly due to
  `crossOriginIsolated`/`SharedArrayBuffer` availability varying — if a
  totally blank page shows up, don't assume it's a real app bug before
  checking `self.crossOriginIsolated`/`typeof SharedArrayBuffer` and
  trying a different tab/reload; but also don't automatically dismiss a
  blank page as "just the tool" either — the 2026-07-25 blank-page
  regression (see ⚠️ above) was a **real bug**, confirmed by an actual
  user on their own regular browser. When in doubt, ask the user to check
  their own browser rather than assuming either way.
- `read_network_requests` does not reliably show cross-origin `fetch`
  calls to the Supabase host even when they're definitely happening.
- `computer{action:"screenshot"}` has timed out repeatedly across many
  sessions now — use `get_page_text`/`read_page`/`javascript_tool`
  bounding-rect checks instead.
- Dev server: `preview_start{name:"bibleapp-web"}` fails if port 8081 is
  already held (by the user's own server or another session). Don't fight
  it — start a dedicated instance on another port directly: `(npx expo
  start --web --port <N> > /tmp/expo-<N>.log 2>&1 &)`, poll
  `Get-NetTCPConnection -LocalPort <N> -State Listen` until it's up, then
  `preview_start{url:"http://localhost:<N>/..."}`. **Verify the port
  actually bound to *your* process** — this session, port 8099 turned out
  to already be serving a completely unrelated app (a different project's
  dev server), and connecting to it silently showed that app's UI instead
  of erroring; check the startup log for "Port already in use" before
  trusting what loads.

## Data model quick reference

- `reading_plans`, `reading_plan_days`, `reading_plan_progress`,
  `reading_rooms`/`room_members`/`room_activity`, `posts`/comments,
  `profiles.is_admin`, `prayer_requests`/`prayer_comments` — all Supabase,
  unchanged this session.
- Local SQLite (bundled, not Supabase): `books`, `verses`, `qt_schedule`,
  commentary text.
- Local SQLite (user data, `user.db` via `db/userData.ts`, not synced):
  `verse_marks`, `meditation_notes`, `commentary_text_highlights`,
  `diary_entries`, `priority_tasks`, `finance_entries`,
  `gratitude_entries`, `reading_bookmarks` (2026-08-19).

## Known follow-ups / not yet done

- ~~**Last two commits are local-only**~~ — 사실이 아니었다. `main`과
  `origin/main` 둘 다 `20a5256`. 맨 위 정정 참고.
- ~~**책갈피 labels stop at "창세기 1장 · 뒷부분"**~~ — 구현했다(맨 위
  "이어서" 절 참고). **커밋은 아직 안 했고**, 진짜 브라우저/폰에서 절 번호가
  실제로 뜨는지는 사람 확인이 남았다.

- **Native APK can't be rebuilt until 2026-08-01** (EAS free-tier quota —
  see ⚠️ at top). The last successfully-built APK (before the quota ran
  out) had the native-tab-count crash fix but predates the final
  intro-screen fix — **don't assume the currently-installed APK reflects
  the latest code**; a fresh build is needed once the quota resets to get
  everything in this doc onto the device.
- `android-icon-monochrome.png` is a plain grayscale conversion, not a
  proper alpha-silhouette — cosmetically fine as a fallback but not
  spec-correct for Android 13+ themed icons. Low priority.
- 성경지도's 5 no-data books (Philemon/James/1-3 John) are just disabled
  in the list — if OpenBible.info ever adds geo data for them, no code
  change needed, they'll need manually adding to `OPENBIBLE_SLUGS` in
  `bible-maps.tsx`.
- 검색/주석 no longer have their own top-level tabs — if that's ever
  reported as "harder to find," the fallback is re-adding them to
  `app-tabs.web.tsx` (web has no tab-count limit) while leaving native as
  is (already at the 6-tab cap).
- No automated tests in this repo; verification is manual (`tsc --noEmit`
  for types + live browser/adb checks for behavior).
- See "Data model quick reference" and older commit history for
  longer-standing known gaps (2028+ Korean holidays not in
  `korea-holidays.ts`, no admin granted yet in `profiles.is_admin`, etc.)
  — not touched this session, still accurate.
- **말씀카드's native KakaoTalk share is not implemented** — web only
  (`isKakaoShareAvailable` hard-checks `Platform.OS === 'web'`). If the user
  wants sharing from the native app, that needs the native Kakao SDK, a key
  hash registered with the Kakao app, and a rebuild — a separate task, not
  a quick follow-up.
- The Kakao Web platform's **사이트 도메인 registration page location wasn't
  found this session** — we set 앱 대표 도메인 (일반 tab) and grabbed the
  JavaScript key from 플랫폼 키, but never located a dedicated "Web 플랫폼
  등록 / 사이트 도메인" field the way older Kakao docs describe (the 일반
  page went straight from 앱 기본 정보 to 비즈니스 정보, no 플랫폼 section
  in between). Sharing worked without it in this session's testing scope,
  but if KakaoTalk share ever throws a domain-mismatch error in production,
  that's the first thing to hunt down in Kakao's current (redesigned)
  console.
- Two home-grid tiles now both reference "Q.T" (매일Q.T → `/meditation`,
  Q.T묵상 → `/word-notes`) per explicit user request this session — flag if
  this causes real user confusion, but don't rename without asking first.
