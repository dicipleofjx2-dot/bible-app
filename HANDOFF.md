# BibleApp — Handoff / Status Reference

Last updated: 2026-07-15, after commit `0af3da3` (pushed to `origin/main`, deployed to Vercel).

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
      index.tsx             # 홈 — daily QT passage, Hebrew calendar date
      meditation.tsx        # 말씀묵상 — QT passage + note-taking + "오늘의 성경통독"
      read.tsx               # 읽기 — free Bible reading, verse actions
      search.tsx             # 검색 — full-text verse search
      notes.tsx               # 암송구절 — verse highlights/memorization
      commentary.tsx        # 주석 — 만나주석/매튜헨리 commentary
      bible-reading.tsx     # 성경통독 — reading plan CRUD + 성경통독방 (rooms) CRUD
      community.tsx         # 커뮤니티 — post feed, room invite banner
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
    word-notes.tsx           # 말씀노트 — all-notes list (from 말씀묵상)
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
  components/               # ThemedText/ThemedView/UI primitives
  constants/theme.ts        # Spacing scale, MaxContentWidth (800), colors
supabase/migrations/        # 0001–0014, applied in order manually via Supabase SQL Editor
scripts/                    # build-bible-db.mjs + bible-source-data/*.json (source texts)
```

## Core features (as of last session)

1. **홈** — today's QT (Quiet Time) passage resolved from a date-keyed
   `qt_schedule` table (local SQLite), Hebrew-calendar date display.
2. **말씀묵상** — same QT passage with prev/next day navigation, a note
   textarea (`묵상 저장하기`), a link to all saved notes (`말씀노트 보기` —
   now sits next to the save button, same pill styling), and an
   **"오늘의 성경통독"** section: for every 성경통독방 (reading room) the
   user has joined, shows today's date-mapped reading chunk grouped by book.
3. **읽기 / 검색 / 암송구절 / 주석** — free reading, FTS5 search, verse
   highlighting, commentary (만나주석/매튜헨리) — largely stable, not touched
   in the recent sessions covered by this doc.
4. **성경통독 tab** —
   - Create a reading plan: pick a book/chapter range, a duration (1주 /
     1달 / 3달 / 6달 / 1년 / 직접 설정) or custom start+end date. Chapters
     are spread evenly across the days (`distributeAcrossDays`, remainder
     goes to the earliest days so the last day always lands on `end_date`).
   - 읽기계획 목록: lists all plans; **creator can delete their own plan**
     (button only shows when `created_by === userId`; confirms via modal;
     DB cascade wipes the plan's days/progress/any room built on it).
   - 성경통독방 (rooms): create a room tied to a plan + invite code, browse
     all rooms, join via invite code, see "내 성경통독방".
5. **plans/[slug] (계획 상세)** — shows every day's chapters as a
   **responsive tile grid** (not one row per chapter) — `numColumns`
   computed from viewport width vs `MaxContentWidth` (~9–10 columns at
   800px). Uses a hardcoded Korean book-abbreviation table (`KOREAN_BOOK_ABBREV`)
   instead of the DB's English `books.abbrev` column. Tap a tile → go read
   that chapter; small corner checkbox → toggle that day complete.
6. **rooms/[id]** — room chat, member activity feed, invite by profile
   search, room delete (owner only, cascades via `plan_id`... actually via
   `reading_rooms.id` cascade to members/activity/messages).
7. **커뮤니티** — post feed with comments, delete-your-own-post. The
   "읽기방" header link (→ `/rooms`) was **removed** — room management now
   lives only in 성경통독 tab. The pending-invite banner ("~님이 읽기방에
   초대되었어요") was deliberately **kept** since it's a direct
   per-invite notification, not a room-browsing entry point.
8. **말씀노트 (word-notes.tsx)** — flat list of all saved meditation notes
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

## Recent changes (most recent first)

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
- **Suspected same-shape bug, not yet checked**: `community.tsx`'s post
  `FlatList` has the exact same "no `style` prop, only
  `contentContainerStyle`" shape that caused the word-notes width bug.
  Never confirmed whether post cards actually exhibit it. (A background
  task was spawned for this in the previous session — check if it ran.)
- Legacy reading plans with `created_by = null` (e.g. "요한복음 21일
  통독") are undeletable by anyone through the UI (RLS requires
  `auth.uid() = created_by`) — not necessarily a bug, just a known gap if
  cleanup of seed data is ever wanted.
- No automated tests in this repo; verification has been manual
  (`tsc --noEmit` for types + live browser check for behavior).
