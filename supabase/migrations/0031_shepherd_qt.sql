create table shepherd_qt (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  book_id integer not null,
  chapter integer not null,
  start_verse integer not null,
  end_verse integer not null,
  label text not null,
  qt_answers jsonb not null default '{}'::jsonb,
  reflection text not null default '',
  application_note text not null default '',
  is_public boolean not null default false,
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table shepherd_qt enable row level security;

create policy "public can read public shepherd qt" on shepherd_qt
  for select using (is_public = true);

create policy "admin can read all shepherd qt" on shepherd_qt
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin can manage shepherd qt" on shepherd_qt
  for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin));
