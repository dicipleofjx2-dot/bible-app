# BibleApp — Handoff / Status Reference

Last updated: 2026-07-25. Everything through `1b8505e` is **committed and
pushed to origin/main**; Vercel auto-deploys on push, so the web app is
live and current. Native (Android APK via EAS) is a separate story — see
"⚠️ EAS build quota" below before offering to build one.

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

## This session (2026-07-25) — summary
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
                             #   baked pixels) that does router.replace('/').
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
      index.tsx             # 홈 — 4x3(ish) emoji menu grid (app launcher)
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
    rooms.tsx / rooms/[id].tsx  # reading rooms (성경통독방)
    post/[id].tsx            # single community post + comments
    profile.tsx              # user profile / skin picker
    spiritual-journal.tsx / priorities.tsx / kingdom-finance.tsx
                             # 영성일기/우선순위/천국재정 — local-SQLite-only,
                             #   each has its own embedded InlineCalendar
    prayer-group.tsx         # 샬롬기도단 — login-gated prayer-request feed
    calendar.tsx             # 달력 — standalone info-only month-grid screen
  db/                       # All Supabase/SQLite data-access functions live here
    plans.ts / rooms.ts / community.ts / prayer.ts / bible.ts /
    commentary.ts / profile.ts / userData.ts
  features/                # Larger reusable UI pieces (AuthForm, BookChapterPicker, VerseActionSheet)
    auth/AuthForm.tsx        # Now redirects to '/' on successful sign-in
                             #   (this session — was previously left
                             #   wherever the form was rendered from).
  lib/                      # supabase client, auth context, hebrew-date calc, skin/theme context
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
supabase/migrations/        # 0001–0018, applied in order manually via Supabase SQL Editor
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
17. **시작 화면 (`intro.tsx`)** — see the session summary and ⚠️ note above
    for the full architecture + the failed attempts that preceded it.
18. **데이빗바이블 rebrand** — see session summary above.

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
  `diary_entries`, `priority_tasks`, `finance_entries`.

## Known follow-ups / not yet done

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
