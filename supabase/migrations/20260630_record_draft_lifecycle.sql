alter table public.record_drafts
add column if not exists ai_content text,
add column if not exists edited_content text,
add column if not exists final_content text,
add column if not exists status text not null default 'ai_generated',
add column if not exists edited_at timestamptz,
add column if not exists finalized_at timestamptz,
add column if not exists edited_by uuid references public.users(id) on delete set null;

alter table public.record_drafts
drop constraint if exists record_drafts_status_check;

alter table public.record_drafts
add constraint record_drafts_status_check
check (status in ('ai_generated', 'editing', 'saved', 'finalized'));

update public.record_drafts
set
  ai_content = coalesce(ai_content, draft_text),
  edited_content = coalesce(edited_content, draft_text),
  status = case
    when final_content is not null and length(trim(final_content)) > 0 then 'finalized'
    when edited_content is not null and length(trim(edited_content)) > 0 then status
    when draft_text is not null and length(trim(draft_text)) > 0 then 'ai_generated'
    else status
  end
where ai_content is null
   or edited_content is null;

create index if not exists record_drafts_lifecycle_status_idx
  on public.record_drafts (school_id, user_id, mode, status, updated_at desc);
