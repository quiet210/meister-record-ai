create extension if not exists pgcrypto;

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  mode text not null check (mode in ('subject', 'behavior')),
  subject_name text,
  model text not null,
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  cached_content_tokens integer not null default 0 check (cached_content_tokens >= 0),
  estimated_cost_usd numeric(18, 8) not null default 0 check (estimated_cost_usd >= 0),
  request_status text not null check (request_status in ('success', 'failed')),
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_logs_school_created_idx
  on public.ai_usage_logs (school_id, created_at desc);

create index if not exists ai_usage_logs_user_created_idx
  on public.ai_usage_logs (user_id, created_at desc);

create index if not exists ai_usage_logs_school_mode_created_idx
  on public.ai_usage_logs (school_id, mode, created_at desc);

create index if not exists ai_usage_logs_school_status_created_idx
  on public.ai_usage_logs (school_id, request_status, created_at desc);

alter table public.ai_usage_logs enable row level security;

drop policy if exists "ai usage logs are readable by owner" on public.ai_usage_logs;
create policy "ai usage logs are readable by owner"
on public.ai_usage_logs
for select
to authenticated
using (
  user_id = auth.uid()
  and school_id = public.current_auth_user_school_id()
);

drop policy if exists "ai usage logs are readable by same school admins" on public.ai_usage_logs;
create policy "ai usage logs are readable by same school admins"
on public.ai_usage_logs
for select
to authenticated
using (
  public.current_auth_user_role() = 'admin'
  and school_id = public.current_auth_user_school_id()
);

revoke insert, update, delete on public.ai_usage_logs from anon, authenticated;
grant select on public.ai_usage_logs to authenticated;
grant all on public.ai_usage_logs to service_role;

comment on table public.ai_usage_logs is
  'Server-written Gemini usage and estimated cost logs. Costs are estimates based on model pricing and usageMetadata, not Google billing invoices.';

comment on column public.ai_usage_logs.estimated_cost_usd is
  'Estimated USD cost calculated from prompt/output token counts and configured model pricing. Actual Google billing may differ.';
