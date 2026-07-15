# BibleApp — Handoff / Status Reference

Last updated: 2026-07-15. `4f31755` (calendar feature) is pushed and
deployed. Everything below this point (home-screen toolbar/title rework,
icon-grid overlap fix, tab reorder + 말씀노트 tab, 주석 text-highlighting) is
**not yet committed** — check `git log` / `git status` for the current head.

This file exists so a new chat session can pick up work on this project without
re-deriving context. Keep it updated at the end of a work session — a stale
handoff doc is worse than none, so prefer trimming/correcting over letting it
drift.

## What this app is

성경앱 — a Korean-first Bible app (React Native + Expo Router, web-first via
`expo start --web`, deployed to Vercel). Backend is Supabase (Postgres +
Auth + RLS). Community features (posts, reading rooms, reading plans) all
live in Supabase; Bible text/commentary/QT-schedule data is bundled as a
local SQLite file shipped with the app (via `expo-sqlite`), built by
`scripts/build-bible-db.mjs` from source data in `scripts/bible-source-data/`.

- Repo: `dicipleofjx2-dot/bible-app` on GitHub
- Deployed: https://dicipleofjx-bible.vercel.app
- Local dev: `.claude/launch.json` has a `bibleapp-web` preview config (npm
  script `web` → `expo start --web`, port 8081)

## Tech stack

- Expo ~57, React Native 0.86, React 19.2, TypeScript ~6, Expo Router
  (file-based routing under `src/app`)
- Supabase JS client (`src/lib/supabase.ts`), env vars
  `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`
- Local Bible text/commentary/QT data via `expo-sqlite` (bundled `.db` file,
  see `src/db/bible.ts`, `src/db/commentary.ts`)
- **IMPORTANT project-specific instruction (see `AGENTS.md`/`CLAUDE.md`):
  Expo has changed recently — check the versioned docs at
  https://docs.expo.dev/versions/v57.0.0/ before writing Expo-specific code.**

## Directory map

```
src/
  app/                      # Expo Router screens (file-based routing)
    (tabs)/                 # Bottom-tab screens
      index.tsx             # 홈 — 4x3 emoji menu grid (app launcher), see
                             #   "Core features" #1 below
      meditation.tsx        # 말씀묵상 — QT passage + note-taking + "오늘의 성경통독"
      word-notes.tsx        # 말씀노트 — all-notes list (from 말씀묵상). Moved
                             #   into (tabs)/ this session so it's a real tab
                             #   (was a top-level route before) — path is
                             #   still /word-notes, unchanged for existing links
      read.tsx               # 읽기 — free Bible reading, verse actions
      bible-reading.tsx     # 성경통독 — reading plan CRUD + 성경통독방 (rooms) CRUD
      search.tsx             # 검색 — full-text verse search
      notes.tsx               # 암송구절 — verse highlights/memorization
      commentary.tsx        # 주석 — 만나주석/매튜헨리 commentary + text-block
                             #   highlighting (see "Core features" #4)
      community.tsx         # 커뮤니티 — post feed, room invite banner
                             # ^ tab bar order top-to-bottom in this list is
                             #   the actual order now: 홈-묵상-노트-읽기-통독-
                             #   검색-암송-주석-커뮤니티 (user-specified)
    plans/[slug].tsx        # single reading-plan detail (chapter grid, progress)
    plans.tsx               # read-only plans list, linked from read.tsx's
                             #   "읽기계획 보기" link (separate from the
                             #   full create/delete UI embedded in bible-reading.tsx)
    rooms.tsx               # standalone room list/create/join (only reachable
                             #   via direct link now; community's nav link to
                             #   it was removed — see "Recent changes" below)
    rooms/[id].tsx           # single room: chat, activity feed, invite, delete
    post/[id].tsx            # single community post + comments
    profile.tsx              # user profile / skin picker
    spiritual-journal.tsx    # 영성일기 — placeholder (ComingSoon), reads ?date=
    priorities.tsx           # 우선순위 — placeholder (ComingSoon), reads ?date=
    kingdom-finance.tsx      # 천국재정 — placeholder (ComingSoon), reads ?date=
    prayer-group.tsx         # 샬롬기도단 — placeholder (ComingSoon), NOT
                             #   calendar-linked (by design, see 달력 below)
    calendar.tsx             # 달력 — month grid, KR holidays + Hebrew date per
                             #   day, tap a day → jump to 영성일기/우선순위/
                             #   천국재정 for that date (see "Core features")
  db/                       # All Supabase/SQLite data-access functions live here
    plans.ts                # reading plans (create/get/delete, today's-reading lookup)
    rooms.ts                # reading rooms (성경통독방): create/join/invite/delete
    community.ts            # posts + comments
    bible.ts                # local SQLite: books, verses, chapter counts, search
    commentary.ts           # commentary text (Supabase)
    profile.ts              # user profile/skin
    userData.ts             # meditation notes, verse highlights (local + Supabase mix — check per-function)
  features/                # Larger reusable UI pieces (AuthForm, BookChapterPicker, VerseActionSheet)
  lib/                      # supabase client, auth context, hebrew-date calc, skin/theme context
    hebrew-date.ts          # getHebrewDateKST/getKoreanDateKST (full date strings)
                             #   + getHebrewDayLabelKST (compact "월 일" for calendar cells)
    korea-holidays.ts       # hardcoded KOREA_HOLIDAYS map (2025–2027), getHoliday(dateString)
                             #   — needs a manual top-up for years beyond 2027
  components/               # ThemedText/ThemedView/UI primitives
  constants/theme.ts        # Spacing scale, MaxContentWidth (800), colors
supabase/migrations/        # 0001–0014, applied in order manually via Supabase SQL Editor
scripts/                    # build-bible-db.mjs + bible-source-data/*.json (source texts)
```

## Core features (as of last session)

1. **홈** — app-launcher style menu grid (redesigned across this session and
   the previous one). Has **no top toolbar at all** — the web tab bar
   (`CustomTabList` in `components/app-tabs.web.tsx`) is conditionally
   hidden (`display:'none'`, via `usePathname() === '/'`) specifically on
   the home route; the `TabTrigger`s stay mounted (not unmounted) so route
   registration/tab switching keeps working when you navigate away and
   back — verified this round-trips cleanly in-browser. In its place,
   `(tabs)/index.tsx` shows: a big centered **"데이빗바이블"** title
   (`type="title"`, replacing the old "주안에서" text — 프로필 access is
   **not** on 홈, only via 커뮤니티's header link); a small left-aligned
   "📅 {date}" widget below the title (`getTodayLabelKST()`, tap →
   `/calendar`); then the 4×3 emoji-icon grid (`MENU_ITEMS`). Grid tile
   icons use **`width:'78%'` + `aspectRatio:1`**, not a fixed pixel size —
   an earlier fixed-84px version visually overflowed into the *next*
   tile's hit-test area on narrow/mobile viewports (confirmed via
   `getBoundingClientRect()` at 375px width: icons were wider than their
   own 25%-column, so taps near a tile's edge could fire the *neighboring*
   tile's `onPress`). If tiles are resized again, keep icon width relative
   to the tile, never a fixed px value, or this regresses. 8 of 12 tiles
   map to real tabs/pages (말씀묵상/말씀노트/성경읽기/성경통독/관주검색→
   `/search`/암송구절/주석/커뮤니티); 영성일기/우선순위/천국재정 all route
   to **`/calendar`** (not their own placeholder pages — user wants those
   three reached *through* the calendar, presumably picking a date first);
   샬롬기도단 still routes to its own `ComingSoon` placeholder
   (`/prayer-group`). 성경통독/커뮤니티/샬롬기도단 (the three
   auth-gated features) get a 3px amber (`#f59f00`) border on their icon
   box (`requiresAuth` flag on the `MenuItem`), with a legend line below
   the grid explaining the mark. The 4 `ComingSoon` placeholders are
   registered in `src/app/_layout.tsx`'s `Stack` with `headerShown:true`
   for the native back button. QT passage + prev/next day nav lives only
   in 말씀묵상 (`(tabs)/meditation.tsx`), unchanged.
2. **달력 (`calendar.tsx`)** — full month-grid screen. On **other** tabs
   (not home), reached via a 📅 button at the far left of the web top
   toolbar; on 홈 it's reached via the small date widget described above,
   *or* via the 영성일기/우선순위/천국재정 icons (홈 intentionally does
   **not** embed the calendar grid itself — just a one-line summary/entry
   point that links out). Month grid (prev/next nav, tap the month label
   to jump to today), each day cell shows the Gregorian day number, a
   compact Hebrew date (`getHebrewDayLabelKST`), and a 대한민국 공휴일
   label if one exists (`lib/korea-holidays.ts`, hardcoded 2025–2027 —
   **will need a manual update for 2028+**). Tapping a day opens an
   action-sheet modal with buttons for 영성일기/우선순위/천국재정 that
   `router.push` to that screen with `?date=YYYY-MM-DD` (샬롬기도단 is
   intentionally **not** linked — not requested). `/calendar` is a
   top-level Stack route (not inside `(tabs)`), so it always shows its own
   native header + back button and never the tab bar, on any tab.
3. **말씀묵상** — same QT passage with prev/next day navigation, a note
   textarea (`묵상 저장하기`), a link to all saved notes (`말씀노트 보기` —
   now sits next to the save button, same pill styling), and an
   **"오늘의 성경통독"** section: for every 성경통독방 (reading room) the
   user has joined, shows today's date-mapped reading chunk grouped by book.
4. **읽기 / 검색 / 암송구절** — free reading, FTS5 search, verse
   highlighting — largely stable, not touched in the recent sessions
   covered by this doc.
   **주석** (commentary, 만나주석/매튜헨리) got a new feature this session:
   **block-select text highlighting**, separate from the existing
   whole-verse-+-commentary highlight bar at the bottom (`saveHighlight`/
   `upsertMark`, unchanged). Web-only (relies on the browser's
   `Selection`/`Range` API — there's no equivalent for plain RN `Text` on
   native, so this doesn't work in a native build). Select any run of
   commentary text → a color-picker bar appears with the selected text
   previewed → tap a color to apply a background highlight to just that
   substring; **re-select the exact same range and tap the same color
   again to remove it** (tap a *different* color on the same range to
   change its color instead). Implementation:
   - `components/commentary-text.tsx` — `CommentaryText` now takes a
     `highlights` prop (`{start,end,color}[]`, offsets into the plain
     rendered text) and is a `forwardRef` so the screen can grab the
     underlying DOM node; `commentaryPlainText(html)` exposes the exact
     plain-text the offsets are measured against (derived from the *same*
     tokenizer used for rendering, so they can never drift out of sync
     with what's on screen — don't add a second, separately-implemented
     HTML stripper for this text, reuse `commentaryPlainText`).
   - `(tabs)/commentary.tsx` — a `document.addEventListener('mouseup'/
     'touchend', …)` effect (guarded by `Platform.OS === 'web'`) computes
     the selection's plain-text offsets via the standard
     "pre-selection-range `.toString().length`" trick, and the
     apply/toggle/color-change logic lives in `applyTextHighlight`.
   - `db/userData.ts` — new local SQLite table
     `commentary_text_highlights` (book_id, chapter, verse, source,
     start_offset, end_offset, color) + CRUD functions
     (`getCommentaryTextHighlights`/`addCommentaryTextHighlight`/
     `updateCommentaryTextHighlightColor`/`deleteCommentaryTextHighlight`).
     Reuses the existing `COMMENTARY_HIGHLIGHT_COLORS` palette (same 4
     pale hues as the whole-verse feature) for visual consistency, but
     it's a fully separate table/feature — no data relationship between
     them.
   - Verified end-to-end in-browser by scripting a real DOM `Selection` +
     dispatching a real `mouseup` (couldn't drag-select with the browser
     tool directly): apply → correct background color rendered on exactly
     the selected substring; re-select same range + same color → removed
     (background back to transparent). Reload-persistence (does it survive
     a page refresh) wasn't independently re-verified this session, but
     uses the exact same local-SQLite read/write pattern as
     `verse_marks`/`meditation_notes` in the same file, which already work.
5. **성경통독 tab** —
   - Create a reading plan: pick a book/chapter range, a duration (1주 /
     1달 / 3달 / 6달 / 1년 / 직접 설정) or custom start+end date. Chapters
     are spread evenly across the days (`distributeAcrossDays`, remainder
     goes to the earliest days so the last day always lands on `end_date`).
   - 읽기계획 목록: lists all plans; **creator can delete their own plan**
     (button only shows when `created_by === userId`; confirms via modal;
     DB cascade wipes the plan's days/progress/any room built on it).
   - 성경통독방 (rooms): create a room tied to a plan + invite code, browse
     all rooms, join via invite code, see "내 성경통독방".
6. **plans/[slug] (계획 상세)** — shows every day's chapters as a
   **responsive tile grid** (not one row per chapter) — `numColumns`
   computed from viewport width vs `MaxContentWidth` (~9–10 columns at
   800px). Uses a hardcoded Korean book-abbreviation table (`KOREAN_BOOK_ABBREV`)
   instead of the DB's English `books.abbrev` column. Tap a tile → go read
   that chapter; small corner checkbox → toggle that day complete.
7. **rooms/[id]** — room chat, member activity feed, invite by profile
   search, room delete (owner only, cascades via `plan_id`... actually via
   `reading_rooms.id` cascade to members/activity/messages).
8. **커뮤니티** — post feed with comments, delete-your-own-post. The
   "읽기방" header link (→ `/rooms`) was **removed** — room management now
   lives only in 성경통독 tab. The pending-invite banner ("~님이 읽기방에
   초대되었어요") was deliberately **kept** since it's a direct
   per-invite notification, not a room-browsing entry point.
9. **말씀노트 (word-notes.tsx)** — flat list of all saved meditation notes
   across all dates, tap to jump back to that day in 말씀묵상, delete
   per-note. Cards now correctly fill the column width regardless of note
   length (see bug fix below).

## Data model quick reference

- `reading_plans` (id, slug, title, description, start_date, end_date,
  created_by) — `created_by` nullable (legacy/seeded plans have `null` and
  are effectively undeletable via the UI, matching RLS: only the creator
  can delete).
- `reading_plan_days` (plan_id → cascade, day_number, book_id, chapter)
- `reading_plan_progress` (user_id, plan_id → cascade, day_number)
- `reading_rooms` (plan_id → **cascade** — deleting a plan deletes its rooms
  too), `room_members`, `room_activity`, room chat table (see migration 0005)
- `posts` / comments — community feed
- Local SQLite (bundled, not Supabase): `books`, `verses`, `qt_schedule`,
  commentary text — see `scripts/build-bible-db.mjs` for how it's built.

## Established workflow patterns (important — follow these)

- **Never commit without an explicit "커밋해줘" / "모두 커밋" etc.**
- **Never `git push` without an explicit "배포해줘".** Vercel auto-deploys
  on push to `main`.
- After committing, this doc's "Last updated" line and the "Recent changes"
  section below should be refreshed.
- Migrations in `supabase/migrations/` are **not** auto-applied — always
  hand the user the raw SQL and ask them to run it in the Supabase SQL
  Editor, then confirm afterward (a read-only REST query against the
  affected table with the anon key is a safe way to verify a migration
  actually ran, without needing to log in).
- Claude cannot log in to the app (password entry is off-limits), so
  anything gated behind auth (does the delete button *actually* appear and
  work for an owning account, does a real multi-day/multi-book room render
  correctly, etc.) needs the user to manually verify in-browser.
- Dev preview: `mcp__Claude_Browser__preview_start` with name
  `bibleapp-web` (port 8081). Full-page `navigate()` calls do a **hard
  reload** — local SQLite-backed data (meditation notes, highlights) is
  fine across reloads if persisted, but don't assume a save completed if
  you navigate away immediately after clicking save; wait for the UI's own
  "저장됨"/success confirmation first.
- Text input via the browser tool's `computer.type` action has been flaky
  for RN Web `TextInput`s in this project (typed text silently not
  registering) — prefer `form_input` (fill by ref) when testing forms.
- `computer.left_click` on a tab that's done several full `navigate()`
  hard-reloads (or after closing a sibling tab) can silently no-op — no
  error, `get_page_text` just shows the same page unchanged. Seen this
  session on `/` and `/calendar`. Fix: open a **fresh tab**
  (`tabs_create`) and `navigate()` there once instead of reusing a
  well-traveled tab; clicks worked immediately on the fresh tab. Note
  this before concluding a click-driven interaction is actually broken.
- The **"Tab Context" trailer** in tool results (the `Available tabs:
  tabId … "url"` line) can be **stale/wrong** — seen it report a
  navigation that never actually happened (confirmed via `get_page_text`
  showing the previous page still rendered) both after a `read_page` call
  and after a read-only `javascript_tool` query that didn't touch
  navigation at all. Never trust that line as evidence a click worked or
  that the page changed — always confirm with `get_page_text` /
  `read_console_messages` / a targeted `javascript_tool` DOM check.
- For anything needing real DOM `Selection`/`Range` state (e.g. testing
  text-highlighting), `computer`'s drag-select isn't available/reliable
  here — script it instead: build a `Range` over a known text node with
  `document.createTreeWalker`, `selection.addRange(range)`, then
  `document.dispatchEvent(new MouseEvent('mouseup', {bubbles:true}))` to
  fire whatever `mouseup` listener the app has. After a `.click()` on a
  React-controlled element, **await a short `setTimeout` before
  re-querying the DOM** — the re-render from React's state update isn't
  synchronous with the dispatched event, so an immediate follow-up query
  in the same script will still see the pre-click DOM.

## Recent changes (most recent first)

- **(this session, uncommitted)** — Five user-requested fixes/features in
  one pass: (1) fixed the home icon-grid tap-mismatch bug (see "Core
  features" #1 — fixed-px icons overflowing into the neighbor tile's hit
  area on narrow screens); (2) 영성일기/우선순위/천국재정 icons now route to
  `/calendar` instead of straight to their placeholders; (3) added 주석
  block-select text highlighting (see "Core features" #4); (4) added an
  amber border + legend to the 3 auth-gated icons (성경통독/커뮤니티/
  샬롬기도단); (5) moved 말씀노트 into `(tabs)/` as a real tab and
  reordered the whole tab bar to 홈-말씀묵상-말씀노트-읽기-성경통독-검색-
  암송구절-주석-커뮤니티 (both `app-tabs.web.tsx` and the native
  `app-tabs.tsx` — verified the web order in-browser; native wasn't
  runnable to check but the trigger list mirrors the web one exactly).
- **(previous session, uncommitted)** — Home screen follow-up: the web tab bar
  (`app-tabs.web.tsx`) is now conditionally hidden on 홈 only (`usePathname
  () === '/'`, styled `display:'none'` rather than unmounted, so tab
  routing state isn't disturbed); `(tabs)/index.tsx` dropped its
  "✝️ 주안에서 👤" header row in favor of a big centered "데이빗바이블"
  title + a small left-aligned date/calendar widget beneath it (links to
  `/calendar`); grid tiles enlarged 60px→84px with tighter gaps. Verified
  the home↔other-tab round trip and all click paths in-browser on a fresh
  tab (see troubleshooting note above about stale-tab click flakiness).
- **`4f31755`** — Added a 달력 screen (`calendar.tsx`):
  month grid with 대한민국 공휴일 (`lib/korea-holidays.ts`, hardcoded
  2025–2027) and a compact Hebrew date per day (`getHebrewDayLabelKST`,
  new helper in `lib/hebrew-date.ts`). Reached via a new 📅 button
  wrapping the existing date label at the far left of the web toolbar
  (`components/app-tabs.web.tsx`). Tapping a day opens an action sheet
  linking to 영성일기/우선순위/천국재정 with `?date=` (added
  `useLocalSearchParams` + a `date` prop on `ComingSoon` to show it).
  Verified end-to-end in-browser this time (see commit below for the
  previous session's items that couldn't be checked live).
- **`3b8d2d9`** — Redesigned 홈 (`(tabs)/index.tsx`) from the
  QT-passage card into a 4×3 emoji-icon menu grid per a user-provided
  mockup; added 4 new placeholder routes (영성일기/우선순위/천국재정/
  샬롬기도단) via a shared `ComingSoon` component, registered in
  `_layout.tsx`. Also fixed `community.tsx`'s post `FlatList` — same
  "no `style` prop, only `contentContainerStyle`, inside an
  `alignItems:'center'` parent" bug as the word-notes fix below, confirmed
  present and fixed the same way (this was the "suspected same-shape bug"
  flagged as a follow-up in the previous session).
- **`0af3da3`** — Fixed `deletePlan()`/`createPlan()` leaving a stale
  `plansCachePromise` around after invalidating `plansCache`, so a deleted
  plan only disappeared from 읽기계획 목록 after a manual refresh (now
  `invalidatePlansCache()` clears both, plus an optimistic `setPlans`
  filter for instant UI feedback). Moved "말씀노트 보기" next to "묵상
  저장하기" in 말씀묵상 with matching pill styling. Fixed `word-notes.tsx`
  note cards shrinking to their text length instead of filling the column
  — root cause was `FlatList` having `contentContainerStyle` but no
  `style` prop, so on web it collapsed to content size inside its
  `alignItems:'center'` parent; fixed with `style={{width:'100%'}}`.
- **`8596fe6`** — Added `deletePlan()` (RLS-scoped to creator, DB cascades
  clean up days/progress/rooms) + delete button/confirm modal in 성경통독
  plan list. Removed the "읽기방" link from 커뮤니티's header.
- **`2879c74`** — Reworked `plans/[slug].tsx`'s chapter list from one
  full-width row per chapter into a responsive tile grid; swapped the
  DB's English `abbrev` for a hardcoded Korean abbreviation table.
- **`3895eee`** — Added calendar date ranges to reading plans (duration
  presets or custom start/end date), even chapter distribution across
  days, and an "오늘의 성경통독" section in 말씀묵상 grouped by book
  (fixing a bug where a day spanning two books would render wrong).
  Migration `0014_reading_plan_dates.sql` (adds `start_date`/`end_date`
  columns) was written and has been run in Supabase.

## Known follow-ups / not yet done

- **Not verified**: whether the plan-delete button actually *appears and
  works end-to-end* for an account that owns a plan (only verified the
  negative case — hidden for non-owners — since Claude can't log in).
- 4 placeholder pages (영성일기/우선순위/천국재정/샬롬기도단) are
  intentionally empty — real content/features TBD whenever those are
  scoped out. Once 영성일기/우선순위/천국재정 get real data models, make
  sure they actually *use* the `date` param the calendar already passes
  them (currently `ComingSoon` just echoes it back as text). Note: as of
  this session those 3 are no longer directly reachable from 홈's grid —
  only via 달력's action sheet — so if a future direct 홈 link is wanted
  back, that's a one-line `href` change in `MENU_ITEMS`.
- 주석 text-block highlighting is **web-only** (see "Core features" #4) —
  no fallback/message shown on native, selecting text just does nothing
  special there. If native support is ever wanted, it needs a real
  selection-tracking library (RN's plain `Text` has no selection-range
  API), which isn't installed.
- `lib/korea-holidays.ts` only has data through 2027 — extend
  `KOREA_HOLIDAYS` before the calendar is used for 2028 dates (mostly
  matters for 설날/추석/부처님오신날, which shift every year; fixed-date
  holidays are easy to guess but don't skip verifying substitute-holiday
  rules).
- 달력 entry points (the 홈 date widget, and the 📅 button on the web
  toolbar for every other tab) only exist on **web** — there's no
  equivalent on the native `NativeTabs` bar (`app-tabs.tsx`, used for
  iOS/Android) since that one has no header row to put anything in;
  native would need its own design (e.g. a header-right button) if ever
  wanted.
- 홈 no longer has a profile-icon shortcut (it was on the header row that
  got removed) — 프로필 is still reachable via 커뮤니티's header link, but
  if that ever changes too, users would have no way to reach `/profile`.
- Legacy reading plans with `created_by = null` (e.g. "요한복음 21일
  통독") are undeletable by anyone through the UI (RLS requires
  `auth.uid() = created_by`) — not necessarily a bug, just a known gap if
  cleanup of seed data is ever wanted.
- No automated tests in this repo; verification has been manual
  (`tsc --noEmit` for types + live browser check for behavior).
