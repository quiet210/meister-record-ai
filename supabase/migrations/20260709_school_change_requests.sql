create extension if not exists pgcrypto;

create table if not exists public.school_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  current_school_id text not null references public.schools(id) on delete restrict,
  requested_school_id text,
  requested_school_name text,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_change_requests_reason_not_blank check (length(trim(reason)) > 0),
  constraint school_change_requests_target_not_blank check (
    length(trim(coalesce(requested_school_id, ''))) > 0
    or length(trim(coalesce(requested_school_name, ''))) > 0
  )
);

create index if not exists school_change_requests_user_created_idx
  on public.school_change_requests (user_id, created_at desc);

create index if not exists school_change_requests_school_status_idx
  on public.school_change_requests (current_school_id, status, created_at desc);

create unique index if not exists school_change_requests_one_pending_per_user_idx
  on public.school_change_requests (user_id)
  where status = 'pending';

drop trigger if exists school_change_requests_set_updated_at on public.school_change_requests;
create trigger school_change_requests_set_updated_at
before update on public.school_change_requests
for each row execute function public.set_updated_at();

alter table public.school_change_requests enable row level security;

drop policy if exists "school change requests are readable by owner" on public.school_change_requests;
create policy "school change requests are readable by owner"
on public.school_change_requests
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "school change requests are readable by same school admins" on public.school_change_requests;
create policy "school change requests are readable by same school admins"
on public.school_change_requests
for select
to authenticated
using (
  public.current_auth_user_role() = 'admin'
  and current_school_id = public.current_auth_user_school_id()
);

drop policy if exists "school change requests are insertable by owner" on public.school_change_requests;
create policy "school change requests are insertable by owner"
on public.school_change_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and current_school_id = public.current_auth_user_school_id()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
);

drop policy if exists "school change requests are deletable by owner while pending" on public.school_change_requests;
create policy "school change requests are deletable by owner while pending"
on public.school_change_requests
for delete
to authenticated
using (
  user_id = auth.uid()
  and status = 'pending'
);

create or replace function public.approve_school_change_request(p_request_id uuid)
returns public.school_change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.users%rowtype;
  request_row public.school_change_requests%rowtype;
  approved_row public.school_change_requests%rowtype;
  target_school_id text;
  target_school_name text;
begin
  select *
  into actor
  from public.users
  where id = auth.uid();

  if actor.id is null or actor.role <> 'admin' then
    raise exception '관리자 권한이 필요합니다.' using errcode = '42501';
  end if;

  select *
  into request_row
  from public.school_change_requests
  where id = p_request_id
  for update;

  if request_row.id is null then
    raise exception '학교 변경 요청을 찾지 못했습니다.' using errcode = 'P0002';
  end if;

  if request_row.current_school_id <> actor.school_id then
    raise exception '같은 학교 사용자의 요청만 승인할 수 있습니다.' using errcode = '42501';
  end if;

  if request_row.status <> 'pending' then
    raise exception '대기 중인 요청만 승인할 수 있습니다.' using errcode = 'P0001';
  end if;

  target_school_id := nullif(trim(coalesce(request_row.requested_school_id, '')), '');
  target_school_name := nullif(trim(coalesce(request_row.requested_school_name, '')), '');

  if target_school_id is null then
    raise exception '승인하려면 변경 희망 학교 ID가 필요합니다.' using errcode = 'P0001';
  end if;

  insert into public.schools (id, name)
  values (target_school_id, coalesce(target_school_name, target_school_id))
  on conflict (id) do update
  set name = coalesce(nullif(trim(excluded.name), ''), public.schools.name);

  update public.users
  set school_id = target_school_id,
      updated_at = now()
  where id = request_row.user_id
    and school_id = request_row.current_school_id;

  if not found then
    raise exception '요청자의 현재 학교가 변경되어 승인할 수 없습니다.' using errcode = 'P0001';
  end if;

  update public.school_change_requests
  set status = 'approved',
      reviewed_by = actor.id,
      reviewed_at = now(),
      updated_at = now()
  where id = p_request_id
  returning * into approved_row;

  return approved_row;
end;
$$;

create or replace function public.reject_school_change_request(p_request_id uuid)
returns public.school_change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.users%rowtype;
  request_row public.school_change_requests%rowtype;
  rejected_row public.school_change_requests%rowtype;
begin
  select *
  into actor
  from public.users
  where id = auth.uid();

  if actor.id is null or actor.role <> 'admin' then
    raise exception '관리자 권한이 필요합니다.' using errcode = '42501';
  end if;

  select *
  into request_row
  from public.school_change_requests
  where id = p_request_id
  for update;

  if request_row.id is null then
    raise exception '학교 변경 요청을 찾지 못했습니다.' using errcode = 'P0002';
  end if;

  if request_row.current_school_id <> actor.school_id then
    raise exception '같은 학교 사용자의 요청만 반려할 수 있습니다.' using errcode = '42501';
  end if;

  if request_row.status <> 'pending' then
    raise exception '대기 중인 요청만 반려할 수 있습니다.' using errcode = 'P0001';
  end if;

  update public.school_change_requests
  set status = 'rejected',
      reviewed_by = actor.id,
      reviewed_at = now(),
      updated_at = now()
  where id = p_request_id
  returning * into rejected_row;

  return rejected_row;
end;
$$;

revoke all on function public.approve_school_change_request(uuid) from public;
revoke all on function public.reject_school_change_request(uuid) from public;
grant execute on function public.approve_school_change_request(uuid) to authenticated;
grant execute on function public.reject_school_change_request(uuid) to authenticated;

comment on table public.school_change_requests is
  'User-submitted school affiliation change requests. users.school_id is changed only after admin approval.';
