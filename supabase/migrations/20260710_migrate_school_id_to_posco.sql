-- DEPRECATED / DO NOT APPLY for the 2026-07-10 step-2 POSCO cutover.
-- This draft predates the abcd123 operational unification and also targets demo-school/abcd1234/포철공고-style legacy values.
-- Use 20260712_migrate_abcd123_to_posco.sql for the current controlled migration.

create extension if not exists pgcrypto;

-- 실행 전 점검 SQL:
-- select 'users' as table_name, school_id, count(*) from public.users group by school_id order by school_id;
-- select 'students' as table_name, school_id, count(*) from public.students group by school_id order by school_id;
-- select 'curriculum_subjects' as table_name, school_id, count(*) from public.curriculum_subjects group by school_id order by school_id;
-- select 'curriculum_standards' as table_name, school_id, count(*) from public.curriculum_standards group by school_id order by school_id;
-- select 'departments' as table_name, school_id, count(*) from public.departments group by school_id order by school_id;
-- select 'subjects' as table_name, school_id, count(*) from public.subjects group by school_id order by school_id;
-- select 'checklist_categories' as table_name, school_id, count(*) from public.checklist_categories group by school_id order by school_id;
-- select 'checklist_items' as table_name, school_id, count(*) from public.checklist_items group by school_id order by school_id;
-- select 'record_drafts' as table_name, school_id, count(*) from public.record_drafts group by school_id order by school_id;
-- select 'school_change_requests.current' as table_name, current_school_id, count(*) from public.school_change_requests group by current_school_id order by current_school_id;
-- select 'school_change_requests.requested' as table_name, requested_school_id, count(*) from public.school_change_requests group by requested_school_id order by requested_school_id;

insert into public.schools (id, name)
values ('POSCO', '포항제철공업고등학교')
on conflict (id) do update
set name = excluded.name;

create or replace function public.normalize_school_id_for_posco(value text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(btrim(coalesce(value, '')), '[[:space:]]+', '', 'g'))
$$;

create or replace function public.is_posco_migration_school_id(value text)
returns boolean
language sql
immutable
as $$
  select public.normalize_school_id_for_posco(value) in (
    'posco',
    '포항제철공업고등학교',
    '포항제철공고',
    '포철공고',
    'demo-school',
    'demoschool',
    'abcd123',
    'abcd1234'
  )
$$;

with ranked_departments as (
  select
    id,
    row_number() over (
      partition by code
      order by case when school_id = 'POSCO' then 0 else 1 end, created_at asc, id asc
    ) as keep_rank
  from public.departments
  where school_id = 'POSCO'
     or (school_id <> 'POSCO' and public.is_posco_migration_school_id(school_id))
)
delete from public.departments
using ranked_departments
where departments.id = ranked_departments.id
  and ranked_departments.keep_rank > 1;

update public.departments
set school_id = 'POSCO'
where school_id <> 'POSCO'
  and public.is_posco_migration_school_id(school_id);

with ranked_subjects as (
  select
    id,
    row_number() over (
      partition by name
      order by case when school_id = 'POSCO' then 0 else 1 end, created_at asc, id asc
    ) as keep_rank
  from public.subjects
  where school_id = 'POSCO'
     or (school_id <> 'POSCO' and public.is_posco_migration_school_id(school_id))
)
delete from public.subjects
using ranked_subjects
where subjects.id = ranked_subjects.id
  and ranked_subjects.keep_rank > 1;

update public.subjects
set school_id = 'POSCO'
where school_id <> 'POSCO'
  and public.is_posco_migration_school_id(school_id);

with ranked_standards as (
  select
    id,
    row_number() over (
      partition by subject_name, coalesce(learning_module, ''), unit_name, achievement_standard
      order by case when school_id = 'POSCO' then 0 else 1 end, created_at asc, id asc
    ) as keep_rank
  from public.curriculum_standards
  where school_id = 'POSCO'
     or (school_id <> 'POSCO' and public.is_posco_migration_school_id(school_id))
)
delete from public.curriculum_standards
using ranked_standards
where curriculum_standards.id = ranked_standards.id
  and ranked_standards.keep_rank > 1;

with ranked_curriculum_subjects as (
  select
    id,
    subject_name,
    subject_type,
    row_number() over (
      partition by subject_name
      order by case when school_id = 'POSCO' then 0 else 1 end, created_at asc, id asc
    ) as keep_rank
  from public.curriculum_subjects
  where school_id = 'POSCO'
     or (school_id <> 'POSCO' and public.is_posco_migration_school_id(school_id))
),
keeper_curriculum_subjects as (
  select
    id as keeper_id,
    subject_name,
    subject_type as keeper_subject_type
  from ranked_curriculum_subjects
  where keep_rank = 1
),
duplicate_curriculum_subjects as (
  select
    ranked_curriculum_subjects.id as duplicate_id,
    keeper_curriculum_subjects.keeper_id,
    keeper_curriculum_subjects.keeper_subject_type
  from ranked_curriculum_subjects
  join keeper_curriculum_subjects
    on keeper_curriculum_subjects.subject_name = ranked_curriculum_subjects.subject_name
  where ranked_curriculum_subjects.keep_rank > 1
)
update public.curriculum_standards
set
  subject_id = duplicate_curriculum_subjects.keeper_id,
  subject_type = duplicate_curriculum_subjects.keeper_subject_type
from duplicate_curriculum_subjects
where curriculum_standards.subject_id = duplicate_curriculum_subjects.duplicate_id;

with ranked_curriculum_subjects as (
  select
    id,
    row_number() over (
      partition by subject_name
      order by case when school_id = 'POSCO' then 0 else 1 end, created_at asc, id asc
    ) as keep_rank
  from public.curriculum_subjects
  where school_id = 'POSCO'
     or (school_id <> 'POSCO' and public.is_posco_migration_school_id(school_id))
)
delete from public.curriculum_subjects
using ranked_curriculum_subjects
where curriculum_subjects.id = ranked_curriculum_subjects.id
  and ranked_curriculum_subjects.keep_rank > 1;

update public.curriculum_subjects
set school_id = 'POSCO'
where school_id <> 'POSCO'
  and public.is_posco_migration_school_id(school_id);

update public.curriculum_standards
set
  subject_id = curriculum_subjects.id,
  subject_type = curriculum_subjects.subject_type
from public.curriculum_subjects
where curriculum_standards.school_id <> 'POSCO'
  and public.is_posco_migration_school_id(curriculum_standards.school_id)
  and curriculum_subjects.school_id = 'POSCO'
  and curriculum_subjects.subject_name = curriculum_standards.subject_name;

update public.curriculum_standards
set school_id = 'POSCO'
where school_id <> 'POSCO'
  and public.is_posco_migration_school_id(school_id);

with ranked_checklist_items as (
  select
    checklist_items.id,
    row_number() over (
      partition by checklist_categories.key, checklist_items.label
      order by
        case
          when checklist_items.school_id = 'POSCO' and checklist_categories.school_id = 'POSCO' then 0
          when checklist_items.school_id = 'POSCO' then 1
          when checklist_categories.school_id = 'POSCO' then 2
          else 3
        end,
        checklist_items.created_at asc,
        checklist_items.id asc
    ) as keep_rank
  from public.checklist_items
  join public.checklist_categories
    on checklist_categories.id = checklist_items.category_id
  where checklist_items.school_id = 'POSCO'
     or checklist_categories.school_id = 'POSCO'
     or (checklist_items.school_id <> 'POSCO' and public.is_posco_migration_school_id(checklist_items.school_id))
     or (checklist_categories.school_id <> 'POSCO' and public.is_posco_migration_school_id(checklist_categories.school_id))
)
delete from public.checklist_items
using ranked_checklist_items
where checklist_items.id = ranked_checklist_items.id
  and ranked_checklist_items.keep_rank > 1;

with ranked_checklist_categories as (
  select
    id,
    key,
    row_number() over (
      partition by key
      order by case when school_id = 'POSCO' then 0 else 1 end, created_at asc, id asc
    ) as keep_rank
  from public.checklist_categories
  where school_id = 'POSCO'
     or (school_id <> 'POSCO' and public.is_posco_migration_school_id(school_id))
),
keeper_checklist_categories as (
  select
    id as keeper_id,
    key
  from ranked_checklist_categories
  where keep_rank = 1
),
duplicate_checklist_categories as (
  select
    ranked_checklist_categories.id as duplicate_id,
    keeper_checklist_categories.keeper_id
  from ranked_checklist_categories
  join keeper_checklist_categories
    on keeper_checklist_categories.key = ranked_checklist_categories.key
  where ranked_checklist_categories.keep_rank > 1
)
update public.checklist_items
set category_id = duplicate_checklist_categories.keeper_id
from duplicate_checklist_categories
where checklist_items.category_id = duplicate_checklist_categories.duplicate_id;

with ranked_checklist_categories as (
  select
    id,
    row_number() over (
      partition by key
      order by case when school_id = 'POSCO' then 0 else 1 end, created_at asc, id asc
    ) as keep_rank
  from public.checklist_categories
  where school_id = 'POSCO'
     or (school_id <> 'POSCO' and public.is_posco_migration_school_id(school_id))
)
delete from public.checklist_categories
using ranked_checklist_categories
where checklist_categories.id = ranked_checklist_categories.id
  and ranked_checklist_categories.keep_rank > 1;

update public.checklist_categories
set school_id = 'POSCO'
where school_id <> 'POSCO'
  and public.is_posco_migration_school_id(school_id);

update public.checklist_items
set school_id = 'POSCO'
where school_id <> 'POSCO'
  and public.is_posco_migration_school_id(school_id);

with ranked_current_drafts as (
  select
    id,
    row_number() over (
      partition by
        user_id,
        coalesce(student_id, '00000000-0000-0000-0000-000000000000'::uuid),
        mode,
        coalesce(nullif(btrim(subject_name), ''), ''),
        coalesce(nullif(btrim(academic_year), ''), ''),
        coalesce(nullif(btrim(semester), ''), '')
      order by
        case when school_id = 'POSCO' then 0 else 1 end,
        updated_at desc nulls last,
        created_at desc,
        id desc
    ) as keep_rank
  from public.record_drafts
  where is_current = true
    and (
      school_id = 'POSCO'
      or (school_id <> 'POSCO' and public.is_posco_migration_school_id(school_id))
    )
)
update public.record_drafts
set
  is_current = false,
  archived_at = coalesce(archived_at, now()),
  archive_reason = coalesce(nullif(btrim(archive_reason), ''), 'POSCO school_id migration duplicate current scope')
from ranked_current_drafts
where record_drafts.id = ranked_current_drafts.id
  and ranked_current_drafts.keep_rank > 1;

update public.users
set school_id = 'POSCO'
where school_id <> 'POSCO'
  and public.is_posco_migration_school_id(school_id);

update public.students
set school_id = 'POSCO'
where school_id <> 'POSCO'
  and public.is_posco_migration_school_id(school_id);

update public.record_drafts
set
  school_id = 'POSCO',
  input_payload = case
    when input_payload ? 'schoolId' then jsonb_set(input_payload, '{schoolId}', to_jsonb('POSCO'::text), false)
    else input_payload
  end
where school_id <> 'POSCO'
  and public.is_posco_migration_school_id(school_id);

update public.school_change_requests
set current_school_id = 'POSCO'
where current_school_id <> 'POSCO'
  and public.is_posco_migration_school_id(current_school_id);

update public.school_change_requests
set
  requested_school_id = 'POSCO',
  requested_school_name = coalesce(nullif(btrim(requested_school_name), ''), '포항제철공업고등학교')
where (
    requested_school_id is not null
    and requested_school_id <> 'POSCO'
    and public.is_posco_migration_school_id(requested_school_id)
  )
  or (
    requested_school_id is null
    and requested_school_name is not null
    and public.is_posco_migration_school_id(requested_school_name)
  );

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute $sql$
      update public.profiles
      set school_id = 'POSCO'
      where school_id <> 'POSCO'
        and public.is_posco_migration_school_id(school_id)
    $sql$;
  end if;

  if to_regclass('public.knowledge_files') is not null then
    execute $sql$
      update public.knowledge_files
      set school_id = 'POSCO'
      where school_id <> 'POSCO'
        and public.is_posco_migration_school_id(school_id)
    $sql$;
  end if;

  if to_regclass('public.rag_generation_logs') is not null then
    execute $sql$
      update public.rag_generation_logs
      set school_id = 'POSCO'
      where school_id <> 'POSCO'
        and public.is_posco_migration_school_id(school_id)
    $sql$;
  end if;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_school_id text := 'POSCO';
  new_name text := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), '교사');
begin
  insert into public.schools (id, name)
  values (new_school_id, '포항제철공업고등학교')
  on conflict (id) do update
  set name = excluded.name;

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

drop function if exists public.is_posco_migration_school_id(text);
drop function if exists public.normalize_school_id_for_posco(text);

-- 실행 후 점검 SQL:
-- select 'users' as table_name, school_id, count(*) from public.users group by school_id order by school_id;
-- select 'students' as table_name, school_id, count(*) from public.students group by school_id order by school_id;
-- select 'curriculum_subjects' as table_name, school_id, count(*) from public.curriculum_subjects group by school_id order by school_id;
-- select 'curriculum_standards' as table_name, school_id, count(*) from public.curriculum_standards group by school_id order by school_id;
-- select 'departments' as table_name, school_id, count(*) from public.departments group by school_id order by school_id;
-- select 'subjects' as table_name, school_id, count(*) from public.subjects group by school_id order by school_id;
-- select 'checklist_categories' as table_name, school_id, count(*) from public.checklist_categories group by school_id order by school_id;
-- select 'checklist_items' as table_name, school_id, count(*) from public.checklist_items group by school_id order by school_id;
-- select 'record_drafts' as table_name, school_id, is_current, count(*) from public.record_drafts group by school_id, is_current order by school_id, is_current;
-- select 'school_change_requests.current' as table_name, current_school_id, count(*) from public.school_change_requests group by current_school_id order by current_school_id;
-- select 'school_change_requests.requested' as table_name, requested_school_id, count(*) from public.school_change_requests group by requested_school_id order by requested_school_id;
-- select id, name from public.schools where id = 'POSCO';
