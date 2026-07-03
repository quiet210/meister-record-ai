-- 성취기준 업로드 저장 API에서 PostgREST upsert conflict target으로 사용할
-- 컬럼 기반 중복 방지 인덱스입니다. 기존 expression index는 유지합니다.
create unique index if not exists curriculum_standards_exact_unique_columns_idx
  on public.curriculum_standards (
    school_id,
    subject_name,
    learning_module,
    unit_name,
    achievement_standard
  )
  nulls not distinct;

create index if not exists curriculum_subjects_school_normalized_name_idx
  on public.curriculum_subjects (
    school_id,
    lower(regexp_replace(btrim(subject_name), '\s+', ' ', 'g'))
  );
