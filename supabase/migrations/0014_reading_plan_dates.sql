-- Adds a calendar date range to reading plans, so a plan's day_number can be
-- mapped to an actual date (day 1 = start_date) and participants can be shown
-- "today's" reading range (see 말씀묵상 in src/app/(tabs)/meditation.tsx).

alter table public.reading_plans add column if not exists start_date date;
alter table public.reading_plans add column if not exists end_date date;
