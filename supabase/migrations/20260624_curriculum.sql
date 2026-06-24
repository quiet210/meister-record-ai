create extension if not exists pgcrypto;

create table if not exists public.curriculum_subjects (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references public.schools(id) on delete cascade,
  subject_name text not null,
  subject_type text not null check (subject_type in ('general', 'ncs')),
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curriculum_subjects_name_not_blank check (length(trim(subject_name)) > 0),
  constraint curriculum_subjects_school_name_unique unique (school_id, subject_name)
);

create index if not exists curriculum_subjects_school_sort_idx
  on public.curriculum_subjects (school_id, sort_order, subject_name);

create table if not exists public.curriculum_standards (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references public.schools(id) on delete cascade,
  subject_id uuid not null references public.curriculum_subjects(id) on delete restrict,
  subject_name text not null,
  subject_type text not null check (subject_type in ('general', 'ncs')),
  unit_name text not null,
  achievement_standard text not null,
  keywords text not null default '',
  uploaded_by uuid references public.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'pending', 'rejected')),
  duplicate_status text not null default 'none',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curriculum_standards_subject_name_not_blank check (length(trim(subject_name)) > 0),
  constraint curriculum_standards_unit_name_not_blank check (length(trim(unit_name)) > 0),
  constraint curriculum_standards_achievement_not_blank check (length(trim(achievement_standard)) > 0),
  constraint curriculum_standards_exact_unique unique (school_id, subject_name, unit_name, achievement_standard)
);

create index if not exists curriculum_standards_school_subject_idx
  on public.curriculum_standards (school_id, subject_name, unit_name, status);

create index if not exists curriculum_standards_subject_id_idx
  on public.curriculum_standards (subject_id, sort_order);

drop trigger if exists curriculum_subjects_set_updated_at on public.curriculum_subjects;
create trigger curriculum_subjects_set_updated_at
before update on public.curriculum_subjects
for each row execute function public.set_updated_at();

drop trigger if exists curriculum_standards_set_updated_at on public.curriculum_standards;
create trigger curriculum_standards_set_updated_at
before update on public.curriculum_standards
for each row execute function public.set_updated_at();

alter table public.curriculum_subjects enable row level security;
alter table public.curriculum_standards enable row level security;

drop policy if exists "curriculum subjects are readable by same school" on public.curriculum_subjects;
create policy "curriculum subjects are readable by same school"
on public.curriculum_subjects
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.curriculum_subjects.school_id
  )
);

drop policy if exists "curriculum subjects are writable by same school admins" on public.curriculum_subjects;
create policy "curriculum subjects are writable by same school admins"
on public.curriculum_subjects
for all
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.curriculum_subjects.school_id
      and public.users.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.curriculum_subjects.school_id
      and public.users.role = 'admin'
  )
);

drop policy if exists "curriculum standards are readable by same school" on public.curriculum_standards;
create policy "curriculum standards are readable by same school"
on public.curriculum_standards
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.curriculum_standards.school_id
  )
);

drop policy if exists "curriculum standards are insertable by same school teachers" on public.curriculum_standards;
create policy "curriculum standards are insertable by same school teachers"
on public.curriculum_standards
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.curriculum_standards.school_id
      and public.users.role in ('admin', 'teacher')
  )
  and exists (
    select 1
    from public.curriculum_subjects
    where public.curriculum_subjects.id = public.curriculum_standards.subject_id
      and public.curriculum_subjects.school_id = public.curriculum_standards.school_id
      and public.curriculum_subjects.subject_name = public.curriculum_standards.subject_name
      and public.curriculum_subjects.subject_type = public.curriculum_standards.subject_type
  )
);

drop policy if exists "curriculum standards are updatable by admins or uploaders" on public.curriculum_standards;
create policy "curriculum standards are updatable by admins or uploaders"
on public.curriculum_standards
for update
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.curriculum_standards.school_id
      and (
        public.users.role = 'admin'
        or public.curriculum_standards.uploaded_by = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.curriculum_standards.school_id
      and (
        public.users.role = 'admin'
        or public.curriculum_standards.uploaded_by = auth.uid()
      )
  )
  and exists (
    select 1
    from public.curriculum_subjects
    where public.curriculum_subjects.id = public.curriculum_standards.subject_id
      and public.curriculum_subjects.school_id = public.curriculum_standards.school_id
      and public.curriculum_subjects.subject_name = public.curriculum_standards.subject_name
      and public.curriculum_subjects.subject_type = public.curriculum_standards.subject_type
  )
);

drop policy if exists "curriculum standards are deletable by admins or uploaders" on public.curriculum_standards;
create policy "curriculum standards are deletable by admins or uploaders"
on public.curriculum_standards
for delete
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.curriculum_standards.school_id
      and (
        public.users.role = 'admin'
        or public.curriculum_standards.uploaded_by = auth.uid()
      )
  )
);
