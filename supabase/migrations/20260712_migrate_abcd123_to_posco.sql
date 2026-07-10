-- POSCO 전환 2단계 migration.
-- 20260711_unify_operational_subjects_to_abcd123.sql 적용 후 실행한다.
-- 운영 데이터 기준 school_id인 abcd123만 POSCO로 전환한다.
-- demo-school, abcd1234, 포철공고 등 다른 legacy/test school_id는 변경하지 않는다.

-- 실행 전 확인 SQL:
-- select 'schools' as table_name, id as school_id, count(*) from public.schools where id in ('POSCO', 'abcd123', 'abcd1234', 'demo-school', '포철공고') group by id order by id;
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

begin;

insert into public.schools (id, name)
values ('POSCO', '포항제철공업고등학교')
on conflict (id) do update
set name = excluded.name;

do $$
declare
  conflict_count integer;
  conflict_sample text;
begin
  select count(*), left(string_agg(source_departments.code, ', ' order by source_departments.code), 1000)
  into conflict_count, conflict_sample
  from public.departments as source_departments
  join public.departments as target_departments
    on target_departments.school_id = 'POSCO'
   and target_departments.code = source_departments.code
  where source_departments.school_id = 'abcd123';

  if conflict_count > 0 then
    raise exception 'departments POSCO conflict for abcd123 migration: % duplicate code(s): %', conflict_count, conflict_sample;
  end if;

  select count(*), left(string_agg(source_subjects.name, ', ' order by source_subjects.name), 1000)
  into conflict_count, conflict_sample
  from public.subjects as source_subjects
  join public.subjects as target_subjects
    on target_subjects.school_id = 'POSCO'
   and target_subjects.name = source_subjects.name
  where source_subjects.school_id = 'abcd123';

  if conflict_count > 0 then
    raise exception 'subjects POSCO conflict for abcd123 migration: % duplicate name(s): %', conflict_count, conflict_sample;
  end if;

  select count(*), left(string_agg(source_curriculum_subjects.subject_name, ', ' order by source_curriculum_subjects.subject_name), 1000)
  into conflict_count, conflict_sample
  from public.curriculum_subjects as source_curriculum_subjects
  join public.curriculum_subjects as target_curriculum_subjects
    on target_curriculum_subjects.school_id = 'POSCO'
   and lower(regexp_replace(btrim(target_curriculum_subjects.subject_name), '\s+', ' ', 'g')) =
       lower(regexp_replace(btrim(source_curriculum_subjects.subject_name), '\s+', ' ', 'g'))
  where source_curriculum_subjects.school_id = 'abcd123';

  if conflict_count > 0 then
    raise exception 'curriculum_subjects POSCO normalized conflict for abcd123 migration: % duplicate subject(s): %', conflict_count, conflict_sample;
  end if;

  select count(*), left(string_agg(source_curriculum_subjects.subject_name, ', ' order by source_curriculum_subjects.subject_name), 1000)
  into conflict_count, conflict_sample
  from public.curriculum_subjects as source_curriculum_subjects
  join public.curriculum_subjects as target_curriculum_subjects
    on target_curriculum_subjects.school_id = 'POSCO'
   and lower(regexp_replace(btrim(target_curriculum_subjects.subject_name), '\s+', ' ', 'g')) =
       lower(regexp_replace(btrim(source_curriculum_subjects.subject_name), '\s+', ' ', 'g'))
   and target_curriculum_subjects.subject_type <> source_curriculum_subjects.subject_type
  where source_curriculum_subjects.school_id = 'abcd123';

  if conflict_count > 0 then
    raise exception 'curriculum_subjects subject_type conflict for abcd123 -> POSCO migration: % subject(s): %', conflict_count, conflict_sample;
  end if;

  select count(*), left(string_agg(source_standards.subject_name || ' / ' || source_standards.unit_name, ', ' order by source_standards.subject_name), 1000)
  into conflict_count, conflict_sample
  from public.curriculum_standards as source_standards
  join public.curriculum_standards as target_standards
    on target_standards.school_id = 'POSCO'
   and target_standards.subject_name = source_standards.subject_name
   and coalesce(target_standards.learning_module, '') = coalesce(source_standards.learning_module, '')
   and target_standards.unit_name = source_standards.unit_name
   and target_standards.achievement_standard = source_standards.achievement_standard
  where source_standards.school_id = 'abcd123';

  if conflict_count > 0 then
    raise exception 'curriculum_standards POSCO conflict for abcd123 migration: % duplicate standard(s): %', conflict_count, conflict_sample;
  end if;

  select count(*), left(string_agg(source_categories.key, ', ' order by source_categories.key), 1000)
  into conflict_count, conflict_sample
  from public.checklist_categories as source_categories
  join public.checklist_categories as target_categories
    on target_categories.school_id = 'POSCO'
   and target_categories.key = source_categories.key
  where source_categories.school_id = 'abcd123';

  if conflict_count > 0 then
    raise exception 'checklist_categories POSCO conflict for abcd123 migration: % duplicate key(s): %', conflict_count, conflict_sample;
  end if;

  select count(*), left(string_agg(source_drafts.id::text, ', ' order by source_drafts.updated_at desc nulls last), 1000)
  into conflict_count, conflict_sample
  from public.record_drafts as source_drafts
  join public.record_drafts as target_drafts
    on target_drafts.school_id = 'POSCO'
   and target_drafts.user_id = source_drafts.user_id
   and coalesce(target_drafts.student_id, '00000000-0000-0000-0000-000000000000'::uuid) =
       coalesce(source_drafts.student_id, '00000000-0000-0000-0000-000000000000'::uuid)
   and target_drafts.mode = source_drafts.mode
   and coalesce(nullif(btrim(target_drafts.subject_name), ''), '') = coalesce(nullif(btrim(source_drafts.subject_name), ''), '')
   and coalesce(nullif(btrim(target_drafts.academic_year), ''), '') = coalesce(nullif(btrim(source_drafts.academic_year), ''), '')
   and coalesce(nullif(btrim(target_drafts.semester), ''), '') = coalesce(nullif(btrim(source_drafts.semester), ''), '')
   and target_drafts.is_current = true
  where source_drafts.school_id = 'abcd123'
    and source_drafts.is_current = true;

  if conflict_count > 0 then
    raise exception 'record_drafts current unique conflict for abcd123 -> POSCO migration: % duplicate current scope(s): %', conflict_count, conflict_sample;
  end if;
end;
$$;

update public.departments
set school_id = 'POSCO'
where school_id = 'abcd123';

update public.subjects
set school_id = 'POSCO'
where school_id = 'abcd123';

update public.curriculum_subjects
set school_id = 'POSCO'
where school_id = 'abcd123';

update public.curriculum_standards as standards
set
  subject_id = subjects.id,
  subject_type = subjects.subject_type
from public.curriculum_subjects as subjects
where standards.school_id = 'abcd123'
  and subjects.school_id = 'POSCO'
  and lower(regexp_replace(btrim(subjects.subject_name), '\s+', ' ', 'g')) =
      lower(regexp_replace(btrim(standards.subject_name), '\s+', ' ', 'g'))
  and subjects.subject_type = standards.subject_type;

update public.curriculum_standards
set school_id = 'POSCO'
where school_id = 'abcd123';

update public.checklist_categories
set school_id = 'POSCO'
where school_id = 'abcd123';

update public.checklist_items
set school_id = 'POSCO'
where school_id = 'abcd123';

update public.users
set school_id = 'POSCO'
where school_id = 'abcd123';

update public.students
set school_id = 'POSCO'
where school_id = 'abcd123';

update public.record_drafts
set
  school_id = 'POSCO',
  input_payload = case
    when input_payload ? 'schoolId' then jsonb_set(input_payload, '{schoolId}', to_jsonb('POSCO'::text), false)
    else input_payload
  end
where school_id = 'abcd123';

update public.school_change_requests
set current_school_id = 'POSCO'
where current_school_id = 'abcd123';

update public.school_change_requests
set
  requested_school_id = 'POSCO',
  requested_school_name = coalesce(nullif(btrim(requested_school_name), ''), '포항제철공업고등학교')
where requested_school_id = 'abcd123';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'school_id'
  ) then
    execute $sql$
      update public.profiles
      set school_id = 'POSCO'
      where school_id = 'abcd123'
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'knowledge_files'
      and column_name = 'school_id'
  ) then
    execute $sql$
      update public.knowledge_files
      set school_id = 'POSCO'
      where school_id = 'abcd123'
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rag_generation_logs'
      and column_name = 'school_id'
  ) then
    execute $sql$
      update public.rag_generation_logs
      set school_id = 'POSCO'
      where school_id = 'abcd123'
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

commit;

-- 실행 후 확인 SQL:
-- select 'schools' as table_name, id as school_id, count(*) from public.schools where id in ('POSCO', 'abcd123', 'abcd1234', 'demo-school', '포철공고') group by id order by id;
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
