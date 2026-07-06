alter table public.record_drafts
add column if not exists is_current boolean not null default true,
add column if not exists version_no integer not null default 1,
add column if not exists academic_year text,
add column if not exists semester text,
add column if not exists subject_name text,
add column if not exists parent_draft_id uuid references public.record_drafts(id) on delete set null;

alter table public.record_drafts
drop constraint if exists record_drafts_version_no_positive;

alter table public.record_drafts
add constraint record_drafts_version_no_positive
check (version_no >= 1);

with scoped as (
  select
    id,
    case
      when mode = 'subject' then nullif(btrim(coalesce(input_payload ->> 'subjectName', input_payload ->> 'subject_name', subject_name, '')), '')
      else null
    end as backfilled_subject_name,
    nullif(btrim(coalesce(input_payload ->> 'academicYear', input_payload ->> 'academic_year', academic_year, '')), '') as backfilled_academic_year,
    nullif(btrim(coalesce(input_payload ->> 'semester', semester, '')), '') as backfilled_semester
  from public.record_drafts
),
ranked as (
  select
    record_drafts.id,
    scoped.backfilled_subject_name,
    scoped.backfilled_academic_year,
    scoped.backfilled_semester,
    row_number() over (
      partition by
        record_drafts.user_id,
        record_drafts.school_id,
        coalesce(record_drafts.student_id, '00000000-0000-0000-0000-000000000000'::uuid),
        record_drafts.mode,
        coalesce(scoped.backfilled_subject_name, ''),
        coalesce(scoped.backfilled_academic_year, ''),
        coalesce(scoped.backfilled_semester, '')
      order by record_drafts.created_at asc, record_drafts.id asc
    ) as backfilled_version_no,
    row_number() over (
      partition by
        record_drafts.user_id,
        record_drafts.school_id,
        coalesce(record_drafts.student_id, '00000000-0000-0000-0000-000000000000'::uuid),
        record_drafts.mode,
        coalesce(scoped.backfilled_subject_name, ''),
        coalesce(scoped.backfilled_academic_year, ''),
        coalesce(scoped.backfilled_semester, '')
      order by record_drafts.created_at desc, record_drafts.id desc
    ) as current_rank
  from public.record_drafts
  join scoped on scoped.id = record_drafts.id
)
update public.record_drafts
set
  subject_name = ranked.backfilled_subject_name,
  academic_year = ranked.backfilled_academic_year,
  semester = ranked.backfilled_semester,
  version_no = ranked.backfilled_version_no,
  is_current = ranked.current_rank = 1
from ranked
where ranked.id = record_drafts.id;

create index if not exists record_drafts_current_lookup_idx
  on public.record_drafts (
    user_id,
    school_id,
    student_id,
    mode,
    subject_name,
    academic_year,
    semester
  )
  where is_current = true;

create unique index if not exists record_drafts_one_current_per_scope_idx
  on public.record_drafts (
    user_id,
    school_id,
    coalesce(student_id, '00000000-0000-0000-0000-000000000000'::uuid),
    mode,
    coalesce(nullif(btrim(subject_name), ''), ''),
    coalesce(nullif(btrim(academic_year), ''), ''),
    coalesce(nullif(btrim(semester), ''), '')
  )
  where is_current = true;

create index if not exists record_drafts_history_lookup_idx
  on public.record_drafts (
    user_id,
    school_id,
    student_id,
    mode,
    subject_name,
    academic_year,
    semester,
    version_no desc
  );

comment on column public.record_drafts.is_current is
  'Marks the current working draft for the owner/school/student/mode/subject/year/semester scope.';

comment on column public.record_drafts.version_no is
  'Version number within the owner/school/student/mode/subject/year/semester scope. Existing rows are backfilled oldest to newest.';

comment on column public.record_drafts.subject_name is
  'Subject current-record scope. Subject comments use the selected subject name; behavior comments keep this null.';

comment on column public.record_drafts.academic_year is
  'Optional academic-year current-record scope.';

comment on column public.record_drafts.semester is
  'Optional semester current-record scope.';

comment on column public.record_drafts.parent_draft_id is
  'Optional link to a previous draft row if a future history flow creates separate version rows.';
