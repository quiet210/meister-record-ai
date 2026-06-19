create table if not exists schools (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references schools(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'teacher',
  created_at timestamptz not null default now()
);

create table if not exists knowledge_files (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references schools(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  original_filename text not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint not null default 0,
  document_type text not null check (document_type in ('learning_goal', 'curriculum', 'ncs_unit', 'rubric')),
  grade text not null,
  department text not null,
  subject_name text not null,
  unit_title text,
  openai_file_id text not null,
  openai_vector_store_id text not null,
  vector_status text not null default 'uploaded',
  created_at timestamptz not null default now()
);

create index if not exists knowledge_files_school_filter_idx
  on knowledge_files (school_id, department, grade, subject_name);

create table if not exists rag_generation_logs (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references schools(id) on delete cascade,
  teacher_id uuid references profiles(id),
  student_id uuid,
  mode text not null check (mode in ('subject', 'behavior')),
  input_payload jsonb not null,
  draft_text text,
  warnings jsonb not null default '[]'::jsonb,
  model text,
  created_at timestamptz not null default now()
);

create table if not exists rag_search_logs (
  id uuid primary key default gen_random_uuid(),
  generation_log_id uuid references rag_generation_logs(id) on delete cascade,
  knowledge_file_id uuid references knowledge_files(id),
  openai_file_id text,
  filename text,
  score numeric,
  content_excerpt text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table knowledge_files enable row level security;
alter table rag_generation_logs enable row level security;
alter table rag_search_logs enable row level security;

create policy "knowledge files are readable by same school"
on knowledge_files
for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.school_id = knowledge_files.school_id
  )
);

create policy "knowledge files are insertable by same school"
on knowledge_files
for insert
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.school_id = knowledge_files.school_id
  )
);

create policy "rag logs are readable by same school"
on rag_generation_logs
for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.school_id = rag_generation_logs.school_id
  )
);

insert into storage.buckets (id, name, public)
values ('knowledge-files', 'knowledge-files', false)
on conflict (id) do nothing;
