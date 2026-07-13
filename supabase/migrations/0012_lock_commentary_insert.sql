-- Run this AFTER scripts/import-commentary.mjs has finished, to close the
-- temporary open insert policy from 0011.
drop policy "temporary open insert for bulk import" on public.commentary;
