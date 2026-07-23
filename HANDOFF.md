# BibleApp — Handoff / Status Reference

Last updated: 2026-07-16. `4f31755` (calendar feature) is pushed and
deployed. Everything below this point (home-screen toolbar/title rework,
icon-grid overlap fix, tab reorder + 말씀노트 tab, 주석 text-highlighting, tab
bar horizontal scroll, commentary caching, 영성일기/우선순위/천국재정 real
implementations, 샬롬기도단 login-gated prayer board with inline comments,
the embedded-calendar rework, the tab-bar-scroll/샬롬기도단 FK follow-up
fixes, 커뮤니티 comment moderation, the highlight-removal/box-resize round,
and this session's 샬롬기도단 chat-room-height/comment-bubble-color round —
see directly below) is **not yet committed** — check `git log` / `git
status` for the current head.

**✅ Tab-bar horizontal scroll — user confirmed working** (part 3's
"still isn't fixed" report resolved; likely was the deployed-vs-local
mismatch flagged at the time, per the ⚠️ note that used to be here).

**✅ `0018_comment_hide_and_moderation.sql` has been run by the user and
confirmed** — verified via a read-only REST query
(`comments?select=id,hidden`) returning `hidden` values without error.
커뮤니티 comment hide/delete (see "Core features" #8) should be live;
**the actual hide/unhide/delete flow itself is still unverified**
end-to-end since Claude can't log in — ask the user to click through it
per the checklist that was given in chat.

**Part 4** (highlight removal + composer box-resize on 샬롬기도단) landed
with no reported issues — the user moved straight on to part 5's request
without pushback, but this was never an explicit "confirmed working," so
treat it as probably-fine rather than verified if it comes up again.

**This session (part 5)**: two more user-requested changes to
샬롬기도단, landed together — see "Core features" #13 and "Recent
changes" part 5 below:
1. **Layout restructure to fill the screen like a chat room** ("중보기도
   채팅방을 하단 본문의 크기에 맞게 키워주고"): the whole screen used to
   be one big page-level `ScrollView` (title + composer + every request
   card all scrolled together, so the feed was only ever as tall as its
   own content). Now the title/error-banner/new-request-composer are a
   fixed top section, and the request feed is a `FlatList` with
   `flex: 1` that fills all remaining vertical space down to the bottom
   of the screen — mirrors the existing chat-room pattern already used in
   `rooms/[id].tsx` (fixed header + flex-filling `FlatList` + no
   page-level scroll). This was an **inference, not an explicit user
   spec** — "채팅방" (chat room) and "하단 본문의 크기에 맞게 키워주고"
   (enlarge to match the lower body's size) were read as "make this feed
   fill the viewport like the app's other chat-room screen does," which
   is the strongest existing precedent in this codebase for what a
   Korean-speaking user would mean by "chat room." **If this isn't what
   was meant, the fallback interpretation is a purely visual/width
   change** (the feed already used `MaxContentWidth` before this change,
   so there wasn't an obvious width problem to fix) — flag this if the
   user says it's still not what they wanted.
2. **Comment bubbles now have a distinct background color from the
   request card**: `commentRow` previously had no background at all
   (fully transparent, sitting directly on the request card's
   `theme.backgroundElement`); it now gets `theme.background` (the
   screen's base background color — the same token the comment composer
   already used) plus padding/`borderRadius` so it reads as its own
   nested bubble, addressing "기도제목창과 댓글창의 색깔을 다르게 해줘."
   No new color was introduced — this pairs two colors that already
   existed in every skin's palette (`theme.background` vs
   `theme.backgroundElement`, see `constants/theme.ts`), so it holds up
   correctly across all 4 skins and both light/dark, not just the
   default one.
`tsc --noEmit` clean; grep-confirmed no other file imports the touched
exports. Rendered with zero console errors on a fresh dev server (own
instance, alternate port — see "Browser verification" note). **The
FlatList/flex-fill behavior specifically could not be visually confirmed**
— it only matters once there's a logged-in session with real requests to
scroll through, and Claude can't log in; ask the user to check whether the
feed now visually extends to the bottom of the screen instead of stopping
short, and whether comment bubbles look distinctly colored from the
request card behind them.

**✅ `0017_fix_prayer_profile_relationships.sql` has been run by the user and
verified working** (see "Migration status" and the "this session, part 2"
bullet in "Recent changes" for the root-cause writeup). Verified end-to-end
in-browser this session: reloaded `/prayer-group` post-migration and the
user's real posts + inline comment ("성령께서 함께 하십니다.") rendered with
no error banner (previously always empty/broken). Also cleaned up 2 test
posts (`test-bible-reading-verify@example.com`) that had been silently
inserted during this session's debugging but were invisible until the
migration ran — deleted via the app's own delete button/confirm flow, so
the live board now only has the user's real content.

**This session, part 2** (a later follow-up in the same session/conversation
as the embedded-calendar rework described in "part 1" below) — two more
user-reported bugs, both root-caused and fixed:
1. **Top web toolbar had no working horizontal scroll**, despite
   `components/app-tabs.web.tsx` already wiring up a horizontal `ScrollView`
   (`tabScroll`) in a previous session. Root cause: `innerContainer` (the
   pill wrapping the 📅 button + the ScrollView) had `flexGrow: 1` but no
   `flexShrink`, and **React Native's default `flexShrink` is `0`**, unlike
   web CSS's default of `1`. On a narrow viewport the pill refused to shrink
   below its content width and just overflowed `tabListContainer`'s
   centered layout (spilling off both edges, confirmed via
   `getBoundingClientRect()` showing `left: -190` at 420px width) — the
   ScrollView never got a bounded parent to clip/scroll within, so nothing
   was ever scrollable. Fix: added `flexShrink: 1` to `innerContainer`.
   Verified in-browser at 420px (tabs now clip to a 64px-wide scrollable
   strip and `scrollLeft` actually moves later tabs into view) and 1280px
   (no regression — all 9 tabs still fit centered, unchanged from before).
2. **샬롬기도단 (`prayer-group.tsx`) — posting a 기도제목 never made it
   appear, even though the compose-then-appear-inline + comments +
   hide/delete UI was all already built** (see "Core features" #13 below —
   that implementation was correct). Root cause, found by temporarily
   logging the swallowed error in `load()`: every `getPrayerRequests()` /
   `getPrayerComments()` call was throwing
   `PGRST200: Could not find a relationship between 'prayer_requests' and
   'profiles' in the schema cache` — because `0015_prayer_group.sql` pointed
   `prayer_requests.user_id`/`prayer_comments.user_id` at `auth.users(id)`
   instead of `public.profiles(id)`, so PostgREST couldn't resolve the
   `profiles(username)` embed used for the author name. **This exact class
   of bug was already hit and fixed once before** for `posts`/`comments`/
   `room_activity` in `0004_fix_profile_relationships.sql` — `0015` (written
   in a later session) just didn't carry that lesson forward. The error was
   being silently swallowed by a bare `.catch(() => [])` in `load()`, so the
   symptom looked exactly like "nothing happens" — inserts succeeded fine
   (they only need the FK to `auth.users`, satisfied either way), but the
   list never showed anything, on every load, for every user, forever
   (not a flaky/edge-case bug — 100% reproducible, confirmed in-browser).
   Fixed via new migration `0017_fix_prayer_profile_relationships.sql` —
   **user ran it and it's confirmed working** (verified in-browser: reload
   after the migration showed the real posts + inline comments with no
   error, where before it was always empty). Also: (a) removed the unused
   `prayer_comments(count)` aggregate embed from `getPrayerRequests()`/
   `getPrayerRequest()` (`PrayerRequest.commentCount` was computed but never
   rendered anywhere in the UI — dead code, and aggregate embeds are a
   separate PostgREST feature that must be explicitly enabled per-project,
   so it was also a latent fragility risk independent of the FK bug); (b)
   `load()` in `prayer-group.tsx` now surfaces the existing `errorMessage`
   banner if `getPrayerRequests()` fails, instead of silently showing an
   empty list — so a future regression here will be visible instead of
   looking like "no data yet". `tsc --noEmit` clean.

**This session, part 1 (embedded-calendar rework)** — un-linked the
standalone `/calendar` screen from
영성일기/우선순위/천국재정 (it previously opened an action-sheet on day-tap
with buttons to jump into one of those three with `?date=`; that's gone —
tapping a day on `/calendar` now just shows Hebrew date/holiday info, no
navigation). Instead, each of the three screens now has **its own embedded
month-grid calendar** at the top (`components/inline-calendar.tsx`, a new
reusable component, factored out of `calendar.tsx`'s grid logic but as an
inline widget, not a route) — pick a date on the calendar and that day's
diary/tasks/ledger content renders immediately below on the same screen, no
navigation away. Days that already have content get a small amber dot under
the date. `(tabs)/index.tsx`'s MENU_ITEMS for 영성일기/우선순위/천국재정 now
point directly at `/spiritual-journal`, `/priorities`, `/kingdom-finance`
(previously all three routed through `/calendar`). Added
`getPriorityTaskDates()` to `db/userData.ts` (priority_tasks had no
"all dates" query before — diary and finance already had one via
`getAllDiaryEntries`/`getAllFinanceEntries`, whose results are reused
client-side for the marked-dates set). `tsc --noEmit` clean. **Not yet
checked by the user** — could not verify in-browser this session (see
"Browser verification" note below, still applies); ask the user to check
`npm run web` locally: open 영성일기/우선순위/천국재정 from the home grid,
confirm the calendar renders at the top, tapping a date swaps the
content below without navigating, and a day you've added content on shows
the amber dot after returning to that screen (may need a re-focus/reload
to see a dot update from a freshly-added entry, since `markedDates` is
recomputed from the same `load()`/`getAllDiaryEntries()` call as the
content itself).

**Migration status**: `0015_prayer_group.sql`, `0016_prayer_color_and_update.sql`,
`0017_fix_prayer_profile_relationships.sql`, and
`0018_comment_hide_and_moderation.sql` have **all been run and confirmed**
(0018 confirmed via REST query this session, see ✅ callout near the top of
this file). `supabase/migrations/` matches the live DB. Note:
`prayer_requests.color`/`prayer_comments.color` (added by 0016) are now
**unused by the app** as of this session's highlight-removal (see "Core
features" #14) but were deliberately left in place — no migration to drop
them. Still outstanding: **no `profiles.is_admin = true` row exists yet** —
the user hasn't granted themselves admin. See "샬롬기도단" below for the
grant SQL.

**Browser verification — UPDATE this session, this old advice was too
absolute**: earlier sessions found the Claude Browser-pane preview tool
could not mount the app at all via `preview_start` (`<SQLiteProviderSuspense>`
threw, permanently blank page). **This session, connecting the Browser pane
directly to the user's own already-running `npm run web` dev server**
(`mcp__Claude_Browser__navigate` / `preview_start` with `{url:
"http://localhost:8081"}`, since `preview_start` with `{name:
"bibleapp-web"}` still fails — port 8081 already in use — rather than
launching a second/parallel instance via the tool's own `preview_start`)
**worked completely fine** — the app mounted, rendered, and was fully
interactive, including a persisted logged-in session (see 샬롬기도단 note
above) that let real Supabase-backed features get tested end-to-end. So:
the SQLite/SharedArrayBuffer failure is specific to the tool spawning its
*own* dev server process, not a hard block on the Browser pane rendering
this app at all — if `npm run web` is already running locally, connect to
it directly via `navigate`/`preview_start{url}` instead of assuming
verification is impossible. (Caveats hit this session, still worth
knowing: `read_network_requests` did not reliably show cross-origin
`fetch` calls to the Supabase host even though they were clearly
happening — don't trust "zero requests logged" as proof a feature isn't
calling out; `computer{action:"screenshot"}` timed out repeatedly — use
`get_page_text`/`read_page`/`javascript_tool` instead; and stale/duplicate
DOM nodes for the same text can linger after a Modal closes, so when
JS-querying for a specific dialog's button, filter by its actual rendered
`getBoundingClientRect()` size/position, not just matching text, or you'll
click a leftover invisible copy.) Still true: don't use `preview_start`
with the `bibleapp-web` launch config while the user's own server holds
port 8081.

**Further update, this session (part 4)**: the `bibleapp-web` launch config
actually lives at the **workspace root**,
`C:\Users\dicip\OneDrive\문서\.claude\launch.json` (not inside
`BibleApp/.claude/`, which doesn't exist — don't create one there, it'll
just be a dead duplicate that the tool ignores; confirmed this the hard
way this session and deleted the stray file afterward). It shells out to
`BibleApp/run-web.cmd` (`cd` into the folder + `npm run web`) with
`autoPort: true`, but **`autoPort` didn't actually help** when 8081 was
taken this session — Expo's own "Use port 8082 instead?" CLI prompt still
surfaced and failed non-interactively (same failure mode as always, just
confirmed again). When you need your **own** server because another
session already owns 8081 (the harness will tell you this via a
PostToolUse hook message like "Another chat's dev server is running in
this folder"), don't fight the launch config — just background your own
with a different port directly: `cd BibleApp && npx expo start --web
--port <N> &` (via the sandboxed Bash tool, not PowerShell — backgrounding
syntax differs), wait for `Get-NetTCPConnection -LocalPort <N> -State
Listen` to show it's up, then `preview_start{url:
"http://localhost:<N>/<route>"}`. This worked cleanly this session (no
`SQLiteProviderSuspense` failure at all, unlike connecting to *someone
else's* already-running server, which still hit that failure both times
it was tried this session) — so a dedicated own-port instance appears to
be the more reliable path going forward, not just a fallback. Kill it
afterward (`Stop-Process` on the PID holding that port) so it doesn't
linger.

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
    spiritual-journal.tsx    # 영성일기 — real diary UI (local SQLite,
                             #   date-keyed), has its OWN embedded month
                             #   calendar at the top (`InlineCalendar`) —
                             #   pick a date there, diary editor + history
                             #   list render below for that date (no more
                             #   ?date= navigation from /calendar — see
                             #   "Core features" #2/#12). Fixed-height editor
                             #   box (doesn't grow with content) + a 4-color
                             #   top-left tag picker per entry.
    priorities.tsx           # 우선순위 (a.k.a. "시간관리") — priority-leveled
                             #   task manager (local SQLite, date-keyed), same
                             #   embedded-calendar pattern as 영성일기.
                             #   Priority is a 1–10 scale (1=가장 급함), not 3
                             #   named tiers.
    kingdom-finance.tsx      # 천국재정 — household ledger/가계부 (local SQLite,
                             #   entries are date-tagged but totals are
                             #   computed across ALL dates), same
                             #   embedded-calendar pattern as 영성일기.
                             #   Category field has preset quick-select
                             #   buttons (수입: 월급/용돈/투자소득/이자배당/
                             #   사업소득/후원금, 지출: 십일조/헌금/저축/투자/
                             #   관리비/식비/외식비/생필품비/의료비/의류비/
                             #   보험비/교육비) alongside free-text entry.
    prayer-group.tsx         # 샬롬기도단 — login-gated prayer-request feed
                             #   (Supabase), NOT calendar-linked (unchanged).
                             #   Comments are now INLINE directly under each
                             #   request card in this one screen (no separate
                             #   detail page — see "Core features" below for
                             #   why that changed) — a 4-color tag picker sits
                             #   top-left of every writable box
                             #   (request/comment composer) and on your own
                             #   saved entries.
    calendar.tsx             # 달력 — standalone month-grid screen, KR
                             #   holidays + Hebrew date per day. Tapping a day
                             #   just shows that day's info (Hebrew
                             #   date/holiday) — it no longer links out to
                             #   영성일기/우선순위/천국재정 (unlinked this
                             #   session, see "Core features" #2/#12); those
                             #   three now have their own embedded calendars
                             #   instead.
  db/                       # All Supabase/SQLite data-access functions live here
    plans.ts                # reading plans (create/get/delete, today's-reading lookup)
    rooms.ts                # reading rooms (성경통독방): create/join/invite/delete
    community.ts            # posts + comments
    prayer.ts                # 샬롬기도단: prayer_requests + prayer_comments
                             #   (Supabase), including hide/unhide, per-row
                             #   color tag setters, and is_admin lookup
    bible.ts                # local SQLite: books, verses, chapter counts, search
    commentary.ts           # commentary text (Supabase) — cached in-memory
                             #   (sources/chapter-verses/verse-text), see
                             #   "Core features" below
    profile.ts              # user profile/skin
    userData.ts             # meditation notes, verse highlights, diary
                             #   entries (+ color tag), priority tasks,
                             #   finance entries (all local SQLite — check
                             #   per-function). Exports `TagColor` (the 4 base
                             #   highlight hues, no "commentary-" variant) —
                             #   shared by db/prayer.ts too.
  features/                # Larger reusable UI pieces (AuthForm, BookChapterPicker, VerseActionSheet)
  lib/                      # supabase client, auth context, hebrew-date calc, skin/theme context
    hebrew-date.ts          # getHebrewDateKST/getKoreanDateKST (full date strings)
                             #   + getHebrewDayLabelKST (compact "월 일" for calendar cells)
    korea-holidays.ts       # hardcoded KOREA_HOLIDAYS map (2025–2027), getHoliday(dateString)
                             #   — needs a manual top-up for years beyond 2027
  components/               # ThemedText/ThemedView/UI primitives
    inline-calendar.tsx      # `InlineCalendar` — reusable embedded month-grid
                             #   date picker (not a route), used by
                             #   spiritual-journal.tsx/priorities.tsx/
                             #   kingdom-finance.tsx. Props: selectedDate,
                             #   onSelectDate, markedDates (Set<string> of
                             #   "YYYY-MM-DD" to show an amber dot under).
                             #   Grid-building logic duplicated from
                             #   calendar.tsx's (kept separate on purpose —
                             #   calendar.tsx is a standalone info screen with
                             #   a selection-modal + Pressable list rendering
                             #   quirks of its own; extracting a fully shared
                             #   component wasn't worth the coupling for a
                             #   ~60-line grid builder). If a visual tweak is
                             #   needed to the grid (weekday colors, holiday
                             #   labels, cell sizing), check whether
                             #   calendar.tsx needs the same tweak.
  constants/theme.ts        # Spacing scale, MaxContentWidth (800), colors
supabase/migrations/        # 0001–0016, applied in order manually via Supabase SQL Editor
                             #   (all run and confirmed as of this session)
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
   to the tile, never a fixed px value, or this regresses. 11 of 12 tiles
   map to real pages (말씀묵상/말씀노트/성경읽기/성경통독/관주검색→
   `/search`/암송구절/주석/커뮤니티/영성일기/우선순위/천국재정 — the last
   three route **directly** to `/spiritual-journal`, `/priorities`,
   `/kingdom-finance` as of this session, no longer through `/calendar` —
   see #2/#12); 샬롬기도단 still routes to its own `ComingSoon` placeholder
   (`/prayer-group`). 성경통독/커뮤니티/샬롬기도단 (the three
   auth-gated features) get a 3px amber (`#f59f00`) border on their icon
   box (`requiresAuth` flag on the `MenuItem`), with a legend line below
   the grid explaining the mark. The 4 `ComingSoon` placeholders are
   registered in `src/app/_layout.tsx`'s `Stack` with `headerShown:true`
   for the native back button. QT passage + prev/next day nav lives only
   in 말씀묵상 (`(tabs)/meditation.tsx`), unchanged.
2. **달력 (`calendar.tsx`)** — standalone info-only month-grid screen. On
   **other** tabs (not home), reached via a 📅 button at the far left of the
   web top toolbar; on 홈 it's reached via the small date widget described
   above. Month grid (prev/next nav, tap the month label to jump to today),
   each day cell shows the Gregorian day number, a compact Hebrew date
   (`getHebrewDayLabelKST`), and a 대한민국 공휴일 label if one exists
   (`lib/korea-holidays.ts`, hardcoded 2025–2027 — **will need a manual
   update for 2028+**). Tapping a day opens a modal showing that day's full
   Hebrew date + holiday (if any) — **as of this session it no longer links
   out to 영성일기/우선순위/천국재정** (that action-sheet with 3 buttons was
   removed; those three screens now each embed their own calendar instead,
   see #12/`InlineCalendar` in the directory map). `/calendar` is a
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
   **This session**: comments in `post/[id].tsx` now support the same
   hide/delete moderation as 샬롬기도단 (see #13) — allowed for the
   comment's own author, the post's author, or an admin (`getIsAdmin`,
   moved to `db/profile.ts` this session since it's not prayer-specific;
   `db/prayer.ts` now just re-exports it so `prayer-group.tsx`'s import
   didn't need to change). Hidden comments show a dimmed row + "숨김"
   badge to privileged viewers and are filtered out entirely for everyone
   else at the RLS layer (same pattern as `prayer_comments`). New
   migration `0018_comment_hide_and_moderation.sql` adds `comments.hidden`
   and replaces the old "viewable by everyone"/"delete their own" policies
   with hide-aware select/update/delete policies scoped to
   owner/post-owner/admin. **Not yet run** — see migration status below.
   `tsc --noEmit` clean; **not yet verified in-browser** (this session's
   Browser-pane preview hit the known `SQLiteProviderSuspense`/
   `crossOriginIsolated:false` blank-page failure again even connecting to
   the user's own running `npm run web`, so it couldn't render at all this
   time — see "Browser verification" note).
9. **말씀노트 (word-notes.tsx)** — flat list of all saved meditation notes
   across all dates, tap to jump back to that day in 말씀묵상, delete
   per-note. Cards now correctly fill the column width regardless of note
   length (see bug fix below).
10. **웹 상단 툴바 가로 스크롤** (`components/app-tabs.web.tsx`) — the pill-
    shaped tab bar's inner row was a plain `flexDirection:'row'` with no
    overflow handling, so on narrow viewports the 9 tab buttons + 📅 button
    could overflow/squish with no way to reach the later tabs. Fixed by
    splitting `innerContainer` into two parts: the 📅 button stays a
    pinned, non-shrinking sibling (`calendarButton: {flexShrink:0}`), and
    the `TabTrigger` children are now wrapped in a horizontal `ScrollView`
    (`tabScroll`/`tabScrollContent` styles) with `flexShrink:1, minWidth:0`
    — the `minWidth:0` is required on web flexbox for a flex child to
    shrink below its content width at all; without it the row overflows
    instead of becoming scrollable. `showsHorizontalScrollIndicator=false`
    keeps the pill's visual style unchanged. **User reported this still
    didn't scroll — root-caused and fixed this session** (see "Recent
    changes" part 2): `innerContainer` itself was missing `flexShrink: 1`
    (RN defaults `flexShrink` to `0`, unlike web CSS's `1`), so it never
    shrank to fit the viewport in the first place and just overflowed the
    centered `tabListContainer` — the ScrollView's own shrink/scroll setup
    never got a chance to engage. **Verified working in-browser this
    session** at both 420px (scroll confirmed via `scrollLeft`) and 1280px
    (no regression).
11. **주석 로딩 속도** (`db/commentary.ts`) — verse/chapter commentary felt
    slow to appear because every fetch (`getCommentarySources`,
    `getCommentaryVersesForChapter`, `getCommentaryForVerse`) was a fresh,
    uncached Supabase round-trip, including `getCommentarySources()` doing
    an **unfiltered full-table scan** of the `source` column on every tab
    mount just to dedupe it client-side. Fixed by adding module-level
    caches (a single cached promise for `getCommentarySources`, `Map`-based
    promise caches keyed by `book-chapter-source`/`book-chapter-verse-source`
    for the other two) — content is static/admin-seeded so these caches
    never need invalidating, and concurrent calls for the same key share
    one in-flight request instead of firing duplicates. Also added a
    `cancelled` flag to `(tabs)/commentary.tsx`'s verse-change effect so a
    slow, now-stale response can't clobber a newer verse selection if
    responses arrive out of order. **Not yet confirmed by the user** —
    check by tapping through several verses/chapters and confirming
    commentary appears near-instantly, especially on a repeat visit to an
    already-viewed verse.
12. **영성일기 / 우선순위 / 천국재정** (`spiritual-journal.tsx` /
    `priorities.tsx` / `kingdom-finance.tsx`) — real, **local-SQLite-only**
    (not synced to Supabase — no server table exists for these) features.
    **As of this session**, each screen embeds its own `InlineCalendar`
    (see directory map) directly at the top — pick a date there and that
    date's content renders below on the same screen; no more navigating
    through `/calendar`'s action sheet or a `?date=` query param to switch
    screens (home's icons now link straight to each screen — see #1 — and
    `/calendar` itself no longer links to any of the three — see #2). The
    `?date=` search param is still read once as the **initial** date if
    present (for any old bookmarked/deep link), but date changes after that
    are local component state (`useState`), not URL params. Previously
    reached via 달력's per-date action sheet — that flow is gone. Older
    parts of this feature set (**user-confirmed working locally** via
    screenshots, `npm run web`, prior to this session's calendar rework):
    - **영성일기**: one free-text diary entry per date (`diary_entries`
      table, `date TEXT UNIQUE` + `color`), a "지난 기록" list of all past
      entries below (tap one to jump to that date — now via the same local
      `setDate`, not `router.setParams`; per-entry delete). Editor box is a
      **fixed `height: 200`** (not `minHeight`) — long entries scroll inside
      the box instead of growing it and pushing the rest of the page down
      (this was a user-reported bug fix). Has a 4-color tag picker (see item
      14). Calendar's marked-date dots come from this same `history` list
      (`getAllDiaryEntries()`), no extra query needed.
    - **우선순위** (user also calls this "시간관리"): a per-date task list
      (`priority_tasks` table) — add a task with a **1–10 priority**
      (1=가장 급함/red → 10=가장 낮음/green, `priorityColor()` interpolates
      hue via HSL; was originally a 3-tier 높음/보통/낮음 chip set, changed
      per user request), list is sorted done-last / priority-number-first /
      oldest-first, tap the circular checkbox to toggle done (strikethrough
      + moved to the bottom), delete per-task. `PriorityLevel` in
      `db/userData.ts` is now a plain `number`, not a `1|2|3` union — no
      DB-side CHECK constraint enforces the 1–10 range, so don't assume
      stored values are always in range if reading this column elsewhere.
      Calendar's marked-date dots come from a **new** query,
      `getPriorityTaskDates()` (added this session — `priority_tasks` had
      no existing "all dates" query, unlike diary/finance), fetched
      alongside the per-date task list in the same `load()` call.
    - **천국재정**: a household ledger/가계부 (`finance_entries` table) —
      add an entry with 수입/지출 type, a **category quick-select chip
      row** (수입: 월급/용돈/투자소득/이자배당/사업소득/후원금 · 지출:
      십일조/헌금/저축/투자/관리비/식비/외식비/생필품비/의료비/의류비/
      보험비/교육비 — tapping a chip fills the category text field, which
      stays freely editable for anything not in the presets; switching
      수입/지출 clears the selected category), amount (numeric-only input,
      non-numeric characters stripped), optional memo; the summary card at
      the top (총 수입/총 지출/잔액) is computed across **all** dates (a
      running ledger), while the list below shows only the
      currently-selected date's entries. Calendar's marked-date dots come
      from the existing `allEntries` list (`getAllFinanceEntries()`,
      already fetched for the running totals), no extra query needed.
    - All three: CRUD lives in `db/userData.ts` (new tables added to the
      same `getUserDb()` `execAsync` block as `verse_marks`/
      `meditation_notes` — see that file if adding a 4th local table).
    - **Not yet checked by the user** — this session's embedded-calendar
      rework hasn't been tested locally yet (see top-of-file note).
13. **샬롬기도단** (`prayer-group.tsx`) — replaced the `ComingSoon`
    placeholder with a **login-required** intercessory-prayer board, using
    fully separate Supabase tables (`prayer_requests`/`prayer_comments`,
    migrations `0015_prayer_group.sql`, `0016_prayer_color_and_update.sql`,
    and `0017_fix_prayer_profile_relationships.sql` — **all three run and
    confirmed working** as of this session; 0017 fixed a bug where
    `prayer_requests`/`prayer_comments.user_id` pointed at the wrong table,
    which made every request/comment fetch throw `PGRST200` and get
    silently swallowed — posting worked but the feed always looked empty.
    See "Recent changes" part 2 for the full root-cause writeup. **Verified
    end-to-end in-browser post-fix**: real posts + an inline comment render
    correctly with no error banner).
    **Single-screen design** (no separate detail page — there *was* a
    `prayer/[id].tsx` detail route in an earlier pass, but it was deleted
    this session when comments moved inline; don't recreate it without
    checking this note first):
    - Same inline auth-gate pattern as 커뮤니티 (`isSupabaseConfigured` →
      `loading` → `!session` → `<AuthForm />`; there's no dedicated login
      route in this codebase). Logged-in users can post a 기도제목 and see
      everyone else's (RLS requires `auth.uid() is not null` to `select`
      from `prayer_requests` — logged-out users see literally nothing, by
      design). Own-request delete only.
    - **This session**: the request composer's `TextInput` and each
      comment's `TextInput` were resized to **exactly match** 커뮤니티's
      composer boxes (`composerInput`/comment `composerInput` in
      `community.tsx`/`post/[id].tsx`) — user-requested. This fell out
      naturally from removing the highlight feature (see #14 below): the
      old boxes had extra `paddingTop`/`paddingLeft` reserved for the
      color-dot overlay, which is exactly why they looked bigger/offset
      compared to 커뮤니티's plain boxes. No dimensions were hand-tuned;
      once the overlay padding was deleted the styles became identical
      (`minHeight:60, padding:Spacing.three` for the request composer;
      `paddingHorizontal:Spacing.three, paddingVertical:Spacing.two,
      flex:1` for the comment composer). User moved on to the next request
      without reporting an issue, so probably fine — never got an explicit
      "confirmed working" though.
    - **This session (part 5)**: screen layout changed from one big
      page-level `ScrollView` to a fixed top section (title/error
      banner/request composer) + a `FlatList` (`feedList` style,
      `flex: 1`) that fills all remaining vertical space — same
      fixed-header-plus-flex-filling-list pattern as `rooms/[id].tsx`'s
      room chat. User-requested ("중보기도채팅방을 하단 본문의 크기에
      맞게 키워주고") but the exact intent was inferred from the app's
      existing "chat room" convention — see the ⚠️/session-summary note
      near the top of this file if this needs revisiting. Also: each
      `commentRow` now has its own `backgroundColor: theme.background`
      (previously transparent) plus padding/`borderRadius`, so comments
      read as a visually distinct bubble nested inside the request card's
      `theme.backgroundElement` — addresses "기도제목창과 댓글창의
      색깔을 다르게 해줘." Both changes reuse existing theme tokens (no
      new colors), so they hold up across all 4 skins and both
      light/dark. **Neither change has been visually confirmed by the
      user** — Claude can't log in, so the `FlatList` fill-to-bottom
      behavior specifically was never seen with real data in it.
    - **Comments render inline, directly under their own request card, in
      the same feed screen** (this was a user-reported UX fix — comments
      used to only be reachable by tapping into a separate detail page).
      `Feed`'s `load()` fetches all requests, then fetches each request's
      comments in parallel (`Promise.all` over `getPrayerComments`) into a
      `commentsByRequest: Record<string, PrayerComment[]>` map — fine at
      the expected scale of a church prayer board, but **not a pattern to
      copy for a high-volume feed** (N+1-style fetch). Posting a request or
      a comment does a full/scoped reload (`load()` or a per-request
      `refreshComments()`) rather than pure client-side optimistic
      insertion, specifically so the UI never shows stale/duplicate state.
    - **Save-flow bug fix**: `submitRequest`/`submitComment` now wrap the
      insert in `try/catch` with a visible `errorMessage` banner instead of
      letting a thrown error (e.g. an RLS violation) silently leave the
      composer un-cleared and the new post/comment missing — a previous
      version had no `catch`, so any insert failure looked exactly like
      "nothing happened," which is what the user reported hitting.
    - Comments can be **hidden** or **deleted** by the comment's own
      author, the prayer request's author (post-owner moderation), or an
      admin (`canModerate` check inline in the render, computed per
      comment). Hiding sets `prayer_comments.hidden = true`; the Postgres
      RLS `select` policy then filters hidden rows out for everyone
      *except* those same three roles — a hidden comment simply never
      reaches the client for an unprivileged viewer (no client-side
      filtering, the row isn't in the response at all). Privileged viewers
      see it with a "숨김" badge (dimmed row) plus "숨김 해제"/"삭제".
    - **Admin concept** — `profiles.is_admin boolean default false`
      (migration 0015). **No self-serve admin UI**; grant manually:
      `update public.profiles set is_admin = true where id = '<uuid>';`
      (or by email, see "Established workflow patterns" below).
      `db/prayer.ts`'s `getIsAdmin(userId)` just reads that column. **As of
      this session, zero profiles have `is_admin = true`** — the user
      hasn't granted themselves yet.
    - **Core posting/list/inline-comment flow verified working this
      session** (see "Recent changes" part 2 — this was blocked by the
      0017 FK bug until the user ran that migration). **Hide/delete
      moderation and the admin path specifically are still unverified** —
      Claude normally can't log in (password entry is off-limits per the
      established workflow below); this session happened to have a
      pre-existing logged-in session persisted in the dev server's browser
      localStorage from the user's own prior testing, which is how the
      posting flow got verified at all — don't assume that'll be true in a
      future session (a fresh browser profile/incognito/cleared storage
      would hit the normal "Claude can't log in" wall again).
14. **4색 하이라이트 태그** (영성일기 only) — a small 4-dot color picker
    (reuses the existing `HIGHLIGHT_COLORS` palette — yellow/green/blue/
    pink — via the `TagColor` type in `db/userData.ts`, a narrower alias
    that excludes the "commentary-" pale variants) sits at the **top-left
    inside the 영성일기 editor box** — tap a dot to tag the entry with that
    color, tap the active dot again to clear it. Backed by
    `diary_entries.color` (local SQLite, plain column, no RLS to worry
    about — it's local-only data). **Removed from 샬롬기도단 this
    session** (user-requested — see "Recent changes" part 4): the
    `ColorPicker`/`ColorBadge` components, `color` state, and the
    overlay-padding hack on the request/comment `TextInput`s were all
    deleted from `prayer-group.tsx`, and `db/prayer.ts` dropped the
    `color` field from `PrayerRequest`/`PrayerComment`, the `color`
    params on `createPrayerRequest`/`addPrayerComment`, and the
    `setPrayerRequestColor`/`setPrayerCommentColor` functions entirely
    (dead code once nothing called them). **`prayer_requests.color`/
    `prayer_comments.color` columns and their RLS policies from
    `0016_prayer_color_and_update.sql` were deliberately left in the DB**
    — no migration was run to drop them, since removing a UI feature
    doesn't require a schema change and the columns are harmless
    (nullable, unused, `null` by default). If a future session wants
    those columns gone too, that'd need a new migration; nothing in the
    app reads or writes them anymore either way.

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
- `profiles.is_admin` (migration 0015, **run**) — boolean, default false, no
  self-serve grant UI (see "샬롬기도단" above); currently **0 rows** have
  it set to true.
- `prayer_requests` (id, user_id, body, **color**, created_at) /
  `prayer_comments` (id, prayer_request_id, user_id, body, **hidden**
  boolean, **color**, created_at) — migrations 0015 and 0016 both **run**.
  See "샬롬기도단"/"4색 하이라이트 태그" above for RLS details.
- Local SQLite (bundled, not Supabase): `books`, `verses`, `qt_schedule`,
  commentary text — see `scripts/build-bible-db.mjs` for how it's built.
- Local SQLite (user data, `user.db` via `db/userData.ts`, not synced to
  Supabase/across devices): `verse_marks`, `meditation_notes`,
  `commentary_text_highlights`, `diary_entries` (has `color`),
  `priority_tasks` (`priority` is 1–10, no CHECK constraint), and
  `finance_entries`.

## Established workflow patterns (important — follow these)

- **Never commit without an explicit "커밋해줘" / "모두 커밋" etc.**
- **Never `git push` without an explicit "배포해줘".** Vercel auto-deploys
  on push to `main`.
- After committing, this doc's "Last updated" line and the "Recent changes"
  section below should be refreshed.
- Migrations in `supabase/migrations/` are **not** auto-applied — always
  give the user the **raw SQL inline in the chat message** (not just a file
  path/link — a user asked "SQL Editor에 뭘 넣어야 되나?" after only being
  pointed at the file, so paste the actual runnable SQL every time) and ask
  them to run it in the Supabase SQL Editor, then confirm afterward. To
  verify a migration actually ran without needing to log in: `curl` the
  PostgREST endpoint with the anon key —
  `curl -s "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/<table>?select=<col>&limit=1" -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_ANON_KEY"`
  (200 + a JSON array/`[]` means the table/column exists; a 400/404-style
  error means it doesn't). To check whether an admin/owner grant actually
  landed: `?select=id,is_admin&is_admin=eq.true` and see if any rows come
  back. To grant admin by email instead of hunting for a UUID in the
  dashboard: `update public.profiles set is_admin = true where id =
  (select id from auth.users where email = '...');`.
- Claude normally cannot log in to the app (password entry is off-limits),
  so anything gated behind auth needs the user to manually verify in most
  sessions. **Exception hit this session**: the user's local dev server's
  browser profile had a persisted Supabase session in localStorage from
  their own prior testing, and connecting the Browser pane to that same
  running server (see below) inherited it — so this session *could*
  exercise a real logged-in 샬롬기도단 flow (post/list/comment) end-to-end.
  Don't assume this every session; it depends on the user's browser state,
  not anything Claude controls.
- Dev preview: `mcp__Claude_Browser__preview_start` with name
  `bibleapp-web` (port 8081) **still fails** if the user's own `npm run
  web` already holds port 8081 (`Port 8081 is being used by another
  process` → non-interactive prompt → "Skipping dev server") — don't try to
  kill it or force a different port. **But this session found a working
  alternative**: `mcp__Claude_Browser__navigate` (or `preview_start` with
  `{url: "http://localhost:8081"}`) straight to the user's already-running
  server worked completely — the app mounted, rendered, and was fully
  interactive. The previously-documented `<SQLiteProviderSuspense>`/blank-page
  failure is specific to the tool *launching its own* dev server process
  (`preview_start{name:...}`), not a general inability to render this app in
  the Browser pane — so prefer connecting to the user's running server over
  concluding "can't verify in-browser." Full-page `navigate()` calls do a
  **hard reload** — local SQLite-backed data (meditation notes, highlights)
  is fine across reloads if persisted, but don't assume a save completed if
  you navigate away immediately after clicking save; wait for the UI's own
  "저장됨"/success confirmation first.
- `read_network_requests` did **not** reliably show cross-origin `fetch`
  calls to the Supabase host this session, even when they were definitely
  happening (confirmed via a thrown/caught error whose message could only
  come from a real PostgREST response). Don't treat "zero requests
  recorded" as proof a network call isn't firing — if you need to confirm
  whether a Supabase call is happening/failing, temporarily log the actual
  caught error (`console.error(JSON.stringify({message: err?.message,
  code: err?.code, details: err?.details}))`) and read it via
  `read_console_messages`, then remove the temporary log once diagnosed.
- `computer{action:"screenshot"}` timed out repeatedly this session (both
  plain and after `resize_window`) — use `get_page_text` / `read_page` /
  targeted `javascript_tool` bounding-rect checks instead of relying on
  screenshots to verify layout.
- When a `Modal`/dialog closes, its DOM node(s) can **linger in the
  document** (RN Web quirk) instead of unmounting — a later `querySelector`
  that matches by text content alone can grab a stale, invisible leftover
  instance and silently no-op on click. If a click on a dialog button
  appears to do nothing, check `getBoundingClientRect()` of the exact node
  you're clicking (a real, visible instance has a real width/height at a
  sane viewport position; a stale leftover often reports `height: 0`) and
  disambiguate by size/position, not just matching text.
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
- If the dev preview loads to a **permanently blank page** with a
  `<SQLiteProviderSuspense>` warning in the console and empty
  `error-toast`/`error-overlay` DOM nodes (no visible error text anywhere),
  don't assume it's your latest edit — this session it reproduced
  identically on a `git stash`-ed, unmodified checkout, and survived a full
  dev-server restart, so it's an environment-level failure of the
  browser-preview tool itself (possibly missing `SharedArrayBuffer`/
  `crossOriginIsolated`, which `expo-sqlite`'s web/OPFS backend may
  require — check `navigator.storage`, `self.crossOriginIsolated`, and
  `typeof SharedArrayBuffer` via `javascript_tool` to confirm). If you hit
  this, verify it's not your change (stash and reload) before spending more
  time chasing it, then tell the user browser verification is blocked
  rather than silently skipping it.
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

- **(this session, part 5, uncommitted)** — Two more user-requested
  changes to 샬롬기도단 (`prayer-group.tsx` only, no `db/prayer.ts`
  changes this round): (1) restructured the screen from one page-level
  `ScrollView` into a fixed top section (title/error/request composer)
  + a `FlatList` with `flex: 1` for the request feed, so it fills all
  remaining screen height like `rooms/[id].tsx`'s room chat does, instead
  of only being as tall as its content — this was an inference from
  "중보기도채팅방을 하단 본문의 크기에 맞게 키워주고," reading "채팅방"
  as a pointer to the app's existing chat-room layout convention (see the
  top-of-file note if this needs correcting); (2) gave `commentRow` its
  own `backgroundColor: theme.background` (was fully transparent before)
  plus padding/`borderRadius`, so each comment reads as a distinct bubble
  against the request card's `theme.backgroundElement` —
  "기도제목창과 댓글창의 색깔을 다르게 해줘." Both reuse existing theme
  tokens, so they're correct across all 4 skins × light/dark without
  extra work. `tsc --noEmit` clean; grep-confirmed nothing else imports
  `prayer-group.tsx`'s internals. Rendered with zero console errors on a
  fresh dev server (own instance, alternate port). **Neither change
  visually confirmed** — the `FlatList` fill behavior needs real request
  data (and thus a login) to actually see; ask the user to check both.
- **(this session, part 4, uncommitted)** — Two related, user-requested
  changes to 샬롬기도단 (`prayer-group.tsx` + `db/prayer.ts`): (1) deleted
  the 4-color highlight/tag feature entirely — `ColorPicker`/`ColorBadge`
  components, `color`/`commentColors` state,
  `setPrayerRequestColor`/`setPrayerCommentColor` (now dead, deleted from
  `db/prayer.ts`), and the `color` field/param on
  `PrayerRequest`/`PrayerComment`/`createPrayerRequest`/`addPrayerComment`;
  (2) resized the request/comment `TextInput`s to exactly match
  커뮤니티's composer boxes, which fell out for free once the color-dot
  overlay's extra `paddingTop`/`paddingLeft` was removed — no dimensions
  were hand-tuned, the style objects are now identical between the two
  screens. `db/profile.ts` gained `getIsAdmin` (moved out of
  `db/prayer.ts`, which now just re-exports it, since the admin concept
  isn't prayer-specific — used by both `prayer-group.tsx` and the new
  커뮤니티 moderation in `post/[id].tsx`). The `prayer_requests.color`/
  `prayer_comments.color` DB columns from `0016_prayer_color_and_update.sql`
  were **not** dropped — see "Migration status". `tsc --noEmit` clean;
  grep-confirmed no leftover references to the deleted color functions
  anywhere in `src/`. Verified the screen still renders with zero console
  errors on a fresh dev server (own instance on an alternate port, see
  "Browser verification" note below for why a second server was needed) —
  **could only check logged-out** (Claude can't log in), so the actual
  composer box appearance wasn't visually diffed against 커뮤니티 in a
  real session.
- **(this session, part 3, uncommitted)** — Added comment hide/delete
  moderation to 커뮤니티 (`post/[id].tsx`), matching 샬롬기도단's existing
  pattern: hide/unhide + delete allowed for the comment's own author, the
  post's author, or an admin; hidden comments show dimmed + a "숨김" badge
  to privileged viewers, filtered out entirely for everyone else via RLS.
  New migration `0018_comment_hide_and_moderation.sql` (**not yet run**).
  Moved `getIsAdmin` from `db/prayer.ts` to `db/profile.ts` (it was never
  prayer-specific); `db/prayer.ts` re-exports it so `prayer-group.tsx`
  didn't need an import change. Also investigated (but couldn't resolve)
  the user's report that the tab-bar horizontal-scroll fix from part 2
  "still isn't fixed" — see the ⚠️ callout near the top of this file; most
  likely explanation is the user was checking the deployed site rather
  than local dev, since nothing past `4f31755` has been pushed yet.
  `tsc --noEmit` clean. **Not verified in-browser** — Browser-pane preview
  hit the known `SQLiteProviderSuspense` blank-page failure again this
  session, even connecting to the user's own running dev server (worked in
  an earlier session, didn't this time).
- **(this session, part 2, uncommitted)** — Two user-reported bugs,
  root-caused and fixed (full writeup in the top-of-file summary): (1) top
  web toolbar's horizontal scroll never actually worked because
  `innerContainer` in `components/app-tabs.web.tsx` was missing
  `flexShrink: 1` (RN defaults to `0`, not CSS's `1`) — fixed, verified at
  420px and 1280px; (2) 샬롬기도단 posting never showed up because
  `0015_prayer_group.sql` pointed `prayer_requests`/
  `prayer_comments.user_id` at `auth.users(id)` instead of
  `public.profiles(id)`, so the `profiles(username)` embed PostgREST needs
  for the author name always threw `PGRST200`, silently swallowed — fixed
  via new migration `0017_fix_prayer_profile_relationships.sql` (**not yet
  run — see ⚠️ callout at top of file**), plus removed the unused
  `prayer_comments(count)` aggregate embed and made `load()` surface a
  visible error instead of a silent empty list. `tsc --noEmit` clean.
- **(this session, part 1, uncommitted)** — Un-linked `/calendar` from
  영성일기/우선순위/천국재정 and gave each of those three screens its own
  embedded calendar instead (see top-of-file summary and "Core features"
  #2/#12 for full detail): new `components/inline-calendar.tsx`
  (`InlineCalendar`, reusable month-grid picker with marked-date dots, not a
  route); `spiritual-journal.tsx`/`priorities.tsx`/`kingdom-finance.tsx` all
  embed it at the top of the screen and swap their content based on the
  locally-selected date instead of a `?date=`-driven route param;
  `calendar.tsx`'s day-tap action sheet (3 buttons linking out) was removed
  — tapping a day there now just shows info; `(tabs)/index.tsx`'s
  `MENU_ITEMS` for the three screens now link directly to them instead of
  to `/calendar`; added `getPriorityTaskDates()` to `db/userData.ts` (new
  query, needed because `priority_tasks` had no existing "all dates" query
  to build the marked-dates set from). `tsc --noEmit` clean. **Not yet
  checked by the user** — see top-of-file note for what to verify locally.
- **(previous session, uncommitted)** — Follow-up round after the user tested
  three of the four previous-round features locally: (1) 천국재정 got a
  category quick-select chip row for both 수입/지출; (2) 영성일기's editor
  box was a bug — `minHeight` let it grow with content, now a fixed
  `height:200` with internal scroll; (3) 우선순위 changed from a 3-tier
  높음/보통/낮음 chip set to a 1–10 numeric scale with more generous
  spacing; (4) added a 4-color highlight-tag picker to the top-left of
  every writable text box in 영성일기 + 샬롬기도단 (see "Core features"
  #14) — new migration `0016_prayer_color_and_update.sql`, **run and
  confirmed by the user** shortly after this round of changes; (5) reworked
  샬롬기도단 so comments render **inline under each request
  in the feed** instead of on a separate detail page (`prayer/[id].tsx` was
  deleted), and fixed a save-flow bug where a failed insert silently left
  the composer un-cleared and the new post/comment invisible (now
  surfaces a visible error banner instead) — see "Core features" #13.
  `tsc --noEmit` clean; **not yet checked by the user** (this round of
  changes came after their last local-test screenshots).
- **(three sessions ago, uncommitted)** — Four user-requested items: (1) web
  tab bar horizontal scroll fix (see "Core features" #10); (2) 주석
  loading-speed fix via caching (see "Core features" #11); (3)
  영성일기/우선순위/천국재정 real implementations, replacing their
  `ComingSoon` placeholders (see "Core features" #12); (4) 샬롬기도단
  login-gated prayer board with post/comment + comment hide/delete
  moderation, including a new admin concept and Supabase migration
  `0015_prayer_group.sql` (see "Core features" #13). Migration 0015 has
  since been **run and confirmed** by the user; 영성일기/우선순위/천국재정
  have since been **confirmed working locally** by the user (screenshots).
- **(four sessions ago, uncommitted)** — Five user-requested fixes/features in
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
- **(five sessions ago, uncommitted)** — Home screen follow-up: the web tab bar
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
- 영성일기/우선순위/천국재정/샬롬기도단 all now have real implementations
  (see "Core features" #12–13) — the "4 empty placeholder pages" note from
  earlier sessions no longer applies. **As of this session**, 영성일기/
  우선순위/천국재정 are reached **directly from 홈's grid** (`MENU_ITEMS`
  now points straight at each screen) and each embeds its own calendar —
  the old "only reachable via 달력's action sheet" limitation no longer
  applies (that action sheet's 3 buttons were removed from `/calendar`
  entirely this session, see #2/#12).
- Both `0015_prayer_group.sql` and `0016_prayer_color_and_update.sql` have
  been **run and confirmed** (user-confirmed; also independently verified
  via a read-only REST query against `prayer_requests`/`prayer_comments`
  with the anon key). `supabase/migrations/` matches the live DB.
- **No admin has been granted yet** — `is_admin` is `true` for 0 profiles
  (confirmed via REST query). Hide/delete moderation still works for a
  comment's own author and the prayer-request's own author without admin;
  admin only matters for moderating *other people's* requests' comments.
  Grant via Supabase SQL editor — see "Established workflow patterns"
  above for an email-based grant query (no need to hunt for a UUID).
- 샬롬기도단's `Feed.load()` fetches every visible request's comments in a
  separate round-trip (`Promise.all` over `getPrayerComments`, once per
  request) — fine for a small church prayer board, but would need
  batching/pagination if this ever needs to scale to a large, high-traffic
  feed (see "Core features" #13).
- There is no longer a `/prayer/[id]` detail route — comments are inline in
  the feed now (see "Core features" #13). If a "share a direct link to one
  기도제목" feature is ever wanted, that would need reintroducing some kind
  of detail/permalink view.
- 영성일기/우선순위/천국재정 data is **local-SQLite-only, per-device** — it
  does not sync across devices or survive an app reinstall/uninstall (same
  tradeoff as `meditation_notes`/`verse_marks`). If cross-device sync is
  ever wanted, these would need Supabase-backed tables + RLS like
  샬롬기도단 got this session, instead of `db/userData.ts`.
- 천국재정's summary totals (총 수입/총 지출/잔액) are computed across
  **all** dates, not just the selected one — this was a judgment call
  (a household ledger reads more usefully with a running total than a
  reset-per-day one); revisit if the user wants per-day/per-month subtotals
  instead.
- 우선순위's task list is scoped **per date** (mirroring 영성일기) — a task
  created for one day doesn't roll over or appear on a different day. If
  the user actually wants a persistent cross-day todo list instead of a
  daily one, that's a data-model change (drop the date-scoping, or add a
  due-date vs. created-date distinction).
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
