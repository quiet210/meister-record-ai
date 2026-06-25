-- 과목 마스터 통합:
-- public.curriculum_subjects를 단일 과목 마스터로 사용하고,
-- public.subjects는 기존 데이터 보존용 deprecated 테이블로 유지한다.

comment on table public.subjects is
  'Deprecated. Use public.curriculum_subjects as the subject master. Retained for legacy data compatibility.';

comment on table public.curriculum_subjects is
  'Single subject master for subject selection, achievement standard upload matching, and curriculum standard search.';

insert into public.curriculum_subjects (
  school_id,
  subject_name,
  subject_type,
  description,
  sort_order
)
select
  migrated.school_id,
  migrated.subject_name,
  'general',
  '',
  migrated.sort_order
from (
  select
    school_id,
    trim(name) as subject_name,
    min(sort_order) as sort_order
  from public.subjects
  where length(trim(name)) > 0
  group by school_id, trim(name)
) as migrated
on conflict (school_id, subject_name) do nothing;
