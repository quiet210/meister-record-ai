create or replace function public.current_auth_user_school_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.users.school_id
  from public.users
  where public.users.id = auth.uid()
  limit 1
$$;

create or replace function public.current_auth_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.users.role
  from public.users
  where public.users.id = auth.uid()
  limit 1
$$;

revoke all on function public.current_auth_user_school_id() from public;
revoke all on function public.current_auth_user_role() from public;
grant execute on function public.current_auth_user_school_id() to authenticated;
grant execute on function public.current_auth_user_role() to authenticated;

alter table public.users enable row level security;
alter table public.students enable row level security;
alter table public.record_drafts enable row level security;
alter table public.curriculum_subjects enable row level security;
alter table public.curriculum_standards enable row level security;

create index if not exists record_drafts_owner_school_student_mode_idx
  on public.record_drafts (user_id, school_id, student_id, mode, created_at desc);

comment on column public.record_drafts.user_id is
  'Teacher owner id. record_drafts RLS must always scope reads and writes to auth.uid().';

drop policy if exists "users can read own profile" on public.users;
drop policy if exists "users can insert own profile" on public.users;
drop policy if exists "users can update own profile" on public.users;
drop policy if exists "admins can read same school users" on public.users;
drop policy if exists "admins can update same school users" on public.users;
drop policy if exists "users can insert own teacher profile" on public.users;

create policy "users can read own profile"
on public.users
for select
to authenticated
using (id = auth.uid());

create policy "admins can read same school users"
on public.users
for select
to authenticated
using (
  public.current_auth_user_role() = 'admin'
  and school_id = public.current_auth_user_school_id()
);

create policy "users can insert own teacher profile"
on public.users
for insert
to authenticated
with check (
  id = auth.uid()
  and role = 'teacher'
);

create policy "admins can update same school users"
on public.users
for update
to authenticated
using (
  public.current_auth_user_role() = 'admin'
  and school_id = public.current_auth_user_school_id()
)
with check (
  public.current_auth_user_role() = 'admin'
  and school_id = public.current_auth_user_school_id()
  and role in ('teacher', 'admin')
);

drop policy if exists "record drafts are readable by same school" on public.record_drafts;
drop policy if exists "record drafts are insertable by same school" on public.record_drafts;
drop policy if exists "record drafts are updatable by owner in same school" on public.record_drafts;
drop policy if exists "record drafts are readable by owner" on public.record_drafts;
drop policy if exists "record drafts are insertable by owner" on public.record_drafts;
drop policy if exists "record drafts are updatable by owner" on public.record_drafts;

create policy "record drafts are readable by owner"
on public.record_drafts
for select
to authenticated
using (
  user_id = auth.uid()
  and school_id = public.current_auth_user_school_id()
  and (
    student_id is null
    or exists (
      select 1
      from public.students
      where public.students.id = public.record_drafts.student_id
        and public.students.school_id = public.record_drafts.school_id
    )
  )
);

create policy "record drafts are insertable by owner"
on public.record_drafts
for insert
to authenticated
with check (
  user_id = auth.uid()
  and school_id = public.current_auth_user_school_id()
  and (edited_by is null or edited_by = auth.uid())
  and (
    student_id is null
    or exists (
      select 1
      from public.students
      where public.students.id = public.record_drafts.student_id
        and public.students.school_id = public.record_drafts.school_id
    )
  )
);

create policy "record drafts are updatable by owner"
on public.record_drafts
for update
to authenticated
using (
  user_id = auth.uid()
  and school_id = public.current_auth_user_school_id()
)
with check (
  user_id = auth.uid()
  and school_id = public.current_auth_user_school_id()
  and (edited_by is null or edited_by = auth.uid())
  and (
    student_id is null
    or exists (
      select 1
      from public.students
      where public.students.id = public.record_drafts.student_id
        and public.students.school_id = public.record_drafts.school_id
    )
  )
);
