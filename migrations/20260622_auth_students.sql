create extension if not exists pgcrypto;

create table if not exists public.schools (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.schools (id, name)
values ('demo-school', 'Demo school')
on conflict (id) do nothing;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id text not null references public.schools(id) on delete restrict,
  email text not null,
  name text not null default '',
  role text not null default 'teacher' check (role in ('teacher', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_school_idx
  on public.users (school_id);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references public.schools(id) on delete cascade,
  name text not null,
  grade text not null check (grade in ('1학년', '2학년', '3학년')),
  department text not null check (department in ('materials', 'automation_machine', 'electrical_electronic_control')),
  class_name text not null,
  number text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists students_school_class_idx
  on public.students (school_id, grade, class_name, number);

create table if not exists public.record_drafts (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  mode text not null check (mode in ('subject', 'behavior')),
  input_payload jsonb not null,
  result_payload jsonb not null,
  draft_text text,
  created_at timestamptz not null default now()
);

create index if not exists record_drafts_school_created_idx
  on public.record_drafts (school_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_school_id text := coalesce(nullif(new.raw_user_meta_data ->> 'school_id', ''), 'demo-school');
  new_name text := coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1), '교사');
begin
  insert into public.schools (id, name)
  values (new_school_id, new_school_id)
  on conflict (id) do nothing;

  insert into public.users (id, school_id, email, name, role)
  values (new.id, new_school_id, coalesce(new.email, ''), new_name, 'teacher')
  on conflict (id) do update
  set email = excluded.email,
      name = excluded.name,
      school_id = excluded.school_id,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.students enable row level security;
alter table public.record_drafts enable row level security;

drop policy if exists "users can read own profile" on public.users;
create policy "users can read own profile"
on public.users
for select
to authenticated
using (id = auth.uid());

drop policy if exists "users can insert own profile" on public.users;
create policy "users can insert own profile"
on public.users
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "users can update own profile" on public.users;

drop policy if exists "students are readable by same school" on public.students;
create policy "students are readable by same school"
on public.students
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.students.school_id
  )
);

drop policy if exists "students are insertable by same school" on public.students;
create policy "students are insertable by same school"
on public.students
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.students.school_id
  )
);

drop policy if exists "students are updatable by same school" on public.students;
create policy "students are updatable by same school"
on public.students
for update
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.students.school_id
  )
)
with check (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.students.school_id
  )
);

drop policy if exists "students are deletable by same school" on public.students;
create policy "students are deletable by same school"
on public.students
for delete
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.students.school_id
  )
);

drop policy if exists "record drafts are readable by same school" on public.record_drafts;
create policy "record drafts are readable by same school"
on public.record_drafts
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.record_drafts.school_id
  )
);

drop policy if exists "record drafts are insertable by same school" on public.record_drafts;
create policy "record drafts are insertable by same school"
on public.record_drafts
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.record_drafts.school_id
  )
);
