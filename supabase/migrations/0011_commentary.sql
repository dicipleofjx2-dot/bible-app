-- Commentary text (만나주석, 매튜헨리, ...) is too large to bundle in the
-- on-device SQLite file (33k+ rows, ~90MB of HTML) — GitHub rejects files
-- over 100MB, so it lives here instead and is fetched over the network per
-- verse, same as reading plans / community content.
create table public.commentary (
  id bigint generated always as identity primary key,
  book_id integer not null,
  chapter integer not null,
  verse integer not null,
  source text not null,
  html text not null
);

create index idx_commentary_lookup on public.commentary (book_id, chapter, verse, source);

alter table public.commentary enable row level security;

create policy "commentary is viewable by everyone"
  on public.commentary for select
  using (true);

-- Temporary: lets scripts/import-commentary.mjs bulk-insert with the anon
-- key instead of needing the service_role secret. Drop this once the import
-- has run — see 0012_lock_commentary_insert.sql.
create policy "temporary open insert for bulk import"
  on public.commentary for insert
  with check (true);
