alter table public.record_drafts
add column if not exists updated_at timestamptz not null default now();

drop trigger if exists record_drafts_set_updated_at on public.record_drafts;
create trigger record_drafts_set_updated_at
before update on public.record_drafts
for each row execute function public.set_updated_at();

create index if not exists record_drafts_student_mode_created_idx
  on public.record_drafts (school_id, user_id, student_id, mode, created_at desc);

drop policy if exists "record drafts are updatable by owner in same school" on public.record_drafts;
create policy "record drafts are updatable by owner in same school"
on public.record_drafts
for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.record_drafts.school_id
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.record_drafts.school_id
  )
);
