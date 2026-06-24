create extension if not exists pgcrypto;

alter table public.students
  drop constraint if exists students_department_check;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references public.schools(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departments_code_not_blank check (length(trim(code)) > 0),
  constraint departments_label_not_blank check (length(trim(label)) > 0),
  constraint departments_school_code_unique unique (school_id, code)
);

create index if not exists departments_school_sort_idx
  on public.departments (school_id, sort_order, label);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references public.schools(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subjects_name_not_blank check (length(trim(name)) > 0),
  constraint subjects_school_name_unique unique (school_id, name)
);

create index if not exists subjects_school_sort_idx
  on public.subjects (school_id, sort_order, name);

create table if not exists public.checklist_categories (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references public.schools(id) on delete cascade,
  mode text not null check (mode in ('subject', 'behavior')),
  key text not null,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checklist_categories_key_not_blank check (length(trim(key)) > 0),
  constraint checklist_categories_label_not_blank check (length(trim(label)) > 0),
  constraint checklist_categories_school_key_unique unique (school_id, key)
);

create index if not exists checklist_categories_school_sort_idx
  on public.checklist_categories (school_id, mode, sort_order, label);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references public.schools(id) on delete cascade,
  category_id uuid not null references public.checklist_categories(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checklist_items_label_not_blank check (length(trim(label)) > 0),
  constraint checklist_items_school_category_label_unique unique (school_id, category_id, label)
);

create index if not exists checklist_items_category_sort_idx
  on public.checklist_items (category_id, sort_order, label);

drop trigger if exists departments_set_updated_at on public.departments;
create trigger departments_set_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

drop trigger if exists subjects_set_updated_at on public.subjects;
create trigger subjects_set_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

drop trigger if exists checklist_categories_set_updated_at on public.checklist_categories;
create trigger checklist_categories_set_updated_at
before update on public.checklist_categories
for each row execute function public.set_updated_at();

drop trigger if exists checklist_items_set_updated_at on public.checklist_items;
create trigger checklist_items_set_updated_at
before update on public.checklist_items
for each row execute function public.set_updated_at();

alter table public.departments enable row level security;
alter table public.subjects enable row level security;
alter table public.checklist_categories enable row level security;
alter table public.checklist_items enable row level security;

drop policy if exists "departments are readable by same school" on public.departments;
create policy "departments are readable by same school"
on public.departments
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.departments.school_id
  )
);

drop policy if exists "departments are writable by same school admins" on public.departments;
create policy "departments are writable by same school admins"
on public.departments
for all
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.departments.school_id
      and public.users.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.departments.school_id
      and public.users.role = 'admin'
  )
);

drop policy if exists "subjects are readable by same school" on public.subjects;
create policy "subjects are readable by same school"
on public.subjects
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.subjects.school_id
  )
);

drop policy if exists "subjects are writable by same school admins" on public.subjects;
create policy "subjects are writable by same school admins"
on public.subjects
for all
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.subjects.school_id
      and public.users.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.subjects.school_id
      and public.users.role = 'admin'
  )
);

drop policy if exists "checklist categories are readable by same school" on public.checklist_categories;
create policy "checklist categories are readable by same school"
on public.checklist_categories
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.checklist_categories.school_id
  )
);

drop policy if exists "checklist categories are writable by same school admins" on public.checklist_categories;
create policy "checklist categories are writable by same school admins"
on public.checklist_categories
for all
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.checklist_categories.school_id
      and public.users.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.checklist_categories.school_id
      and public.users.role = 'admin'
  )
);

drop policy if exists "checklist items are readable by same school" on public.checklist_items;
create policy "checklist items are readable by same school"
on public.checklist_items
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.checklist_items.school_id
  )
);

drop policy if exists "checklist items are writable by same school admins" on public.checklist_items;
create policy "checklist items are writable by same school admins"
on public.checklist_items
for all
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.checklist_items.school_id
      and public.users.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.school_id = public.checklist_items.school_id
      and public.users.role = 'admin'
  )
  and exists (
    select 1
    from public.checklist_categories
    where public.checklist_categories.id = public.checklist_items.category_id
      and public.checklist_categories.school_id = public.checklist_items.school_id
  )
);

insert into public.departments (school_id, code, label, sort_order)
select schools.id, defaults.code, defaults.label, defaults.sort_order
from public.schools
cross join (
  values
    ('materials', '재료기술과', 10),
    ('automation_machine', '자동화기계과', 20),
    ('electrical_electronic_control', '전기전자제어과', 30)
) as defaults(code, label, sort_order)
on conflict (school_id, code) do nothing;

insert into public.subjects (school_id, name, sort_order)
select schools.id, defaults.name, defaults.sort_order
from public.schools
cross join (
  values
    ('재료일반', 10),
    ('금속재료', 20),
    ('기계기초공작', 30),
    ('기계제도', 40),
    ('이차전지기초', 50),
    ('자동화설비', 60),
    ('공압유압제어', 70),
    ('PLC제어', 80),
    ('전기회로', 90),
    ('전자회로', 100),
    ('전기전자제어', 110)
) as defaults(name, sort_order)
on conflict (school_id, name) do nothing;

insert into public.checklist_categories (school_id, mode, key, label, sort_order)
select schools.id, defaults.mode, defaults.key, defaults.label, defaults.sort_order
from public.schools
cross join (
  values
    ('subject', 'subject_activity_type', '활동유형', 10),
    ('subject', 'subject_competency', '역량 키워드', 20),
    ('behavior', 'behavior_life_attitude', '생활태도', 110),
    ('behavior', 'behavior_collaboration', '협업', 120),
    ('behavior', 'behavior_leadership', '리더십', 130),
    ('behavior', 'behavior_responsibility', '책임감', 140),
    ('behavior', 'behavior_safety', '안전의식', 150),
    ('behavior', 'behavior_work_ethic', '직업윤리', 160)
) as defaults(mode, key, label, sort_order)
on conflict (school_id, key) do update
set mode = excluded.mode,
    label = excluded.label,
    sort_order = excluded.sort_order,
    updated_at = now();

with default_items(category_key, label, sort_order) as (
  values
    ('subject_activity_type', '실습 참여', 10),
    ('subject_activity_type', '프로젝트 수행', 20),
    ('subject_activity_type', '문제 해결', 30),
    ('subject_activity_type', '장비 조작', 40),
    ('subject_activity_type', '도면 해석', 50),
    ('subject_activity_type', '회로 구성', 60),
    ('subject_activity_type', '안전수칙 준수', 70),
    ('subject_activity_type', '협업', 80),
    ('subject_activity_type', '발표', 90),
    ('subject_activity_type', '보고서 작성', 100),
    ('subject_competency', '직무 이해도', 10),
    ('subject_competency', '실습 집중도', 20),
    ('subject_competency', '정밀성', 30),
    ('subject_competency', '책임감', 40),
    ('subject_competency', '자기주도성', 50),
    ('subject_competency', '의사소통', 60),
    ('subject_competency', '개선 의지', 70),
    ('subject_competency', '창의적 문제 해결', 80),
    ('subject_competency', '품질 관리 의식', 90),
    ('behavior_life_attitude', '기본생활습관', 10),
    ('behavior_life_attitude', '근태', 20),
    ('behavior_life_attitude', '예절', 30),
    ('behavior_life_attitude', '성실성', 40),
    ('behavior_life_attitude', '배려', 50),
    ('behavior_life_attitude', '자기관리', 60),
    ('behavior_life_attitude', '의사소통', 70),
    ('behavior_life_attitude', '갈등 조정', 80),
    ('behavior_life_attitude', '봉사활동', 90),
    ('behavior_life_attitude', '진로 태도', 100),
    ('behavior_life_attitude', '학교 행사 참여', 110),
    ('behavior_collaboration', '협동심', 10),
    ('behavior_collaboration', '협업 태도', 20),
    ('behavior_leadership', '리더십', 10),
    ('behavior_leadership', '학급 역할 수행', 20),
    ('behavior_responsibility', '책임감', 10),
    ('behavior_responsibility', '작업 책임감', 20),
    ('behavior_safety', '안전수칙 준수', 10),
    ('behavior_safety', '실습실 정리정돈', 20),
    ('behavior_safety', '장비 관리 태도', 30),
    ('behavior_work_ethic', '직업윤리', 10),
    ('behavior_work_ethic', '현장실습 태도', 20),
    ('behavior_work_ethic', '취업 준비 태도', 30)
)
insert into public.checklist_items (school_id, category_id, label, sort_order)
select categories.school_id, categories.id, default_items.label, default_items.sort_order
from public.checklist_categories as categories
join default_items on default_items.category_key = categories.key
on conflict (school_id, category_id, label) do nothing;
