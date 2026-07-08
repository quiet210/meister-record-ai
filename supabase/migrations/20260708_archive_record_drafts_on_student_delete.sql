alter table public.record_drafts
add column if not exists deleted_student_id uuid,
add column if not exists deleted_student_name text,
add column if not exists deleted_student_grade text,
add column if not exists deleted_student_department text,
add column if not exists deleted_student_class text,
add column if not exists deleted_student_number text,
add column if not exists archived_at timestamptz,
add column if not exists archive_reason text;

comment on column public.record_drafts.deleted_student_id is
  'Original students.id snapshot used when a student row is deleted and the FK later sets student_id to null.';

comment on column public.record_drafts.deleted_student_name is
  'Student name snapshot preserved when the referenced student row is deleted.';

comment on column public.record_drafts.deleted_student_grade is
  'Student grade snapshot preserved when the referenced student row is deleted.';

comment on column public.record_drafts.deleted_student_department is
  'Student department snapshot preserved when the referenced student row is deleted.';

comment on column public.record_drafts.deleted_student_class is
  'Student class_name snapshot preserved when the referenced student row is deleted.';

comment on column public.record_drafts.deleted_student_number is
  'Student number snapshot preserved when the referenced student row is deleted.';

comment on column public.record_drafts.archived_at is
  'Timestamp when a draft was archived out of the current-record set.';

comment on column public.record_drafts.archive_reason is
  'Reason a draft was archived, for example student_deleted.';

create or replace function public.archive_record_drafts_for_deleted_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.record_drafts
  set
    is_current = false,
    deleted_student_id = old.id,
    deleted_student_name = old.name,
    deleted_student_grade = old.grade,
    deleted_student_department = old.department,
    deleted_student_class = old.class_name,
    deleted_student_number = old.number,
    archived_at = coalesce(archived_at, now()),
    archive_reason = coalesce(archive_reason, 'student_deleted')
  where student_id = old.id;

  return old;
end;
$$;

drop trigger if exists students_archive_record_drafts_before_delete on public.students;

create trigger students_archive_record_drafts_before_delete
before delete on public.students
for each row execute function public.archive_record_drafts_for_deleted_student();
