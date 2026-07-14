-- Lets any signed-in user create their own reading plan (성경통독 tab), instead
-- of reading_plans/reading_plan_days being admin-seeded read-only content.

alter table public.reading_plans add column if not exists created_by uuid references auth.users (id);

create policy "signed-in users can create reading plans"
  on public.reading_plans for insert
  with check (auth.uid() is not null);

create policy "creators can delete their own reading plans"
  on public.reading_plans for delete
  using (auth.uid() = created_by);

create policy "signed-in users can create reading plan days"
  on public.reading_plan_days for insert
  with check (auth.uid() is not null);

create policy "creators can delete their own reading plan days"
  on public.reading_plan_days for delete
  using (
    exists (
      select 1 from public.reading_plans p
      where p.id = reading_plan_days.plan_id and p.created_by = auth.uid()
    )
  );
