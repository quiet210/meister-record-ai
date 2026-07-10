-- POSCO 전환 전 운영 데이터 정리 migration.
-- 운영 기준 school_id는 abcd123이며, 이번 단계에서는 curriculum_subjects의 abcd1234 운영 과목만 abcd123로 통합한다.
-- demo-school, users, students, record_drafts, curriculum_standards.school_id는 변경하지 않는다.

-- 실행 전 확인 SQL:
-- select 'abcd123 curriculum_subjects' as metric, count(*) from public.curriculum_subjects where school_id = 'abcd123';
-- select 'abcd1234 curriculum_subjects' as metric, count(*) from public.curriculum_subjects where school_id = 'abcd1234';
-- select 'demo-school curriculum_subjects' as metric, count(*) from public.curriculum_subjects where school_id = 'demo-school';
-- select 'abcd123 curriculum_standards' as metric, count(*) from public.curriculum_standards where school_id = 'abcd123';
-- select 'abcd123 students' as metric, count(*) from public.students where school_id = 'abcd123';
-- select school_id, subject_name, subject_type, count(*) from public.curriculum_subjects where school_id in ('abcd123', 'abcd1234', 'demo-school') group by school_id, subject_name, subject_type order by school_id, subject_name;

begin;

do $$
declare
  conflict_names text;
  unexpected_standard_count integer;
begin
  with operational_subjects as (
    select
      school_id,
      subject_type,
      lower(regexp_replace(btrim(subject_name), '\s+', ' ', 'g')) as normalized_subject_name
    from public.curriculum_subjects
    where school_id in ('abcd123', 'abcd1234')
  ),
  subject_type_conflicts as (
    select
      normalized_subject_name,
      array_agg(distinct subject_type order by subject_type) as subject_types
    from operational_subjects
    group by normalized_subject_name
    having count(distinct subject_type) > 1
  )
  select string_agg(normalized_subject_name || ' [' || array_to_string(subject_types, ', ') || ']', '; ')
  into conflict_names
  from subject_type_conflicts;

  if conflict_names is not null then
    raise exception 'curriculum_subjects subject_type conflict between abcd123 and abcd1234: %', conflict_names;
  end if;

  select count(*)
  into unexpected_standard_count
  from public.curriculum_standards
  where school_id = 'abcd1234';

  if unexpected_standard_count > 0 then
    raise exception 'Unexpected curriculum_standards rows remain in abcd1234: %. Review before migrating subjects.', unexpected_standard_count;
  end if;
end;
$$;

create temp table operational_subject_merge_plan on commit drop as
with operational_subjects as (
  select
    id,
    school_id,
    subject_name,
    subject_type,
    description,
    sort_order,
    created_at,
    updated_at,
    lower(regexp_replace(btrim(subject_name), '\s+', ' ', 'g')) as normalized_subject_name
  from public.curriculum_subjects
  where school_id in ('abcd123', 'abcd1234')
),
ranked as (
  select
    *,
    first_value(id) over (
      partition by normalized_subject_name, subject_type
      order by
        case when school_id = 'abcd123' then 0 else 1 end,
        updated_at desc,
        created_at asc,
        id asc
    ) as keeper_id
  from operational_subjects
)
select
  id as duplicate_id,
  keeper_id
from ranked
where id <> keeper_id;

with duplicate_rollup as (
  select
    merge_plan.keeper_id,
    (array_agg(nullif(btrim(duplicate_subjects.description), '') order by duplicate_subjects.updated_at desc, duplicate_subjects.created_at desc)
      filter (where nullif(btrim(duplicate_subjects.description), '') is not null))[1] as best_description,
    min(nullif(duplicate_subjects.sort_order, 0)) filter (where duplicate_subjects.sort_order > 0) as best_sort_order,
    max(duplicate_subjects.updated_at) as latest_duplicate_updated_at
  from operational_subject_merge_plan as merge_plan
  join public.curriculum_subjects as duplicate_subjects
    on duplicate_subjects.id = merge_plan.duplicate_id
  group by merge_plan.keeper_id
)
update public.curriculum_subjects as keeper_subjects
set
  description = case
    when nullif(btrim(keeper_subjects.description), '') is null
      and duplicate_rollup.best_description is not null
      then duplicate_rollup.best_description
    else keeper_subjects.description
  end,
  sort_order = case
    when (keeper_subjects.sort_order = 0 or keeper_subjects.sort_order >= 1000)
      and duplicate_rollup.best_sort_order is not null
      then duplicate_rollup.best_sort_order
    else keeper_subjects.sort_order
  end,
  updated_at = greatest(keeper_subjects.updated_at, duplicate_rollup.latest_duplicate_updated_at)
from duplicate_rollup
where keeper_subjects.id = duplicate_rollup.keeper_id;

update public.curriculum_standards as standards
set
  subject_id = keeper_subjects.id,
  subject_name = keeper_subjects.subject_name,
  subject_type = keeper_subjects.subject_type
from operational_subject_merge_plan as merge_plan
join public.curriculum_subjects as keeper_subjects
  on keeper_subjects.id = merge_plan.keeper_id
where standards.subject_id = merge_plan.duplicate_id;

delete from public.curriculum_subjects as duplicate_subjects
using operational_subject_merge_plan as merge_plan
where duplicate_subjects.id = merge_plan.duplicate_id;

update public.curriculum_subjects
set school_id = 'abcd123'
where school_id = 'abcd1234';

commit;

-- 실행 후 확인 SQL:
-- select 'abcd123 curriculum_subjects' as metric, count(*) from public.curriculum_subjects where school_id = 'abcd123';
-- select 'abcd1234 curriculum_subjects' as metric, count(*) from public.curriculum_subjects where school_id = 'abcd1234';
-- select 'demo-school curriculum_subjects' as metric, count(*) from public.curriculum_subjects where school_id = 'demo-school';
-- select 'abcd123 curriculum_standards' as metric, count(*) from public.curriculum_standards where school_id = 'abcd123';
-- select 'abcd123 students' as metric, count(*) from public.students where school_id = 'abcd123';
-- select school_id, subject_name, subject_type, count(*) from public.curriculum_subjects where school_id in ('abcd123', 'abcd1234', 'demo-school') group by school_id, subject_name, subject_type order by school_id, subject_name;
