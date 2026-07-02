alter table public.curriculum_standards
  add column if not exists learning_module text;

alter table public.curriculum_standards
  drop constraint if exists curriculum_standards_exact_unique;

create unique index if not exists curriculum_standards_exact_unique_with_module_idx
  on public.curriculum_standards (
    school_id,
    subject_name,
    (coalesce(learning_module, '')),
    unit_name,
    achievement_standard
  );

create index if not exists curriculum_standards_school_subject_module_idx
  on public.curriculum_standards (school_id, subject_name, learning_module, unit_name, status);
